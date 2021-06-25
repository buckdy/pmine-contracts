//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external;

  function claim(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external;
}
