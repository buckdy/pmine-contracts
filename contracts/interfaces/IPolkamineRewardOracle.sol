//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardOracle {
  function setRewardStats(
    uint256 _pid,
    address[] calldata _beneficiary,
    uint256[] calldata _reward
  ) external;

  function userReward(uint256 _pid, address _beneficiary) external view returns (uint256);

  function poolReward(uint256 _pid) external view returns (uint256);

  function setLastUpdatedAt(uint256 _lastUpdatedAt) external;

  function lastUpdatedAt() external view returns (uint256);
}
