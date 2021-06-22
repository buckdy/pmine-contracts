//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../interfaces/IPolkaminePool.sol";

contract PolkaminePool is IPolkaminePool, ReentrancyGuardUpgradeable {
  /*** Events ***/
  event Stake(address user, uint256 amount, uint256 timestamp);
  event Unstake(address user, uint256 amount, uint256 timestamp);

  /*** Constants ***/

  /*** Storage Properties ***/
  address public pToken;
  mapping(address => uint256) public userStakes;

  /*** Contract Logic Starts Here */

  constructor(address _pToken) {
    __ReentrancyGuard_init();

    pToken = _pToken;
  }

  function stake(uint256 _amount) public override {
    require(IERC20Upgradeable(pToken).transferFrom(msg.sender, address(this), _amount), "Transfer failure");

    userStakes[msg.sender] = userStakes[msg.sender] + _amount;

    emit Stake(msg.sender, _amount, block.timestamp);
  }

  function unstake(uint256 _amount) public override nonReentrant {
    require(_amount <= userStakes[msg.sender], "Invalid amount");

    userStakes[msg.sender] -= _amount;
    require(IERC20Upgradeable(pToken).transfer(msg.sender, _amount), "Transfer failure");

    emit Unstake(msg.sender, _amount, block.timestamp);
  }
}
