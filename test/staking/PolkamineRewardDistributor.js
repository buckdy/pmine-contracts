const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime, ZERO } = require("../utils");

const getSignature = async (signer, beneficiary, pid, rewardToken, rewardAmount, claimIndex) => {
  let message = ethers.utils.solidityKeccak256(
    ["address", "uint256", "address", "uint256", "uint256"],
    [beneficiary, pid, rewardToken, rewardAmount, claimIndex],
  );
  let signature = await signer.signMessage(ethers.utils.arrayify(message));
  return signature;
};

describe("PolkamineRewardDistributor", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
    pBTCMPool,
    pETHMPool,
    polkamineAdmin,
    polkaminePoolManager,
    polkamineRewardDistributor,
    // polkamineRewardOracle,
    pidPBTCM,
    pidPETHM,
    claimInterval;

  let signatureAliceBTC, signatureBobBTC, signatureAliceETH, signatureBobETH;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;

  beforeEach(async () => {
    [deployer, alice, bob, manager, rewardDepositor, maintainer] = await ethers.getSigners();

    // Deploy PToken
    const PToken = await ethers.getContractFactory("PToken");
    pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
    pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);

    // Deploy WToken
    const WToken = await ethers.getContractFactory("WToken");
    wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
    wETHO = await upgrades.deployProxy(WToken, ["wETHO", "wETHO"]);

    // Deploy PolkamineAdmin
    const PolkamineAdmin = await ethers.getContractFactory("PolkamineAdmin");
    polkamineAdmin = await upgrades.deployProxy(PolkamineAdmin, [manager.address]);

    // Deploy PolkaminePoolManager
    const PolkaminePoolManager = await ethers.getContractFactory("PolkaminePoolManager");
    polkaminePoolManager = await upgrades.deployProxy(PolkaminePoolManager, [polkamineAdmin.address]);

    // Deploy PolkaminePools and add them to PolkaminePoolManager.
    const PolkaminePool = await ethers.getContractFactory("PolkaminePool");
    pBTCMPool = await upgrades.deployProxy(PolkaminePool, [pBTCM.address, wBTCO.address]);
    pETHMPool = await upgrades.deployProxy(PolkaminePool, [pETHM.address, wETHO.address]);

    await polkaminePoolManager.connect(manager).addPool(pBTCMPool.address);
    pidPBTCM = 0;

    await polkaminePoolManager.connect(manager).addPool(pETHMPool.address);
    pidPETHM = 1;

    // initialize claimIndex and claimInterval
    claimIndex = 0;
    claimInterval = 43200;

    // Deploy PolkamineRewardDistributor ans set the address to PolkamineAdmin
    const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
    polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
      polkamineAdmin.address,
      claimInterval,
    ]);

    await polkamineAdmin.setRewardDistributorContract(polkamineRewardDistributor.address);

    // Set PoolManager, RewardDepositor and Maintainer
    await polkamineAdmin.setPoolManagerContract(polkaminePoolManager.address);
    await polkamineAdmin.setRewardDepositor(rewardDepositor.address);
    await polkamineAdmin.setMaintainer(maintainer.address);

    // set claimIndex and claimInterval
    await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
    await polkamineRewardDistributor.connect(manager).setClaimInterval(claimInterval);

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

  describe("Claim Interval", async () => {
    it("Should not set claim interval by non mamanger", async () => {
      let newClaimInterval = 86400;
      await expect(polkamineRewardDistributor.setClaimInterval(newClaimInterval)).to.be.revertedWith(
        "Not polkamine manager",
      );
    });

    it("Should set claim interval by mamanger", async () => {
      expect(await polkamineRewardDistributor.claimInterval()).to.equal(claimInterval);

      let newClaimInterval = 86400;
      await polkamineRewardDistributor.connect(manager).setClaimInterval(newClaimInterval);
      expect(await polkamineRewardDistributor.claimInterval()).to.equal(newClaimInterval);
    });

    it("Should not set claim index by non maintainer", async () => {
      let newClaimindex = claimIndex + 1;
      await expect(polkamineRewardDistributor.setClaimIndex(newClaimindex)).to.be.revertedWith("Not maintainer");
    });
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
    it("Should claim rewards by staker", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 30,
        wETHOTotalRewardFirst = 60;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 10, claimIndex);
      signatureBobBTC = await getSignature(maintainer, bob.address, pidPBTCM, wBTCO.address, 10, claimIndex);
      signatureAliceETH = await getSignature(maintainer, alice.address, pidPETHM, wETHO.address, 20, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 20, claimIndex);

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(0);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(0);
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 10, claimIndex, signatureAliceBTC);
      await polkamineRewardDistributor.connect(bob).claim(pidPBTCM, wBTCO.address, 10, claimIndex, signatureBobBTC);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(10);

      expect(await polkamineRewardDistributor.userClaimedReward(pidPBTCM, alice.address)).to.equal(10);
      expect(await polkamineRewardDistributor.connect(bob).userClaimedReward(pidPBTCM, bob.address)).to.equal(10);
      expect(await polkamineRewardDistributor.poolClaimedReward(pidPBTCM)).to.equal(20);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(0);
      expect(await wETHO.balanceOf(bob.address)).to.equal(0);
      await polkamineRewardDistributor.connect(alice).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureAliceETH);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH);
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      expect(await wETHO.balanceOf(polkamineRewardDistributor.address)).to.equal(20);

      expect(await polkamineRewardDistributor.connect(alice).userClaimedReward(pidPETHM, alice.address)).to.equal(20);
      expect(await polkamineRewardDistributor.connect(bob).userClaimedReward(pidPETHM, bob.address)).to.equal(20);
      expect(await polkamineRewardDistributor.poolClaimedReward(pidPETHM)).to.equal(40);

      // change the time and incrase claim index
      increaseTime(claimInterval);
      claimIndex++;
      await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // deposit second rewards
      let wBTCOTotalRewardSecond = 50,
        wETHOTotalRewardSecond = 10;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 40, claimIndex);
      signatureBobBTC = await getSignature(maintainer, bob.address, pidPBTCM, wBTCO.address, 20, claimIndex);
      signatureAliceETH = await getSignature(maintainer, alice.address, pidPETHM, wETHO.address, 10, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 20, claimIndex);

      // claim wBTCO
      expect(await wBTCO.balanceOf(alice.address)).to.equal(10);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(10);
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 40, claimIndex, signatureAliceBTC);
      await polkamineRewardDistributor.connect(bob).claim(pidPBTCM, wBTCO.address, 20, claimIndex, signatureBobBTC);
      expect(await wBTCO.balanceOf(alice.address)).to.equal(50);
      expect(await wBTCO.balanceOf(bob.address)).to.equal(30);
      expect(await wBTCO.balanceOf(polkamineRewardDistributor.address)).to.equal(0);

      expect(await polkamineRewardDistributor.userClaimedReward(pidPBTCM, alice.address)).to.equal(50);
      expect(await polkamineRewardDistributor.connect(bob).userClaimedReward(pidPBTCM, bob.address)).to.equal(30);
      expect(await polkamineRewardDistributor.poolClaimedReward(pidPBTCM)).to.equal(80);

      // claim wETHO
      expect(await wETHO.balanceOf(alice.address)).to.equal(20);
      expect(await wETHO.balanceOf(bob.address)).to.equal(20);
      await polkamineRewardDistributor.connect(alice).claim(pidPETHM, wETHO.address, 10, claimIndex, signatureAliceETH);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH);
      expect(await wETHO.balanceOf(alice.address)).to.equal(30);
      expect(await wETHO.balanceOf(bob.address)).to.equal(40);
      expect(await wETHO.balanceOf(polkamineRewardDistributor.address)).to.equal(0);

      expect(await polkamineRewardDistributor.connect(alice).userClaimedReward(pidPETHM, alice.address)).to.equal(30);
      expect(await polkamineRewardDistributor.connect(bob).userClaimedReward(pidPETHM, bob.address)).to.equal(40);
      expect(await polkamineRewardDistributor.poolClaimedReward(pidPETHM)).to.equal(70);
    });

    it("Should not claim rewards with already used signature", async () => {
      // deposit first rewards
      let wBTCOTotalRewardSecond = 50,
        wETHOTotalRewardSecond = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 40, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 20, claimIndex);

      // claim wBTCO, WETHO
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 40, claimIndex, signatureAliceBTC);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH);

      // retry with the used signature
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");

      // retry after changing claim index
      await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");

      // retry after increasing the time
      increaseTime(claimInterval);
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 40, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Already used signature");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Already used signature");
    });

    it("Should not claim rewards with invalid interval", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 50, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 20, claimIndex);

      // claim wBTCO, WETHO
      await polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 50, claimIndex, signatureAliceBTC);
      await polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH);

      // change the time and increase claim index
      increaseTime(claimInterval - 10);
      claimIndex++;
      await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // deposit second rewards
      let wBTCOTotalRewardSecond = 10,
        wETHOTotalRewardSecond = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardSecond);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardSecond);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardSecond);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 10, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 20, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 10, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid interval");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 20, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid interval");
    });

    it("Should not claim rewards with invalid claim index", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // set claim index
      claimIndex = 2;
      await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);

      // set invalid claim index
      claimIndex--;

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 60, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid claim index");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid claim index");
    });

    it("Should not claim rewards with the signature made by invalid signer", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(alice, alice.address, pidPBTCM, wBTCO.address, 60, claimIndex);
      signatureBobETH = await getSignature(bob, bob.address, pidPETHM, wETHO.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid signer");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid signer");
    });

    it("Should not claim rewards with invalid pid", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM + 10, wBTCO.address, 60, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM + 10, wETHO.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor
          .connect(alice)
          .claim(pidPBTCM + 10, wBTCO.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Invalid pid");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM + 10, wETHO.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Invalid pid");
    });

    it("Should not claim rewards with unmatched reward token", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature using invalid claim index
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wETHO.address, 60, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wBTCO.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wETHO.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("Unmatched reward token");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wBTCO.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("Unmatched reward token");
    });

    it("Should not claim rewards with the exceeded amount", async () => {
      // deposit first rewards
      let wBTCOTotalRewardFirst = 50,
        wETHOTotalRewardFirst = 20;

      await wBTCO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wBTCOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wBTCO.address, wBTCOTotalRewardFirst);
      await wETHO.connect(rewardDepositor).approve(polkamineRewardDistributor.address, wETHOTotalRewardFirst);
      await polkamineRewardDistributor.connect(rewardDepositor).deposit(wETHO.address, wETHOTotalRewardFirst);

      // mock BTC/ETH reward signature
      signatureAliceBTC = await getSignature(maintainer, alice.address, pidPBTCM, wBTCO.address, 60, claimIndex);
      signatureBobETH = await getSignature(maintainer, bob.address, pidPETHM, wETHO.address, 30, claimIndex);

      // claim wBTCO, WETHO
      await expect(
        polkamineRewardDistributor.connect(alice).claim(pidPBTCM, wBTCO.address, 60, claimIndex, signatureAliceBTC),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      await expect(
        polkamineRewardDistributor.connect(bob).claim(pidPETHM, wETHO.address, 30, claimIndex, signatureBobETH),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});