//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkaminePoolManager {
  function addPool(address _pool) external returns (uint256);

  function removePool(uint256 _pid) external returns (address);

  function allPools() external returns (address[] memory);
}
