//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import "../interfaces/IPolkamineRewardDistributor.sol";
import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkaminePool.sol";
import "../interfaces/IPolkamineAddressManager.sol";

/**
 * @title Polkamine's Reward Distributor Contract
 * @notice Distribute users the reward
 * @author Polkamine
 */
contract PolkamineRewardDistributor is IPolkamineRewardDistributor, ReentrancyGuardUpgradeable {
  using ECDSAUpgradeable for bytes32;

  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(
    address indexed beneficiary,
    uint256 indexed pid,
    address indexed rewardToken,
    uint256 amount,
    uint256 _rewardIndex
  );

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(uint256 => mapping(address => uint256)) public override userClaimedReward;
  mapping(uint256 => uint256) public override poolClaimedReward;
  uint256 public rewardIndex;
  uint256 public rewardInterval;
  mapping(address => uint256) public userLastClaimedAt;
  mapping(bytes => bool) public isUsedSignature;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IPolkamineAddressManager(addressManager).manager(), "Not polkamine manager");
    _;
  }

  modifier onlyRewardDepositor() {
    require(msg.sender == IPolkamineAddressManager(addressManager).rewardDepositor(), "Not reward depositor");
    _;
  }

  modifier onlyMaintainer() {
    require(msg.sender == IPolkamineAddressManager(addressManager).maintainer(), "Not maintainer");
    _;
  }

  function initialize(address _addressManager, uint256 _rewardInterval) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
    rewardInterval = _rewardInterval;
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
   * @param _amount token amount to claim
   * @param _rewardIndex reward index
   * @param _signature message signature
   * @param _amount signature created by the user
   */
  function claim(
    uint256 _pid,
    address _wToken,
    uint256 _amount,
    uint256 _rewardIndex,
    bytes memory _signature
  ) external override nonReentrant {
    require(!isUsedSignature[_signature], "Already used signature");
    isUsedSignature[_signature] = true;

    require(_rewardIndex == rewardIndex, "Invalid reward index");

    require(block.timestamp > userLastClaimedAt[msg.sender] + rewardInterval, "Invalid interval");
    userLastClaimedAt[msg.sender] = block.timestamp;

    address maintainer = IPolkamineAddressManager(addressManager).maintainer();
    bytes32 data = keccak256(abi.encodePacked(msg.sender, _pid, _wToken, _amount, _rewardIndex));
    require(data.toEthSignedMessageHash().recover(_signature) == maintainer, "Invalid signer");

    address poolManager = IPolkamineAddressManager(addressManager).poolManagerContract();
    require(_pid < IPolkaminePoolManager(poolManager).poolLength(), "Invalid pid");

    address pool = IPolkaminePoolManager(poolManager).pools(_pid);
    address rewardToken = IPolkaminePool(pool).wToken();
    require(rewardToken == _wToken, "Unmatched reward token");

    userClaimedReward[_pid][msg.sender] += _amount;
    poolClaimedReward[_pid] += _amount;
    require(IERC20Upgradeable(rewardToken).transfer(msg.sender, _amount), "Transfer failure");

    emit Claim(msg.sender, _pid, rewardToken, _amount, _rewardIndex);
  }

  /**
   * @notice Set the interval valid between reward claim request
   */
  function setRewardInterval(uint256 _rewardInterval) external override onlyManager {
    rewardInterval = _rewardInterval;
  }

  /**
   * @notice Set the reward index
   */
  function setRewardIndex(uint256 _rewardIndex) external override onlyMaintainer {
    rewardIndex = _rewardIndex;
  }
}
