// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
pragma abicoder v2;

import "hardhat/console.sol";

contract QuoterTest {
    
    constructor() {}

    address public quoter = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    uint24 public constant poolFee = 3000;

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
        uint32 test = 1000000000;
        uint256 test2 = uint256(test);

        console.log("success :", success);
        console.log("test :", test);
        console.log("test2 :", test2);
        
        console.log("amountOutMinimum :",amountOutMinimum);
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