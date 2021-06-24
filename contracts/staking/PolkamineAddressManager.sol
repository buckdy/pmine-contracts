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
  address public override rewardOracle;
  address public override rewardDistributor;
  address public override poolManager;

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

  function setRewardOracle(address _rewardOracle) external onlyOwner {
    rewardOracle = _rewardOracle;
  }

  function setRewardDistributor(address _rewardDistributor) external onlyOwner {
    rewardDistributor = _rewardDistributor;
  }

  function setPoolManager(address _poolManager) external onlyOwner {
    poolManager = _poolManager;
  }
}
