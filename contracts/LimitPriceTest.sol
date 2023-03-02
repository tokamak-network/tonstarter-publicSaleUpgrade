// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
pragma abicoder v2;

import "./libraries/LibPublicSale.sol";
import "hardhat/console.sol";

contract LimitPriceTest {
    
    constructor() {}

    address public quoter = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    uint24 public constant poolFee = 3000;

    function limitPrice(
        uint256 amountIn,
        address token0,
        address token1,
        int24 tick
    )   
        external
    {
        address poolAddress = LibPublicSale.getPoolAddress(token0,token1);

        (uint256 amountOutMinimum, uint256 priceLimit,)
            = LibPublicSale.limitPrameters(amountIn, poolAddress, token0, token1, tick);

        console.log("amountOutMinimum :",amountOutMinimum);
        console.log("priceLimit :",priceLimit);

    }

    function quoterCall(
        address _token0, 
        address _token1,
        uint256 _amountIn
    ) 
        external 
    {
        (bool success,bytes memory result) = address(quoter).call(
            abi.encodeWithSignature(
                "quoteExactInputSingle(address,address,uint24,uint256,uint160)", 
                _token0,_token1,poolFee,_amountIn,0
            )
        );
        uint256 amountOutMinimum = parseRevertReason(result);
        uint256 amountOutMinimum2 = amountOutMinimum * 995 / 1000;

        console.log("success :", success);
        console.log("amountOutMinimum :",amountOutMinimum);
        console.log("amountOutMinimum2:",amountOutMinimum2);
        console.log("end quoterCall");
    }


    function parseRevertReason(bytes memory reason) private pure returns (uint256) {
        if (reason.length != 32) {
            if (reason.length < 68) revert('Unexpected error');
            assembly {
                reason := add(reason, 0x04)
            }
            revert(abi.decode(reason, (string)));
        }
        return abi.decode(reason, (uint256));
    }
}