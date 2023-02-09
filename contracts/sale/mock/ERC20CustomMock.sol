// SPDX-License-Identifier: MIT

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title ERC20CustomMock
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract ERC20CustomMock is ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10**18);
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(_msgSender(), INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 27;
    }
}
