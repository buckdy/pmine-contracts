//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IRewardOracle {
  function getReward(uint256 _pid, address _beneficiary) external virtual returns (uint256);

  function setPoolRewards(uint256[] calldata _pids, uint256[] calldata _amounts) external virtual;
}
