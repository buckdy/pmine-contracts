//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkamineMasterChef {
  function addPool(address _pAddress) external virtual returns (uint256);

  function removePool(uint256 _pid) external virtual;
}
