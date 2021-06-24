//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkamineRewardDistributor.sol";
import "../interfaces/IPolkamineRewardOracle.sol";
import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkaminePool.sol";

contract PolkamineRewardDistributor is IPolkamineRewardDistributor, OwnableUpgradeable, ReentrancyGuardUpgradeable {
  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(address indexed beneficiary, address indexed rewardToken, uint256 amount);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public rewardOracle;
  address public poolManager;

  /*** Contract Logic Starts Here */

  function initialize(address _rewardOracle, address _poolManager) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();

    rewardOracle = _rewardOracle;
    poolManager = _poolManager;
  }

  function deposit(address _rewardToken, uint256 _amount) external override onlyOwner {
    require(IERC20Upgradeable(_rewardToken).transferFrom(msg.sender, address(this), _amount), "Transfer failure");

    emit Deposit(msg.sender, _rewardToken, _amount);
  }

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
