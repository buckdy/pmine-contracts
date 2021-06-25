//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardOracle {
  function setRewardStats(
    uint256 _pid,
    address[] calldata _beneficiary,
    uint256[] calldata _reward
  ) external;

  function claimableReward(uint256 _pid, address _beneficiary) external returns (uint256);

  function onClaimReward(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external;

  function lastUpdatedAt() external returns (uint256);
}
