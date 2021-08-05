//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkaminePool.sol";
import "../interfaces/IPolkamineAdmin.sol";

/**
 * @title Polkamine's Pool Manager contract
 * @author Polkamine
 */
contract PolkaminePoolManager is IPolkaminePoolManager, Initializable {
  /*** Events ***/
  event AddPool(uint256 pid, address indexed pool, address indexed depositToken, address indexed rewardToken);
  event RemovePool(uint256 pid, address indexed pool);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(address => bool) public isDeprecatedPool;
  address[] public override pools;
  mapping(address => uint256) internal _poolIndex;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IPolkamineAdmin(addressManager).manager(), "Not polkamine manager");
    _;
  }

  function initialize(address _addressManager) public initializer {
    addressManager = _addressManager;
  }

  /**
   * @notice Add a new pool
   * @param _pool a new pool address to be added
   */
  function addPool(address _pool) external override onlyManager returns (uint256 pid) {
    require(_poolIndex[_pool] == 0, "Pool already exists");

    pid = pools.length;

    // add pool
    pools.push(_pool);
    _poolIndex[_pool] = pools.length;

    emit AddPool(pid, _pool, IPolkaminePool(_pool).depositToken(), IPolkaminePool(_pool).rewardToken());
  }

  /**
   * @notice Remove a pool
   * @param _pid the pool index to be removed
   */
  function removePool(uint256 _pid) external override onlyManager returns (address pool) {
    require(_pid < pools.length, "Invalid pool index");

    pool = pools[_pid];

    // remove pool
    isDeprecatedPool[pool] = true;

    emit RemovePool(_pid, pool);
  }

  /**
   * @notice Returns all pool addresses
   */
  function allPools() external view override returns (address[] memory) {
    return pools;
  }

  /**
   * @notice Returns the length of the pool
   */
  function poolLength() external view override returns (uint256) {
    return pools.length;
  }

  /**
   * @notice Returns if the given pool exists
   * @param _pool the pool address
   */
  function isPool(address _pool) external view returns (bool) {
    return _poolIndex[_pool] != 0;
  }

  /**
   * @notice Returns index of the pool address
   * @param _pool the pool address
   */
  function poolIndex(address _pool) external view returns (uint256) {
    require(_poolIndex[_pool] != 0, "Invalid pool");

    return _poolIndex[_pool] - 1;
  }
}
