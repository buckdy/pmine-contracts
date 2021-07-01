const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { toRole, increaseTime } = require("../utils");

describe("Polkamine Pool Manage", () => {
  let pBTCM,
    pETHM,
    wBTCO,
    wETHO,
    pBTCMPool,
    pETHMPool,
    polkamineAddressManager,
    polkaminePoolManager,
    polkamineRewardDistributor,
    polkamineRewardOracle;

  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");
  const MINT_AMOUNT = 100;

  before(async () => {
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

    // Deploy PolkaminePools.
    const PolkaminePool = await ethers.getContractFactory("PolkaminePool");
    pBTCMPool = await upgrades.deployProxy(PolkaminePool, [pBTCM.address, wBTCO.address]);
    pETHMPool = await upgrades.deployProxy(PolkaminePool, [pETHM.address, wETHO.address]);

    // Deploy PolkamineRewardDistributor ans set the address to PolkamineAddressManager
    const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
    polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
      polkamineAddressManager.address,
    ]);

    await polkamineAddressManager.setManager(manager.address);

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

  describe("PolkaminePool", () => {
    it("Should initialize", async () => {
      expect(await pBTCMPool.pToken()).to.be.equal(pBTCM.address);
      expect(await pBTCMPool.wToken()).to.be.equal(wBTCO.address);
    });
    it("Should be able to stake", async () => {
      await expect(pBTCMPool.connect(alice).stake(10)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

      await pBTCM.connect(alice).approve(pBTCMPool.address, ethers.constants.MaxUint256);

      await expect(pBTCMPool.connect(alice).stake(MINT_AMOUNT + 1)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT);
      expect(await pBTCM.balanceOf(pBTCMPool.address)).to.be.equal(0);
      await pBTCMPool.connect(alice).stake(10);
      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT - 10);
      expect(await pBTCM.balanceOf(pBTCMPool.address)).to.be.equal(10);
    });

    it("Should be able to unstake", async () => {
      await expect(pBTCMPool.connect(alice).unstake(11)).to.be.revertedWith("Invalid amount");

      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT - 10);
      expect(await pBTCM.balanceOf(pBTCMPool.address)).to.be.equal(10);
      await pBTCMPool.connect(alice).unstake(10);
      expect(await pBTCM.balanceOf(alice.address)).to.be.equal(MINT_AMOUNT);
      expect(await pBTCM.balanceOf(pBTCMPool.address)).to.be.equal(0);
    });
  });

  describe("PolkaminePoolManager", () => {
    it("Should initialize", async () => {
      expect(await polkaminePoolManager.addressManager()).to.be.equal(polkamineAddressManager.address);
    });

    it("Should be able to add pool", async () => {
      await expect(polkaminePoolManager.addPool(pBTCMPool.address)).to.be.revertedWith("Not polkamine manager");

      await expect(polkaminePoolManager.pools(0)).to.be.reverted;
      expect(await polkaminePoolManager.isPool(pBTCMPool.address)).to.be.false;
      expect(await polkaminePoolManager.poolLength()).to.be.equal(0);
      await polkaminePoolManager.connect(manager).addPool(pBTCMPool.address);
      expect(await polkaminePoolManager.pools(0)).to.be.equal(pBTCMPool.address);
      expect(await polkaminePoolManager.isPool(pBTCMPool.address)).to.be.true;
      expect(await polkaminePoolManager.poolLength()).to.be.equal(1);

      await expect(polkaminePoolManager.connect(manager).addPool(pBTCMPool.address)).to.be.revertedWith(
        "Pool already exists",
      );
    });

    it("Should be able to remove pool", async () => {
      await expect(polkaminePoolManager.removePool(0)).to.be.revertedWith("Not polkamine manager");
      await expect(polkaminePoolManager.connect(manager).removePool(1)).to.be.revertedWith("Invalid pool index");

      expect(await polkaminePoolManager.pools(0)).to.be.equal(pBTCMPool.address);
      expect(await polkaminePoolManager.isPool(pBTCMPool.address)).to.be.true;
      expect(await polkaminePoolManager.poolLength()).to.be.equal(1);
      await polkaminePoolManager.connect(manager).removePool(0);
      await expect(polkaminePoolManager.pools(0)).to.be.reverted;
      expect(await polkaminePoolManager.isPool(pBTCMPool.address)).to.be.false;
      expect(await polkaminePoolManager.poolLength()).to.be.equal(0);
    });

    it("Should be able to get all pools", async () => {
      let pools = await polkaminePoolManager.allPools();
      expect(pools.length).to.be.equal(0);
      expect(await polkaminePoolManager.poolLength()).to.be.equal(0);

      await polkaminePoolManager.connect(manager).addPool(pBTCMPool.address);
      await polkaminePoolManager.connect(manager).addPool(pETHMPool.address);

      pools = await polkaminePoolManager.allPools();
      expect(pools.length).to.be.equal(2);
      expect(pools[0]).to.be.equal(pBTCMPool.address);
      expect(pools[1]).to.be.equal(pETHMPool.address);
      expect(await polkaminePoolManager.poolLength()).to.be.equal(2);
    });

    it("Should be able to get pool index", async () => {
      await expect(polkaminePoolManager.poolIndex(deployer.address)).to.be.revertedWith("Invalid pool");

      expect(await polkaminePoolManager.poolIndex(pBTCMPool.address)).to.be.equal(0);
      expect(await polkaminePoolManager.poolIndex(pETHMPool.address)).to.be.equal(1);
    });
  });
});
