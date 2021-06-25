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
 * @notice Distribute each staker the reward
 * @author Polkamine
 */
contract PolkamineRewardDistributor is IPolkamineRewardDistributor, ReentrancyGuardUpgradeable {
  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(address indexed beneficiary, address indexed rewardToken, uint256 amount);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  address public rewardOracle;
  address public poolManager;

  /*** Contract Logic Starts Here */

  modifier onlyRewardDepositor() {
    require(msg.sender == IPolkamineAddressManager(addressManager).rewardDepositor(), "Not reward depositor");
    _;
  }

  function initialize(
    address _addressManager,
    address _rewardOracle,
    address _poolManager
  ) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
    rewardOracle = _rewardOracle;
    poolManager = _poolManager;
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
   * @param _beneficiary staker address
   * @param _amount reward token amount to claim
   */
  function claim(
    uint256 _pid,
    address _beneficiary,
    uint256 _amount
  ) external override nonReentrant {
    uint256 remainingReward = IPolkamineRewardOracle(rewardOracle).claimableReward(_pid, _beneficiary);
    require(_amount <= remainingReward, "Exceeds claim amount");

    address pool = IPolkaminePoolManager(poolManager).pools(_pid);
    address rewardToken = IPolkaminePool(pool).wToken();
    IPolkamineRewardOracle(rewardOracle).onClaimReward(_pid, _beneficiary, _amount);
    require(IERC20Upgradeable(rewardToken).transfer(_beneficiary, _amount), "Transfer failure");

    emit Claim(_beneficiary, rewardToken, _amount);
  }
}
