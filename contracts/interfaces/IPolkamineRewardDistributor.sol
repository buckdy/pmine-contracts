//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkamineRewardDistributor {
  function claim(
    address _pid,
    address _beneficiary,
    uint256 _amount
  ) external virtual;
}
