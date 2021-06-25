//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkamineAddressManager {
  function manager() external view returns (address);

  function rewardStatsSubmitter() external view returns (address);

  function rewardDepositor() external view returns (address);

  function rewardOracleContract() external view returns (address);

  function rewardDistributorContract() external view returns (address);

  function poolManagerContract() external view returns (address);
}
