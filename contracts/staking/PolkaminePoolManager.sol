//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkamineAdmin.sol";

/**
 * @title Polkamine's Pool Manager contract
 * @author Polkamine
 */
contract PolkaminePoolManager is IPolkaminePoolManager, Initializable, ReentrancyGuardUpgradeable {
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /*** Events ***/
  event AddPool(uint256 pid, address indexed depositToken, address indexed rewardToken);
  event RemovePool(uint256 pid);
  event Stake(uint256 pid, address indexed user, uint256 amount, uint256 timestamp);
  event Unstake(uint256 pid, address indexed user, uint256 amount, uint256 timestamp);

  /*** Constants ***/

  /*** Storage Properties ***/
  struct PoolInfo {
    address depositToken;
    address rewardToken;
  }

  address public addressManager;
  PoolInfo[] public override pools;
  mapping(uint256 => mapping(address => uint256)) public userStakes;
  mapping(uint256 => bool) public isDeprecatedPool;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IPolkamineAdmin(addressManager).manager(), "Not polkamine manager");
    _;
  }

  modifier onlyUnpaused() {
    require(!IPolkamineAdmin(addressManager).paused(), "Paused");
    _;
  }

  function initialize(address _addressManager) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
  }

  /**
   * @notice Add a new pool
   * @param _depositToken the deposit token address
   * @param _rewardToken the reward token address
   */
  function addPool(address _depositToken, address _rewardToken) external override onlyManager returns (uint256 pid) {
    pools.push(PoolInfo(_depositToken, _rewardToken));

    emit AddPool(pid, _depositToken, _rewardToken);
  }

  /**
   * @notice Remove a pool
   * @param _pid the pool index to be removed
   */
  function removePool(uint256 _pid) external override onlyManager {
    require(_pid < pools.length, "Invalid pool index");

    // remove pool
    isDeprecatedPool[_pid] = true;

    emit RemovePool(_pid);
  }

  /**
   * @notice stake depositToken
   * @param _amount the stake amount
   */
  function stake(uint256 _pid, uint256 _amount) external onlyUnpaused {
    require(_pid < pools.length, "Invalid pool index");

    IERC20Upgradeable(pools[_pid].depositToken).safeTransferFrom(msg.sender, address(this), _amount);

    userStakes[_pid][msg.sender] += _amount;

    emit Stake(_pid, msg.sender, _amount, block.timestamp);
  }

  /**
   * @notice unstake depositToken
   * @param _amount the unstake amount
   */
  function unstake(uint256 _pid, uint256 _amount) external nonReentrant onlyUnpaused {
    require(_pid < pools.length, "Invalid pool index");
    require(_amount <= userStakes[_pid][msg.sender], "Invalid amount");

    userStakes[_pid][msg.sender] -= _amount;
    IERC20Upgradeable(pools[_pid].depositToken).safeTransfer(msg.sender, _amount);

    emit Unstake(_pid, msg.sender, _amount, block.timestamp);
  }

  /**
   * @notice Returns the length of the pool
   */
  function poolLength() external view override returns (uint256) {
    return pools.length;
  }
}
