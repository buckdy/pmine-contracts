//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineAddressManager {
  function manager() external view returns (address);

  function rewardStatsSubmitter() external view returns (address);

  function rewardDepositor() external view returns (address);

  function rewardOracle() external view returns (address);

  function rewardDistributor() external view returns (address);

  function poolManager() external view returns (address);
}
