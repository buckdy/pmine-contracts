const { ethers } = require("ethers");
const hre = require("hardhat");
const { getSavedContractAddresses, saveContractAddress, saveContractAbis } = require('./utils');

main = async () => {
  // Addresses
  [deployer] = await ethers.getSigners();

  // Deploy Mock USDT Token
  const USDTToken = await hre.ethers.getContractFactory("ERC20Mock");
  const usdt = await upgrades.deployProxy(MINEToken, ["Mock USDT Token", "MUT"]);
  await usdt.deployed();
  console.log("Mock USDT token contract deployed to:", usdt.address);
  saveContractAddress(hre.network.name, 'Mock USDT', usdt.address);

  const usdtAftifact = await hre.artifacts.readArtifact("ERC20Mock");
  saveContractAbis(hre.network.name, 'Mock USDT', usdtAftifact.abi, hre.network.name);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
