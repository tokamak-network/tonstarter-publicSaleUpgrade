// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.16;

import "./TickMath.sol";
import "./OracleLibrary.sol";

import "hardhat/console.sol";

interface IIUniswapV3Factory {
    function getPool(address,address,uint24) external view returns (address);
}

interface IIUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

}

library LibPublicSale {
    struct UserInfoEx {
        bool join;
        uint tier;
        uint256 payAmount;
        uint256 saleAmount;
    }

    struct UserInfoOpen {
        bool join;
        uint256 depositAmount;
        uint256 payAmount;
    }

    struct UserClaim {
        bool exec;
        uint256 claimAmount;
        uint256 refundAmount;
    }

    function getQuoteAtTick(
        int24 tick,
        uint128 amountIn,
        address baseToken,
        address quoteToken
    ) public pure returns (uint256 amountOut) {
        return OracleLibrary.getQuoteAtTick(tick, amountIn, baseToken, quoteToken);
    }

    function getPoolAddress(address _wton, address _tos) public view returns(address) {
        address factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        return IIUniswapV3Factory(factory).getPool(_wton, _tos, 3000);
    }

    function getTokenOrder(address _pool) public view returns(address,address,int24) {
        address token0 = IIUniswapV3Pool(_pool).token0();
        address token1 = IIUniswapV3Pool(_pool).token1();
        (,int24 nowtick,,,,,) = IIUniswapV3Pool(_pool).slot0();
        return (token0, token1,nowtick);
    }

    function getMiniTick(int24 tickSpacings) public pure returns (int24){
        return (TickMath.MIN_TICK / tickSpacings) * tickSpacings ;
    }

    function getMaxTick(int24 tickSpacings) public pure  returns (int24){
        return (TickMath.MAX_TICK / tickSpacings) * tickSpacings ;
    }

    function acceptMinTick(int24 _tick, int24 _tickSpacings, int24 _acceptTickInterval) public pure returns (int24) {
        int24 _minTick = getMiniTick(_tickSpacings);
        int24 _acceptMinTick = _tick - (_tickSpacings * _acceptTickInterval);

        if(_minTick < _acceptMinTick) return _acceptMinTick;
        else return _minTick;
    }

    function acceptMaxTick(int24 _tick, int24 _tickSpacings, int24 _acceptTickInterval) public pure returns (int24) {
        int24 _maxTick = getMaxTick(_tickSpacings);
        int24 _acceptMinTick = _tick + (_tickSpacings * _acceptTickInterval);

        if(_maxTick < _acceptMinTick) return _maxTick;
        else return _acceptMinTick;
    }
    
    function limitPrameters(
        uint256 amountIn,
        address _pool,
        address token0,
        address token1,
        int24 acceptTickCounts
    ) public view returns  (uint256 amountOutMinimum, uint256 priceLimit, uint160 sqrtPriceX96Limit) {
        IIUniswapV3Pool pool = IIUniswapV3Pool(_pool);
        (, int24 tick,,,,,) =  pool.slot0();
        int24 _tick = tick;
        if(token0 < token1) {
            _tick = tick - acceptTickCounts * 60;
            if(_tick < TickMath.MIN_TICK ) _tick =  TickMath.MIN_TICK ;
        } else {
            _tick = tick + acceptTickCounts * 60;
            if(_tick > TickMath.MAX_TICK ) _tick =  TickMath.MAX_TICK ;
        }
        address token1_ = token1;
        address token0_ = token0;
        return (
              getQuoteAtTick(
                _tick,
                uint128(amountIn),
                token0_,
                token1_
                ),
             getQuoteAtTick(
                _tick,
                uint128(10**27),
                token0_,
                token1_
             ),
             TickMath.getSqrtRatioAtTick(_tick)
        );
    }

    function _decodeApproveData(
        bytes memory data
    ) public pure returns (uint256 approveData) {
        assembly {
            approveData := mload(add(data, 0x20))
        }
    }
}
