//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkamineRewardDistributor.sol";
import "../interfaces/IPolkamineRewardOracle.sol";
import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkaminePool.sol";
import "../interfaces/IPolkamineAddressManager.sol";

/**
 * @title Polkamine's Reward Distributor Contract
 * @notice Distribute users the reward
 * @author Polkamine
 */
contract PolkamineRewardDistributor is IPolkamineRewardDistributor, ReentrancyGuardUpgradeable {
  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(address indexed beneficiary, address indexed rewardToken, uint256 amount);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(uint256 => mapping(address => uint256)) public override userClaimedReward;
  mapping(uint256 => uint256) public override poolClaimedReward;

  /*** Contract Logic Starts Here */

  modifier onlyRewardDepositor() {
    require(msg.sender == IPolkamineAddressManager(addressManager).rewardDepositor(), "Not reward depositor");
    _;
  }

  function initialize(address _addressManager) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
  }

  /**
   * @notice Deposit reward token to distribute to the stakers
   * @param _rewardToken reward token address
   * @param _amount reward token amount
   */
  function deposit(address _rewardToken, uint256 _amount) external override onlyRewardDepositor {
    require(IERC20Upgradeable(_rewardToken).transferFrom(msg.sender, address(this), _amount), "Transfer failure");

    emit Deposit(msg.sender, _rewardToken, _amount);
  }

  /**
   * @notice Transfer the staker his reward
   * @param _pid pool index
   * @param _amount reward token amount to claim
   */
  function claim(uint256 _pid, uint256 _amount) external override nonReentrant {
    address poolManager = IPolkamineAddressManager(addressManager).poolManagerContract();

    require(_amount <= userClaimableReward(_pid), "Exceeds claim amount");

    address pool = IPolkaminePoolManager(poolManager).pools(_pid);
    address rewardToken = IPolkaminePool(pool).wToken();

    userClaimedReward[_pid][msg.sender] += _amount;
    poolClaimedReward[_pid] += _amount;
    require(IERC20Upgradeable(rewardToken).transfer(msg.sender, _amount), "Transfer failure");

    emit Claim(msg.sender, rewardToken, _amount);
  }

  /**
   * @notice Return user's claimable reward on the specific pool
   * @param _pid pool index
   * @return (uint256) user's claimable reward
   */
  function userClaimableReward(uint256 _pid) public view override returns (uint256) {
    address rewardOracle = IPolkamineAddressManager(addressManager).rewardOracleContract();

    return IPolkamineRewardOracle(rewardOracle).userReward(_pid, msg.sender) - userClaimedReward[_pid][msg.sender];
  }

  /**
   * @notice Return the claimable reward on the specific pool
   * @param _pid pool index
   * @return (uint256) claimable reward on the pool
   */
  function poolClaimableReward(uint256 _pid) public view override returns (uint256) {
    address rewardOracle = IPolkamineAddressManager(addressManager).rewardOracleContract();

    return IPolkamineRewardOracle(rewardOracle).poolReward(_pid) - poolClaimedReward[_pid];
  }
}
