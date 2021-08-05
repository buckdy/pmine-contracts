//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkaminePool {
  function stake(uint256 _amount) external;

  function unstake(uint256 _amount) external;

  function depositToken() external view returns (address);

  function rewardToken() external view returns (address);
}
