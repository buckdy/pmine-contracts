//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkaminePool {
  function stake(uint256 _amount) external virtual;

  function unstake(uint256 _amount) external virtual;
}
