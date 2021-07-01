const { expect } = require("chai");
const { upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("PolkamineRewardOracle", () => {
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

  describe("Set Reward Stats", async () => {
    it("Should not set reward stats by non rewardStatsSubmitter", async () => {
      let _beneficiary = [alice.address, bob.address];
      let _reward = [100, 50];

      await expect(polkamineRewardOracle.setRewardStats(pidPBTCM, _beneficiary, _reward)).to.be.revertedWith(
        "Not reward stats submitter",
      );
    });

    it("Should not set reward stats if stats is not matched", async () => {
      let _beneficiary = [alice.address, bob.address];
      let _reward = [100];

      await expect(
        polkamineRewardOracle.connect(rewardStatsSubmitter).setRewardStats(pidPBTCM, _beneficiary, _reward),
      ).to.be.revertedWith("Reward stats unmatched");
    });

    it("Should set reward stats by rewardStatsSubmitter", async () => {
      let beneficiary = [alice.address, bob.address];
      let reward = [100, 50];

      expect(await polkamineRewardOracle.userReward(pidPBTCM, alice.address)).to.be.equal(0);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, bob.address)).to.be.equal(0);
      await polkamineRewardOracle.connect(rewardStatsSubmitter).setRewardStats(pidPBTCM, beneficiary, reward);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, alice.address)).to.be.equal(100);
      expect(await polkamineRewardOracle.userReward(pidPBTCM, bob.address)).to.be.equal(50);
    });
  });

  describe("Set Last UpdatedAt", async () => {
    it("Should not set last updated at by non rewardStatsSubmitter", async () => {
      let lastUpdatedAt = 1460714400;

      await expect(polkamineRewardOracle.setLastUpdatedAt(lastUpdatedAt)).to.be.revertedWith(
        "Not reward stats submitter",
      );
    });

    it("Should set last updated at by rewardStatsSubmitter", async () => {
      let lastUpdatedAt = 1460714400;

      expect(await polkamineRewardOracle.lastUpdatedAt()).to.be.equal(0);
      await polkamineRewardOracle.connect(rewardStatsSubmitter).setLastUpdatedAt(lastUpdatedAt);
      expect(await polkamineRewardOracle.lastUpdatedAt()).to.be.equal(lastUpdatedAt);
    });
  });
});
