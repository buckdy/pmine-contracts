const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("PolkamineRewardDistributor", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
    pBTCMPool,
    pETHMPool,
    polkamineAddressManager,
    polkaminePoolManager,
    polkamineRewardDistributor,
    polkamineRewardOracle,
    pidPBTCM,
    pidPETHM;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;

  beforeEach(async () => {
    [deployer, alice, bob, manager, rewardDepositor, rewardStatsSubmitter] = await ethers.getSigners();

    // Deploy PToken
    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
    pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);

    // Deploy WToken
    const WToken = await ethers.getContractFactory("WToken");
    wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
    wETHO = await upgrades.deployProxy(WToken, ["wETHO", "wETHO"]);

    // Deploy PolkamineAddressManager
    const PolkamineAddressManager = await ethers.getContractFactory("PolkamineAddressManager");
    polkamineAddressManager = await upgrades.deployProxy(PolkamineAddressManager, [manager.address]);

    // Deploy PolkaminePoolManager
    const PolkaminePoolManager = await ethers.getContractFactory("PolkaminePoolManager");
    polkaminePoolManager = await upgrades.deployProxy(PolkaminePoolManager, [polkamineAddressManager.address]);

    // Deploy PolkaminePool and add them to PolkaminePoolManager.
    const PolkaminePool = await ethers.getContractFactory("PolkaminePool");
    pBTCMPool = await upgrades.deployProxy(PolkaminePool, [pBTCM.address, wBTCO.address]);
    pETHMPool = await upgrades.deployProxy(PolkaminePool, [pETHM.address, wETHO.address]);

    await polkaminePoolManager.connect(manager).addPool(pBTCMPool.address);
    pidPBTCM = 0;

    await polkaminePoolManager.connect(manager).addPool(pETHMPool.address);
    pidPETHM = 1;

    // Deploy PolkamineRewardDistributor ans set the address to PolkamineAddressManager
    const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
    polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
      polkamineAddressManager.address,
    ]);

    await polkamineAddressManager.setRewardDistributorContract(polkamineRewardDistributor.address);

    // Deploy PolkamineRewardOracle ans set the address to PolkamineAddressManager
    const PolkamineRewardOracle = await ethers.getContractFactory("PolkamineRewardOracle");
    polkamineRewardOracle = await upgrades.deployProxy(PolkamineRewardOracle, [polkamineAddressManager.address]);

    await polkamineAddressManager.setRewardOracleContract(polkamineRewardOracle.address);

    // Set PoolManager, RewardDepositor and RewardStatsSubmitter
    await polkamineAddressManager.setPoolManagerContract(polkaminePoolManager.address);
    await polkamineAddressManager.setRewardDepositor(rewardDepositor.address);
    await polkamineAddressManager.setRewardStatsSubmitter(rewardStatsSubmitter.address);

    // Mint pToken and wToken
    await pBTCM.grantRole(MINTER_ROLE, deployer.address);
    await pETHM.grantRole(MINTER_ROLE, deployer.address);

    await pBTCM.mint(alice.address, MINT_AMOUNT);
    await pBTCM.mint(bob.address, MINT_AMOUNT);
    await pETHM.mint(alice.address, MINT_AMOUNT);
    await pETHM.mint(bob.address, MINT_AMOUNT);

    await wBTCO.grantRole(MINTER_ROLE, deployer.address);
    await wETHO.grantRole(MINTER_ROLE, deployer.address);

    await wBTCO.mint(rewardDepositor.address, MINT_AMOUNT);
    await wETHO.mint(rewardDepositor.address, MINT_AMOUNT);
  });

  describe("Deposit", async () => {
    it("Should not deposit reward token by non rewardDepositor", async () => {
      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, MINT_AMOUNT);
      await expect(polkamineRewardDistributor.deposit(wBTCO.address, MINT_AMOUNT)).to.be.revertedWith(
        "Not reward depositor",
      );
    });

    it("Should deposit reward token", async () => {
      expect(await wBTCO.balanceOf(rewardDepositor.address)).to.equal(MINT_AMOUNT);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(0);
      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, MINT_AMOUNT);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, MINT_AMOUNT);
      expect(await wBTCO.balanceOf(rewardDepositor.address)).to.equal(0);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(MINT_AMOUNT);
    });
  });

  describe("Claim", async () => {
    it("Should claim reward token by staker", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 30,
        wETHOTotalRewardFirst = 60;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // set reward stats
      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPBTCM, [alice.address, bob.address], [20, 10]);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, alice.address)).to.equal(20);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, bob.address)).to.equal(10);
      expect(await polkamineRewardOracle.poolReward(pidPBTCM)).to.equal(30);

      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPETHM, [alice.address, bob.address], [25, 35]);
      expect(await polkamineRewardOracle.userReward(pidPETHM, alice.address)).to.equal(25);
      expect(await polkamineRewardOracle.userReward(pidPETHM, bob.address)).to.equal(35);
      expect(await polkamineRewardOracle.poolReward(pidPETHM)).to.equal(60);

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(0);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(0);
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, 10);
      await polkamineRewardDistributor.connect(bob).claim(pidPBTCM, 10);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(10);

      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPBTCM)).to.equal(10);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPBTCM)).to.equal(0);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPBTCM)).to.equal(10);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(0);
      expect(await wETHO.balanceOf(bob.address)).to.equal(0);
      await polkamineRewardDistributor.connect(alice).claim(pidPETHM, 20);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, 20);
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      expect(await wETHO.balanceOf(polkamineRewardDistributor.address)).to.equal(20);

      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPETHM)).to.equal(5);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPETHM)).to.equal(15);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPETHM)).to.equal(20);

      // deposit second rewards
      let wBTCOTotalRewardSecond = 25,
        wETHOTotalRewardSecond = 10;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);

      // set reward stats
      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPBTCM, [alice.address, bob.address], [10, 15]);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, alice.address)).to.equal(30);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, bob.address)).to.equal(25);
      expect(await polkamineRewardOracle.poolReward(pidPBTCM)).to.equal(55);

      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPETHM, [alice.address, bob.address], [3, 7]);
      expect(await polkamineRewardOracle.userReward(pidPETHM, alice.address)).to.equal(28);
      expect(await polkamineRewardOracle.userReward(pidPETHM, bob.address)).to.equal(42);
      expect(await polkamineRewardOracle.poolReward(pidPETHM)).to.equal(70);

      // check claimable reward after deposit
      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPBTCM)).to.equal(20);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPBTCM)).to.equal(15);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPBTCM)).to.equal(35);

      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPETHM)).to.equal(8);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPETHM)).to.equal(22);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPETHM)).to.equal(30);

      // deposit third rewards
      let wBTCOTotalRewardThird = 25,
        wETHOTotalRewardThird = 10;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardThird);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardThird);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardThird);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardThird);

      // set reward stats
      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPBTCM, [alice.address, bob.address], [10, 15]);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, alice.address)).to.equal(40);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, bob.address)).to.equal(40);
      expect(await polkamineRewardOracle.poolReward(pidPBTCM)).to.equal(80);

      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPETHM, [alice.address, bob.address], [2, 8]);
      expect(await polkamineRewardOracle.userReward(pidPETHM, alice.address)).to.equal(30);
      expect(await polkamineRewardOracle.userReward(pidPETHM, bob.address)).to.equal(50);
      expect(await polkamineRewardOracle.poolReward(pidPETHM)).to.equal(80);

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, 30);
      await polkamineRewardDistributor.connect(bob).claim(pidPBTCM, 20);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(40);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(30);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(10);

      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPBTCM)).to.equal(0);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPBTCM)).to.equal(10);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPBTCM)).to.equal(10);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      await polkamineRewardDistributor.connect(alice).claim(pidPETHM, 10);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, 20);
      expect(await wETHO.balanceOf(alice.address)).to.equal(30);
      expect(await wETHO.balanceOf(bob.address)).to.equal(40);
      expect(await wETHO.balanceOf(polkamineRewardDistributor.address)).to.equal(10);

      expect(await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPETHM)).to.equal(0);
      expect(await polkamineRewardDistributor.connect(bob).userClaimableReward(pidPETHM)).to.equal(10);
      expect(await polkamineRewardDistributor.poolClaimableReward(pidPETHM)).to.equal(10);
    });

    it("Should not claim reward token with the exceeded amount", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 30,
        wETHOTotalRewardFirst = 60;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);

      // set reward stats
      await polkamineRewardOracle
        .connect(rewardStatsSubmitter)
        .setRewardStats(pidPBTCM, [alice.address, bob.address], [20, 10]);

      // claim wBTCO
      let claimAmount = await polkamineRewardDistributor.connect(alice).userClaimableReward(pidPBTCM);
      claimAmount++;
      await expect(polkamineRewardDistributor.connect(alice).claim(pidPETHM, claimAmount)).to.be.revertedWith(
        "Exceeds claim amount",
      );
    });
  });
});
