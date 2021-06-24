//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkaminePoolManager.sol";

contract PolkaminePoolManager is IPolkaminePoolManager, OwnableUpgradeable {
  /*** Events ***/
  event AddPool(uint256 pid, address pool);
  event RemovePool(uint256 pid, address pool);

  /*** Constants ***/

  /*** Storage Properties ***/
  address[] public pools;
  mapping(address => bool) public isPool;

  /*** Contract Logic Starts Here */

  function initialize() public initializer {
    __Ownable_init();
  }

  function addPool(address _pool) external override onlyOwner returns (uint256 pid) {
    require(!isPool[_pool], "Pool already exists");

    // add pool
    pools.push(_pool);
    isPool[_pool] = true;

    pid = pools.length - 1;

    emit AddPool(pid, _pool);
  }

  function removePool(uint256 _pid) external override onlyOwner returns (address pool) {
    require(_pid < pools.length, "Invalid pool index");
    uint256 length = pools.length;

    pool = pools[_pid];

    // remove pool
    pools[_pid] = pools[length - 1];
    pools.pop();
    isPool[pool] = false;

    emit RemovePool(_pid, pool);
  }

  function allPools() external view override returns (address[] memory) {
    return pools;
  }
}
