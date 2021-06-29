//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IPolkamineRewardOracle.sol";
import "../interfaces/IPolkamineAddressManager.sol";

/**
 * @title Polkamine's Reward Oracle Contract
 * @notice Manage the reward based on the mining output
 * @author Polkamine
 */
contract PolkamineRewardOracle is IPolkamineRewardOracle, Initializable {
  /*** Events ***/

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(uint256 => mapping(address => uint256)) public override userReward; // pid => staker => amount
  mapping(uint256 => uint256) public override poolReward;
  uint256 public override lastUpdatedAt;

  /*** Contract Logic Starts Here */

  modifier onlyRewardStatsSubmitter() {
    require(
      msg.sender == IPolkamineAddressManager(addressManager).rewardStatsSubmitter(),
      "Not reward stats submitter"
    );
    _;
  }

  function initialize(address _addressManager) public initializer {
    addressManager = _addressManager;
  }

  /**
   * @notice Set the reward stats of each pool
   * @param _pid pool index
   * @param _beneficiary array of address who receives the reward
   * @param _reward array of reward the beneficiary will receive
   */
  function setRewardStats(
    uint256 _pid,
    address[] calldata _beneficiary,
    uint256[] calldata _reward
  ) external override onlyRewardStatsSubmitter {
    require(_beneficiary.length == _reward.length, "Reward stats unmatched");

    for (uint256 i; i < _beneficiary.length; i++) {
      userReward[_pid][_beneficiary[i]] += _reward[i];
      poolReward[_pid] += _reward[i];
    }
  }

  /**
   * @notice Set the last time updated the reward stats
   * @param _lastUpdatedAt last updated time
   */
  function setLastUpdatedAt(uint256 _lastUpdatedAt) external override onlyRewardStatsSubmitter {
    lastUpdatedAt = _lastUpdatedAt;
  }
}
