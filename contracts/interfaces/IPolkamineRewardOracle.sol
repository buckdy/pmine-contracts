//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkamineRewardOracle {
  function claimableReward(uint256 _pid, address _beneficiary) external virtual returns (uint256);

  function onClaimReward(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external virtual;
}
