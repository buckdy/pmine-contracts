//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IPolkamineRewardOracle.sol";
import "../interfaces/IPolkamineAddressManager.sol";

/**
 * @title Polkamine's Reward Oracle Contract
 * @notice Manage the reward of each staker per pool based on the mining output
 * @author Polkamine
 */
contract PolkamineRewardOracle is IPolkamineRewardOracle, Initializable {
  /*** Events ***/

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(uint256 => mapping(address => uint256)) public override claimableReward; // pid => staker => amount
  uint256 public override lastUpdatedAt;

  /*** Contract Logic Starts Here */

  modifier onlyRewardStatsSubmitter() {
    require(
      msg.sender == IPolkamineAddressManager(addressManager).rewardStatsSubmitter(),
      "Not reward stats submitter"
    );
    _;
  }

  modifier onlyRewardDistributorContract() {
    require(
      msg.sender == IPolkamineAddressManager(addressManager).rewardDistributorContract(),
      "Not reward distributor"
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
      claimableReward[_pid][_beneficiary[i]] += _reward[i];
    }
  }

  /**
   * @notice Set the last time updated the reward stats
   */
  function setLastUpdatedAt(uint256 _lastUpdatedAt) external onlyRewardStatsSubmitter {
    lastUpdatedAt = _lastUpdatedAt;
  }

  /**
   * @notice Decrease the reward amount of the beneficiary
   * @dev Called only by RewardDistributor contract before sending the reward to a staker
   * @param _pid pool index
   * @param _beneficiary address who receives the reward
   * @param _amount reward amount the beneficiary will receive
   */
  function onClaimReward(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external override onlyRewardDistributorContract {
    claimableReward[_pid][_beneficiary] -= _amount;
  }
}
