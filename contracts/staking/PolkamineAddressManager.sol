//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/IPolkamineAddressManager.sol";

contract PolkamineAddressManager is IPolkamineAddressManager, OwnableUpgradeable {
  /*** Storage Properties ***/

  // polkamine managed addresses
  address public override manager;
  address public override rewardStatsSubmitter;
  address public override rewardDepositor;

  // polkamine contracts
  address public override rewardOracleContract;
  address public override rewardDistributorContract;
  address public override poolManagerContract;

  /*** Contract Logic Starts Here */

  function initialize(address _manager) public initializer {
    __Ownable_init();

    manager = _manager;
  }

  function setManager(address _manager) external onlyOwner {
    manager = _manager;
  }

  function setRewardStatsSubmitter(address _rewardStatsSubmitter) external onlyOwner {
    rewardStatsSubmitter = _rewardStatsSubmitter;
  }

  function setRewardDepositor(address _rewardDepositor) external onlyOwner {
    rewardDepositor = _rewardDepositor;
  }

  function setRewardOracleContract(address _rewardOracleContract) external onlyOwner {
    rewardOracleContract = _rewardOracleContract;
  }

  function setRewardDistributorContract(address _rewardDistributorContract) external onlyOwner {
    rewardDistributorContract = _rewardDistributorContract;
  }

  function setPoolManagerContract(address _poolManagerContract) external onlyOwner {
    poolManagerContract = _poolManagerContract;
  }
}
