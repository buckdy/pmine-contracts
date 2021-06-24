//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkamineRewardDistributor {
  function deposit(address _rewardToken, uint256 _amount) external virtual;

  function claim(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external virtual;
}
