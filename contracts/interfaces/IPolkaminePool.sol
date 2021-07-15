//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkaminePool {
  function stake(uint256 _amount) external;

  function unstake(uint256 _amount) external;

  function wToken() external view returns (address);
}
