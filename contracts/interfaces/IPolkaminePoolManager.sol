//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkaminePoolManager {
  function addPool(address _pool) external virtual returns (uint256);

  function removePool(uint256 _pid) external virtual returns (address);

  function allPools() external virtual returns (address[] memory);

  function pools(uint256 _pid) external virtual returns (address);
}
