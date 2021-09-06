const { ethers } = require("ethers");
const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

main = async () => {
  // Configs
  const config = c[hre.network.name];

  const claimInterval = config.claimInterval;

  // Deploy PolkaminePoolManager Contract
  const PolkaminePoolManager = await hre.ethers.getContractFactory("PolkaminePoolManager");
  const polkaminePoolManager = await upgrades.deployProxy(PolkaminePoolManager, [polkamineAdmin.address]);
  await polkaminePoolManager.deployed();
  console.log("PolkaminePoolManager contract deployed to:", polkaminePoolManager.address);
  saveContractAddress(hre.network.name, 'PolkaminePoolManager', polkaminePoolManager.address);

  const polkaminePoolManagerAftifact = await hre.artifacts.readArtifact("PolkaminePoolManager");
  saveContractAbis(hre.network.name, 'PolkaminePoolManager', polkaminePoolManagerAftifact.abi, hre.network.name);

  // Deploy PolkamineRewardDistributor
  const PolkamineRewardDistributor = await ethers.getContractFactory("PolkamineRewardDistributor");
  const polkamineRewardDistributor = await upgrades.deployProxy(PolkamineRewardDistributor, [
    polkamineAdmin.address,
    claimInterval,
  ]);
  await polkamineRewardDistributor.deployed();
  console.log("PolkamineRewardDistributor contract deployed to:", polkamineRewardDistributor.address);
  saveContractAddress(hre.network.name, 'PolkamineRewardDistributor', polkamineRewardDistributor.address);

  const polkamineRewardDistributorAftifact = await hre.artifacts.readArtifact("PolkamineRewardDistributor");
  saveContractAbis(hre.network.name, 'PolkamineRewardDistributor', polkamineRewardDistributorAftifact.abi, hre.network.name);

  // Deploy TokenSale
  const TokenSale = await ethers.getContractFactory("TokenSale");
  const tokenSale = await upgrades.deployProxy(TokenSale, [polkamineAdmin.address]);
  await tokenSale.deployed();
  console.log("TokenSale contract deployed to:", tokenSale.address);
  saveContractAddress(hre.network.name, 'TokenSale', tokenSale.address);

  const tokenSaleAftifact = await hre.artifacts.readArtifact("TokenSale");
  saveContractAbis(hre.network.name, 'TokenSale', tokenSaleAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
