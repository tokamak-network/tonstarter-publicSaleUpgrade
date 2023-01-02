//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.16;

interface IPublicSaleProxy {
    /// @dev initialize
    function initialize(
        address _saleTokenAddress,
        address _getTokenOwner,
        address _vaultAddress
    ) external;

    /// @dev changeBasicSet
    function changeBasicSet(
        address _getTokenAddress,
        address _sTOS,
        address _wton,
        address _uniswapRouter,
        address _TOS
    ) external;

    /// @dev set Max,Min
    /// @param _min wton->tos min Percent
    /// @param _max wton->tos max Percent
    function setMaxMinPercent(
        uint256 _min,
        uint256 _max
    ) external;

    /// @dev set sTOSstandrard
    /// @param _tier1 tier1 standrard
    /// @param _tier2 tier2 standrard
    /// @param _tier3 tier3 standrard
    /// @param _tier4 tier4 standrard
    function setSTOSstandard(
        uint256 _tier1,
        uint256 _tier2,
        uint256 _tier3,
        uint256 _tier4
    ) external;

    /// @dev set delayTime
    /// @param _delay delayTime
    function setDelayTime(
        uint256 _delay
    ) external;
}
