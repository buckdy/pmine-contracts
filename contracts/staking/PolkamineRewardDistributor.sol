//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import "../interfaces/IPolkamineRewardDistributor.sol";
import "../interfaces/IPolkaminePoolManager.sol";
import "../interfaces/IPolkamineAdmin.sol";

/**
 * @title Polkamine's Reward Distributor Contract
 * @notice Distribute users the reward
 * @author Polkamine
 */
contract PolkamineRewardDistributor is IPolkamineRewardDistributor, ReentrancyGuardUpgradeable {
  using ECDSAUpgradeable for bytes32;
  using SafeERC20Upgradeable for IERC20Upgradeable;

  /*** Events ***/
  event Deposit(address indexed from, address indexed rewardToken, uint256 amount);
  event Claim(
    address indexed beneficiary,
    uint256 indexed pid,
    address indexed rewardToken,
    uint256 amount,
    uint256 _claimIndex
  );

  /*** Constants ***/

  /*** Storage Properties ***/
  address public addressManager;
  mapping(uint256 => mapping(address => uint256)) public override userClaimedReward;
  mapping(uint256 => uint256) public override poolClaimedReward;
  mapping(address => mapping(uint256 => uint256)) public userLastClaimedAt;
  uint256 public claimInterval;
  uint256 private claimIndex;
  mapping(bytes => bool) private isUsedSignature;

  /*** Contract Logic Starts Here */

  modifier onlyManager() {
    require(msg.sender == IPolkamineAdmin(addressManager).manager(), "Not polkamine manager");
    _;
  }

  modifier onlyRewardDepositor() {
    require(msg.sender == IPolkamineAdmin(addressManager).rewardDepositor(), "Not reward depositor");
    _;
  }

  modifier onlyMaintainer() {
    require(msg.sender == IPolkamineAdmin(addressManager).maintainer(), "Not maintainer");
    _;
  }

  modifier onlyUnpaused() {
    require(!IPolkamineAdmin(addressManager).paused(), "Paused");
    _;
  }

  function initialize(address _addressManager, uint256 _claimInterval) public initializer {
    __ReentrancyGuard_init();

    addressManager = _addressManager;
    claimInterval = _claimInterval;
  }

  /**
   * @notice Deposit reward token to distribute to the stakers
   * @param _rewardToken reward token address
   * @param _amount reward token amount
   */
  function deposit(address _rewardToken, uint256 _amount) external override onlyRewardDepositor onlyUnpaused {
    IERC20Upgradeable(_rewardToken).safeTransferFrom(msg.sender, address(this), _amount);

    emit Deposit(msg.sender, _rewardToken, _amount);
  }

  /**
   * @notice Transfer the staker his reward
   * @param _pid pool index
   * @param _amount token amount to claim
   * @param _claimIndex reward index
   * @param _signature message signature
   * @param _amount signature created by the user
   */
  function claim(
    uint256 _pid,
    address _rewardToken,
    uint256 _amount,
    uint256 _claimIndex,
    bytes memory _signature
  ) external override nonReentrant onlyUnpaused {
    // check signature duplication
    require(!isUsedSignature[_signature], "Already used signature");
    isUsedSignature[_signature] = true;

    // check reward index
    require(claimIndex == _claimIndex, "Invalid claim index");

    // check reward interval
    require(block.timestamp > userLastClaimedAt[msg.sender][_pid] + claimInterval, "Invalid interval");
    userLastClaimedAt[msg.sender][_pid] = block.timestamp;

    // check signer
    address maintainer = IPolkamineAdmin(addressManager).maintainer();
    bytes32 data = keccak256(abi.encodePacked(msg.sender, _pid, _rewardToken, _amount, _claimIndex));
    require(data.toEthSignedMessageHash().recover(_signature) == maintainer, "Invalid signer");

    // check pid
    address poolManager = IPolkamineAdmin(addressManager).poolManagerContract();
    require(_pid < IPolkaminePoolManager(poolManager).poolLength(), "Invalid pid");

    // check rewardToken
    (, address rewardToken) = IPolkaminePoolManager(poolManager).pools(_pid);
    require(rewardToken == _rewardToken, "Unmatched reward token");

    // transfer reward
    userClaimedReward[_pid][msg.sender] += _amount;
    poolClaimedReward[_pid] += _amount;
    require(IERC20Upgradeable(rewardToken).transfer(msg.sender, _amount), "Transfer failure");

    emit Claim(msg.sender, _pid, rewardToken, _amount, _claimIndex);
  }

  /**
   * @notice Set the interval valid between reward claim request
   */
  function setClaimInterval(uint256 _claimInterval) external override onlyManager {
    claimInterval = _claimInterval;
  }

  /**
   * @notice Set the claim index
   */
  function setClaimIndex(uint256 _claimIndex) external override onlyMaintainer {
    claimIndex = _claimIndex;
  }
}
