//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineRewardDistributor {
  function claim(
    address _pid,
    address _beneficiary,
    uint256 _amount
  ) external;
}
