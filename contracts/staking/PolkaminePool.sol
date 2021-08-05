//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkaminePool.sol";
import "../interfaces/IPolkamineAdmin.sol";

/**
 * @title Polkamine's Pool contract
 * @author Polkamine
 */
contract PolkaminePool is IPolkaminePool, ReentrancyGuardUpgradeable {
  /*** Events ***/
  event Stake(address indexed user, uint256 amount, uint256 timestamp);
  event Unstake(address indexed user, uint256 amount, uint256 timestamp);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public override depositToken;
  address public override rewardToken;
  mapping(address => uint256) public userStakes;
  address public addressManager;

  /*** Contract Logic Starts Here */

  modifier onlyUnpaused() {
    require(!IPolkamineAdmin(addressManager).paused(), "Paused");
    _;
  }

  function initialize(
    address _addressManager,
    address _depositToken,
    address _rewardToken
  ) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
    depositToken = _depositToken;
    rewardToken = _rewardToken;
  }

  /**
   * @notice stake depositToken
   * @param _amount the stake amount
   */
  function stake(uint256 _amount) external override onlyUnpaused {
    require(IERC20Upgradeable(depositToken).transferFrom(msg.sender, address(this), _amount), "Transfer failure");

    userStakes[msg.sender] += _amount;

    emit Stake(msg.sender, _amount, block.timestamp);
  }

  /**
   * @notice unstake depositToken
   * @param _amount the unstake amount
   */
  function unstake(uint256 _amount) external override nonReentrant onlyUnpaused {
    require(_amount <= userStakes[msg.sender], "Invalid amount");

    userStakes[msg.sender] -= _amount;
    require(IERC20Upgradeable(depositToken).transfer(msg.sender, _amount), "Transfer failure");

    emit Unstake(msg.sender, _amount, block.timestamp);
  }
}
