//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

abstract contract IPolkamineMasterChef {
    function addPool(address _pAddress) virtual external returns (uint256);
    function removePool(uint _pid) virtual external;
}
