//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external;

  function claim(
    uint256 _pid,
    address _rewardToken,
    uint256 _amount,
    uint256 _claimIndex,
    bytes memory signature
  ) external;

  function userClaimedReward(uint256 _pid, address _beneficiary) external view returns (uint256);

  function poolClaimedReward(uint256 _pid) external view returns (uint256);

  function setClaimInterval(uint256 _claimInterval) external;

  function setClaimIndex(uint256 _claimIndex) external;
}
