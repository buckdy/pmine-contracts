// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("ethers");
const hre = require("hardhat");
const { toRole } = require("../test/utils");

main = async () => {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // Constants
  const MINTER_ROLE = toRole("MINTER_ROLE");
  const BURNER_ROLE = toRole("BURNER_ROLE");

  // Addresses
  [deployer, rewardDepositor, maintainer] = await ethers.getSigners();
  
  const manager = deployer;
  const claimIndex = 0;
  const claimInterval = 43200; //half day

  console.log("Deployer address = ", deployer.address);
  console.log("Manager address = ", manager.address);
  console.log("RewardDepositor address = ", rewardDepositor.address);
  console.log("Maintainer address = ", maintainer.address);

  // depositToken
  const PToken = await hre.ethers.getContractFactory("PToken");
  const pBTCM = await upgrades.deployProxy(PToken, ["pBTCM", "pBTCM"]);
  await pBTCM.deployed();
  console.log("pBTCM token contract deployed to:", pBTCM.address);

  const pETHM = await upgrades.deployProxy(PToken, ["pETHM", "pETHM"]);
  await pETHM.deployed();
  console.log("pETHM token contract deployed to:", pETHM.address);

  // rewardToken
  const WToken = await hre.ethers.getContractFactory("WToken");
  const wBTCO = await upgrades.deployProxy(WToken, ["wBTCO", "wBTCO"]);
  await wBTCO.deployed();
  console.log("wBTCO token contract deployed to:", wBTCO.address);

  const wETHO = await upgrades.deployProxy(WToken, ["wETHO", "wETHO"]);
  await wETHO.deployed();
  console.log("wETHO token contract deployed to:", wETHO.address);

  // MINE Token
  const MINEToken = await hre.ethers.getContractFactory("MINEToken");
  const mine = await upgrades.deployProxy(MINEToken, ["MINE", "MINE"]);
  await mine.deployed();
  console.log("MINE token contract deployed to:", mine.address);

  // PolkamineAdmin Contract
  console.log("PolkamineAdmin address = ", manager.address);

  const PolkamineAdmin = await hre.ethers.getContractFactory("PolkamineAdmin");
  const polkamineAdmin = await upgrades.deployProxy(PolkamineAdmin, [manager.address]);
  await polkamineAdmin.deployed();
  console.log("PolkamineAdmin contract deployed to:", polkamineAdmin.address);

  // PolkaminePoolManager Contract
  const PolkaminePoolManager = await hre.ethers.getContractFactory("PolkaminePoolManager");
  const polkaminePoolManager = await upgrades.deployProxy(PolkaminePoolManager, [polkamineAdmin.address]);
  await polkaminePoolManager.deployed();
  console.log("PolkaminePoolManager contract deployed to:", polkaminePoolManager.address);

  await polkaminePoolManager.connect(manager).addPool(pBTCM.address, wBTCO.address, mine.address);
  await polkaminePoolManager.connect(manager).addPool(pETHM.address, wETHO.address, mine.address);

  // Deploy PolkamineRewardDistributor ans set the address to PolkamineAdmin
  const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
  const polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
    polkamineAdmin.address,
    claimInterval,
  ]);
  await polkamineRewardDistributor.deployed();
  console.log("PolkamineRewardDistributor contract deployed to:", polkamineRewardDistributor.address);

  await polkamineAdmin.setRewardDistributorContract(polkamineRewardDistributor.address);

  // Set PoolManager, RewardDepositor and Maintainer
  await polkamineAdmin.setPoolManagerContract(polkaminePoolManager.address);
  await polkamineAdmin.setRewardDepositor(rewardDepositor.address);
  await polkamineAdmin.setMaintainer(maintainer.address);

  // set claimIndex and claimInterval
  await polkamineRewardDistributor.connect(maintainer).setClaimIndex(claimIndex);
  await polkamineRewardDistributor.connect(manager).setClaimInterval(claimInterval);

  // Grant roles to depositToken, rewardToken and MINE Token
  await pBTCM.grantRole(MINTER_ROLE, deployer.address);
  await pETHM.grantRole(MINTER_ROLE, deployer.address);
  await wBTCO.grantRole(MINTER_ROLE, deployer.address);
  await wETHO.grantRole(MINTER_ROLE, deployer.address);
  await mine.grantRole(MINTER_ROLE, deployer.address);

  await pBTCM.grantRole(BURNER_ROLE, deployer.address);
  await pETHM.grantRole(BURNER_ROLE, deployer.address);
  await wBTCO.grantRole(BURNER_ROLE, deployer.address);
  await wETHO.grantRole(BURNER_ROLE, deployer.address);
  await mine.grantRole(BURNER_ROLE, deployer.address);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
