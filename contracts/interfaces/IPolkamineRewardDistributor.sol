//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external;

  function claim(
    uint256 _pid,
    address _wToken,
    uint256 _amount,
    uint256 _rewardIndex,
    bytes memory signature
  ) external;

  function userClaimedReward(uint256 _pid, address _beneficiary) external view returns (uint256);

  function poolClaimedReward(uint256 _pid) external view returns (uint256);

  function setRewardInterval(uint256 _rewardInterval) external;

  function setRewardIndex(uint256 _rewardIndex) external;
}
