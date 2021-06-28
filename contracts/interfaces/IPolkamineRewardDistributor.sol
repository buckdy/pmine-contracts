//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external;

  function claim(
    uint256 _pid,
    uint256 _amount
  ) external;

  function userClaimedReward(uint256, address) external view returns (uint256);

  function poolClaimedReward(uint256) external view returns (uint256);

  function userClaimableReward(uint256) external view returns (uint256);

  function poolClaimableReward(uint256) external view returns (uint256);
}
