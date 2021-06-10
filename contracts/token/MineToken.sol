//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice ERC20 Token
 */

 contract MineToken is ERC20 {
     /*** Constants ***/

     uint256 TOTAL_SUPPLY = 1000000000e18;  // 1B

     /*** Storage Properties ***/

     /*** Events ***/

     /*** Contract Logic Starts Here */

     constructor() ERC20("Mine Token", "MINE") {
         _mint(msg.sender, TOTAL_SUPPLY);
     }
 }