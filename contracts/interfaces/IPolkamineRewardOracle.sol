//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IRewardOracle {
  function getReward(uint256 _pid, address _beneficiary) external returns (uint256);

  function setPoolRewards(uint256[] calldata _pids, uint256[] calldata _amounts) external;
}
