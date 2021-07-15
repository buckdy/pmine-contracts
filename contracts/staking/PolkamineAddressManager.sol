//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/IPolkamineAddressManager.sol";

/**
 * @title Polkamine's Address Manager contract
 * @author icrabbiter
 */
contract PolkamineAddressManager is IPolkamineAddressManager, OwnableUpgradeable {
  /*** Storage Properties ***/

  // polkamine manager addresses
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

  /**
   * @notice set manager
   * @param _manager the manager address
   */
  function setManager(address _manager) external onlyOwner {
    manager = _manager;
  }

  /**
   * @notice set reward stats submitter
   * @param _rewardStatsSubmitter the submitter address
   */
  function setRewardStatsSubmitter(address _rewardStatsSubmitter) external onlyOwner {
    rewardStatsSubmitter = _rewardStatsSubmitter;
  }

  /**
   * @notice set reward depositor
   * @param _rewardDepositor the depositor address
   */
  function setRewardDepositor(address _rewardDepositor) external onlyOwner {
    rewardDepositor = _rewardDepositor;
  }

  /**
   * @notice set reward oracle contract
   * @param _rewardOracleContract the reward oracle contract address
   */
  function setRewardOracleContract(address _rewardOracleContract) external onlyOwner {
    rewardOracleContract = _rewardOracleContract;
  }

  /**
   * @notice set reward distributor contract
   * @param _rewardDistributorContract the reward distributor contract address
   */
  function setRewardDistributorContract(address _rewardDistributorContract) external onlyOwner {
    rewardDistributorContract = _rewardDistributorContract;
  }

  /**
   * @notice set pool manager contract
   * @param _poolManagerContract the pool manager contract address
   */
  function setPoolManagerContract(address _poolManagerContract) external onlyOwner {
    poolManagerContract = _poolManagerContract;
  }
}
