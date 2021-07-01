//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IPolkaminePoolManager {
  function addPool(address _pool) external returns (uint256);

  function removePool(uint256 _pid) external returns (address);

  function allPools() external view returns (address[] memory);

  function poolLength() external view returns (uint256);

  function pools(uint256 _pid) external view returns (address);
}
