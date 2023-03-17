// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
pragma abicoder v2;

import { OnApprove } from "./OnApprove.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./PublicSaleStorage.sol";
import "../common/ProxyAccessCommon.sol";
import "../interfaces/IPublicSale.sol";
import "../libraries/LibPublicSale.sol";

import "hardhat/console.sol";

interface IIERC20Burnable {
    function burn(uint256 amount) external ;
}

interface IIWTON {
    function swapToTON(uint256 wtonAmount) external returns (bool);
    function swapFromTON(uint256 tonAmount) external returns (bool);
}

interface IIVestingPublicFundAction {
    function funding(uint256 amount) external;
}

contract PublicSale is
    PublicSaleStorage,
    ProxyAccessCommon,
    IPublicSale
{
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    event AddedWhiteList(address indexed from, uint256 tier);
    event ExclusiveSaled(address indexed from, uint256 amount);
    event Deposited(address indexed from, uint256 amount);

    event Claimed(address indexed from, uint256 amount);
    event ExchangeSwap(address indexed from, uint256 amountIn, uint256 amountOut);
    event DepositWithdrawal(address indexed from, uint256 amount, uint256 liquidityAmount);

    event Refunded(address indexed from, uint256 amount);

    modifier nonZero(uint256 _value) {
        require(_value > 0, "PublicSale: zero");
        _;
    }

    modifier nonZeroAddress(address _addr) {
        require(_addr != address(0), "PublicSale: zero address");
        _;
    }

    modifier beforeStartAddWhiteTime() {
        require(
            startAddWhiteTime == 0 ||
                (startAddWhiteTime > 0 && block.timestamp < startAddWhiteTime),
            "PublicSale: not beforeStartAddWhiteTime"
        );
        _;
    }

    modifier beforeEndAddWhiteTime() {
        require(
            endAddWhiteTime == 0 ||
                (endAddWhiteTime > 0 && block.timestamp < endAddWhiteTime),
            "PublicSale: not beforeEndAddWhiteTime"
        );
        _;
    }

    function onApprove(
        address sender,
        address spender,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        require(msg.sender == address(getToken) || msg.sender == address(IIWTON(wton)), "PublicSale: only accept TON and WTON approve callback");
        if(msg.sender == address(getToken)) {
            uint256 wtonAmount = LibPublicSale._decodeApproveData(data);
            if(wtonAmount == 0){
                if(block.timestamp >= startExclusiveTime && block.timestamp < endExclusiveTime) {
                    _exclusiveSale(sender,amount);
                } else {
                    require(block.timestamp >= startDepositTime && block.timestamp < endDepositTime, "PublicSale: not SaleTime");
                    _deposit(sender,amount);
                }
            } else {
                uint256 totalAmount = amount + wtonAmount;
                if(block.timestamp >= startExclusiveTime && block.timestamp < endExclusiveTime) {
                    _exclusiveSale(sender,totalAmount);
                }
                else {
                    require(block.timestamp >= startDepositTime && block.timestamp < endDepositTime, "PublicSale: not SaleTime");
                    _deposit(sender,totalAmount);
                }
            }
        } else if (msg.sender == address(IIWTON(wton))) {
            uint256 wtonAmount = _toWAD(amount);
            if(block.timestamp >= startExclusiveTime && block.timestamp < endExclusiveTime) {
                _exclusiveSale(sender,wtonAmount);
            }
            else {
                require(block.timestamp >= startDepositTime && block.timestamp < endDepositTime, "PublicSale: not SaleTime");
                _deposit(sender,wtonAmount);
            }
        }

        return true;
    }

    /// @inheritdoc IPublicSale
    function changeTONOwner(
        address _address
    )
        external
        override
        onlyProxyOwner
    {
        require(getTokenOwner != _address,"PublicSale: same addr");
        getTokenOwner = _address;
    }
    
    function tickChange(
        int24 _tick
    )
        external
        onlyOwner
    {   
        require(changeTick != _tick,"PublicSale: same value");
        changeTick = _tick;
    }

    /// @inheritdoc IPublicSale
    function setAllsetting(
        uint256[8] calldata _Tier,
        uint256[6] calldata _amount,
        uint256[8] calldata _time,
        uint256[] calldata _claimTimes,
        uint256[] calldata _claimPercents
    )
        external
        override
        onlyOwner
        beforeStartAddWhiteTime
    {
        uint256 balance = saleToken.balanceOf(address(this));
        require((_amount[0] + _amount[1]) <= balance && 1 ether <= balance, "amount err");
        require(_time[6] < _claimTimes[0], "time err");
        require((deployTime + delayTime) < _time[0], "snapshot need later");
        require(_time[0] < _time[1], "whitelist before snapshot");
        require(_claimTimes.length > 0 &&  _claimTimes.length == _claimPercents.length, "need the claimSet");
        
        if(snapshot != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }

        setTier(
            _Tier[0], _Tier[1], _Tier[2], _Tier[3]
        );
        console.log("1");
        setTierPercents(
            _Tier[4], _Tier[5], _Tier[6], _Tier[7]
        );
        setAllAmount(
            _amount[0],
            _amount[1],
            _amount[2],
            _amount[3],
            _amount[4],
            _amount[5]
        );
        setExclusiveTime(
            _time[1],
            _time[2],
            _time[3],
            _time[4]
        );
        setOpenTime(
            _time[0],
            _time[5],
            _time[6]
        );
        setEachClaim(
            _time[7],
            _claimTimes,
            _claimPercents
        );
    }

    /// @inheritdoc IPublicSale
    function setExclusiveTime(
        uint256 _startAddWhiteTime,
        uint256 _endAddWhiteTime,
        uint256 _startExclusiveTime,
        uint256 _endExclusiveTime
    )
        public
        override
        onlyOwner
        nonZero(_startAddWhiteTime)
        nonZero(_endAddWhiteTime)
        nonZero(_startExclusiveTime)
        nonZero(_endExclusiveTime)
        beforeStartAddWhiteTime
    {
        if(startAddWhiteTime != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }

        require(
            (_startAddWhiteTime < _endAddWhiteTime) &&
            (_endAddWhiteTime < _startExclusiveTime) &&
            (_startExclusiveTime < _endExclusiveTime),
            "PublicSale : Round1time err"
        );
        startAddWhiteTime = _startAddWhiteTime;
        endAddWhiteTime = _endAddWhiteTime;
        startExclusiveTime = _startExclusiveTime;
        endExclusiveTime = _endExclusiveTime;
    }

    /// @inheritdoc IPublicSale
    function setOpenTime(
        uint256 _snapshot,
        uint256 _startDepositTime,
        uint256 _endDepositTime
    )
        public
        override
        onlyOwner
        nonZero(_snapshot)
        nonZero(_startDepositTime)
        nonZero(_endDepositTime)
        beforeStartAddWhiteTime
    {
         if(snapshot != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }

        require(
            (_startDepositTime < _endDepositTime),
            "PublicSale : Round2time err"
        );

        snapshot = _snapshot;
        startDepositTime = _startDepositTime;
        endDepositTime = _endDepositTime;
    }

    /// @inheritdoc IPublicSale
    function setEachClaim(
        uint256 _claimCounts,
        uint256[] calldata _claimTimes,
        uint256[] calldata _claimPercents
    )
        public
        override
        onlyOwner
        beforeStartAddWhiteTime
    {
        if(totalClaimCounts != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
            delete claimTimes;
            delete claimPercents;
        }
        
        totalClaimCounts = _claimCounts;
        uint256 i = 0;
        uint256 y = 0;
        for (i = 0; i < _claimCounts; i++) {
            claimTimes.push(_claimTimes[i]);
            if (i != 0){
                require(claimTimes[i-1] < claimTimes[i], "PublicSale: claimtime err");
            }
            y = y + _claimPercents[i];
            claimPercents.push(y);
        }

        require(y == 100, "claimPercents err");
    }

    /// @inheritdoc IPublicSale
    function setAllTier(
        uint256[4] calldata _tier,
        uint256[4] calldata _tierPercent
    ) external override onlyOwner {
        require(
            stanTier1 <= _tier[0] &&
            stanTier2 <= _tier[1] &&
            stanTier3 <= _tier[2] &&
            stanTier4 <= _tier[3],
            "tier set error"
        );
        setTier(
            _tier[0],
            _tier[1],
            _tier[2],
            _tier[3]
        );
        setTierPercents(
            _tierPercent[0],
            _tierPercent[1],
            _tierPercent[2],
            _tierPercent[3]
        );
    }

    /// @inheritdoc IPublicSale
    function setTier(
        uint256 _tier1,
        uint256 _tier2,
        uint256 _tier3,
        uint256 _tier4
    )
        public
        override
        onlyOwner
        nonZero(_tier1)
        nonZero(_tier2)
        nonZero(_tier3)
        nonZero(_tier4)
        beforeStartAddWhiteTime
    {
        if(tiers[1] != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }
        tiers[1] = _tier1;
        tiers[2] = _tier2;
        tiers[3] = _tier3;
        tiers[4] = _tier4;
    }

    /// @inheritdoc IPublicSale
    function setTierPercents(
        uint256 _tier1,
        uint256 _tier2,
        uint256 _tier3,
        uint256 _tier4
    )
        public
        override
        onlyOwner
        nonZero(_tier1)
        nonZero(_tier2)
        nonZero(_tier3)
        nonZero(_tier4)
        beforeStartAddWhiteTime
    {
        if(tiersPercents[1] != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }
        require(
            _tier1.add(_tier2).add(_tier3).add(_tier4) == 10000,
            "PublicSale: Sum should be 10000"
        );
        tiersPercents[1] = _tier1;
        tiersPercents[2] = _tier2;
        tiersPercents[3] = _tier3;
        tiersPercents[4] = _tier4;
    }

    /// @inheritdoc IPublicSale
    function setAllAmount(
        uint256 _totalExpectSaleAmount,
        uint256 _totalExpectOpenSaleAmount,
        uint256 _saleTokenPrice,
        uint256 _payTokenPrice,
        uint256 _hardcapAmount,
        uint256 _changePercent
    ) 
        public
        override 
        onlyOwner
        beforeStartAddWhiteTime 
    {
        if(totalExpectSaleAmount != 0) {
            require(isProxyAdmin(msg.sender), "only DAO can set");
        }
        require(_changePercent <= maxPer && _changePercent >= minPer,"PublicSale: need to set min,max");
        
        totalExpectSaleAmount = _totalExpectSaleAmount;
        totalExpectOpenSaleAmount = _totalExpectOpenSaleAmount;
        saleTokenPrice = _saleTokenPrice;
        payTokenPrice = _payTokenPrice;
        hardCap = _hardcapAmount;
        changeTOS = _changePercent;
        if(changeTick == 0) {
            changeTick = 18;
        }
    }

    /// @inheritdoc IPublicSale
    function totalExpectOpenSaleAmountView()
        public
        view
        override
        returns(uint256)
    {
        if (block.timestamp < endExclusiveTime) return totalExpectOpenSaleAmount;
        else return totalExpectOpenSaleAmount.add(totalRound1NonSaleAmount());
    }

    /// @inheritdoc IPublicSale
    function totalRound1NonSaleAmount()
        public
        view
        override
        returns(uint256)
    {
        return totalExpectSaleAmount.sub(totalExSaleAmount);
    }


    function _toRAY(uint256 v) internal pure returns (uint256) {
        return v * 10 ** 9;
    }

    function _toWAD(uint256 v) public override pure returns (uint256) {
        return v / 10 ** 9;
    }

    /// @inheritdoc IPublicSale
    function calculSaleToken(uint256 _amount)
        public
        view
        override
        returns (uint256)
    {
        uint256 tokenSaleAmount =
            _amount.mul(payTokenPrice).div(saleTokenPrice);
        return tokenSaleAmount;
    }

    /// @inheritdoc IPublicSale
    function calculPayToken(uint256 _amount)
        public
        view
        override
        returns (uint256)
    {
        uint256 tokenPayAmount = _amount.mul(saleTokenPrice).div(payTokenPrice);
        return tokenPayAmount;
    }

    /// @inheritdoc IPublicSale
    function calculTier(address _address)
        public
        view
        override
        nonZeroAddress(address(sTOS))
        nonZero(tiers[1])
        nonZero(tiers[2])
        nonZero(tiers[3])
        nonZero(tiers[4])
        returns (uint256)
    {
        uint256 sTOSBalance = sTOS.balanceOfAt(_address, snapshot);
        uint256 tier;
        if (sTOSBalance >= tiers[1] && sTOSBalance < tiers[2]) {
            tier = 1;
        } else if (sTOSBalance >= tiers[2] && sTOSBalance < tiers[3]) {
            tier = 2;
        } else if (sTOSBalance >= tiers[3] && sTOSBalance < tiers[4]) {
            tier = 3;
        } else if (sTOSBalance >= tiers[4]) {
            tier = 4;
        } else if (sTOSBalance < tiers[1]) {
            tier = 0;
        }
        return tier;
    }

    /// @inheritdoc IPublicSale
    function calculTierAmount(address _address)
        public
        view
        override
        returns (uint256)
    {
        LibPublicSale.UserInfoEx memory userEx = usersEx[_address];
        uint256 tier = calculTier(_address);
        if (userEx.join == true && tier > 0) {
            uint256 salePossible =
                totalExpectSaleAmount
                    .mul(tiersPercents[tier])
                    .div(tiersAccount[tier])
                    .div(10000);
            return salePossible;
        } else if (tier > 0) {
            uint256 tierAccount = tiersAccount[tier].add(1);
            uint256 salePossible =
                totalExpectSaleAmount
                    .mul(tiersPercents[tier])
                    .div(tierAccount)
                    .div(10000);
            return salePossible;
        } else {
            return 0;
        }
    }

    /// @inheritdoc IPublicSale
    function calculOpenSaleAmount(address _account, uint256 _amount)
        public
        view
        override
        returns (uint256)
    {
        uint256 depositAmount = usersOpen[_account].depositAmount.add(_amount);
        uint256 openSalePossible =
            totalExpectOpenSaleAmountView().mul(depositAmount).div(
                totalDepositAmount.add(_amount)
            );
        return openSalePossible;
    }

    function currentRound() public view returns (uint256 round) {
        if (block.timestamp >= claimTimes[totalClaimCounts-1]) {
            return totalClaimCounts;
        }
        for (uint256 i = 0; i < totalClaimCounts; i++) {
            if (block.timestamp < claimTimes[i]) {
                return i;
            }
        }
    }

    function calculClaimAmount(address _account, uint256 _round)
        public
        view
        override
        returns (uint256 _reward, uint256 _totalClaim, uint256 _refundAmount)
    {
        if (block.timestamp < startClaimTime) return (0, 0, 0);
        if (_round > totalClaimCounts) return (0, 0, 0);

        LibPublicSale.UserClaim memory userClaim = usersClaim[_account];
        (, uint256 realSaleAmount, uint256 refundAmount) = totalSaleUserAmount(_account);  

        if (realSaleAmount == 0 ) return (0, 0, 0);
        if (userClaim.claimAmount >= realSaleAmount) return (0, 0, 0);   

        uint256 round = currentRound();

        uint256 amount;
        if (totalClaimCounts == round && _round == 0) {
            amount = realSaleAmount.sub(userClaim.claimAmount);
            return (amount, realSaleAmount, refundAmount);
        }

        if(_round == 0) {
            amount = realSaleAmount.mul(claimPercents[round.sub(1)]).div(100);
            amount = amount.sub(userClaim.claimAmount);
            return (amount, realSaleAmount, refundAmount);
        } else if(_round == 1) {
            amount = realSaleAmount.mul(claimPercents[0]).div(100);
            return (amount, realSaleAmount, refundAmount);
        } else {
            uint256 roundPercent = claimPercents[_round.sub(1)].sub(claimPercents[_round.sub(2)]);
            amount = realSaleAmount.mul(roundPercent).div(100);
            return (amount, realSaleAmount, refundAmount);
        }
    }

    /// @inheritdoc IPublicSale
    function totalSaleUserAmount(address user) public override view returns (uint256 _realPayAmount, uint256 _realSaleAmount, uint256 _refundAmount) {
        LibPublicSale.UserInfoEx memory userEx = usersEx[user];

        if (userEx.join) {
            (uint256 realPayAmount, uint256 realSaleAmount, uint256 refundAmount) = openSaleUserAmount(user);
            return ( realPayAmount.add(userEx.payAmount), realSaleAmount.add(userEx.saleAmount), refundAmount);
        } else {
            return openSaleUserAmount(user);
        }
    }

    /// @inheritdoc IPublicSale
    function openSaleUserAmount(address user) public override view returns (uint256 _realPayAmount, uint256 _realSaleAmount, uint256 _refundAmount) {
        LibPublicSale.UserInfoOpen memory userOpen = usersOpen[user];

        if (!userOpen.join || userOpen.depositAmount == 0) return (0, 0, 0);

        uint256 openSalePossible = calculOpenSaleAmount(user, 0);
        uint256 realPayAmount = calculPayToken(openSalePossible);
        uint256 depositAmount = userOpen.depositAmount;
        uint256 realSaleAmount = 0;
        uint256 returnAmount = 0;

        if (realPayAmount < depositAmount) {
            returnAmount = depositAmount.sub(realPayAmount);
            realSaleAmount = calculSaleToken(realPayAmount);
        } else {
            realPayAmount = userOpen.depositAmount;
            realSaleAmount = calculSaleToken(depositAmount);
        }

        return (realPayAmount, realSaleAmount, returnAmount);
    }

    /// @inheritdoc IPublicSale
    function totalOpenSaleAmount() public override view returns (uint256){
        uint256 _calculSaleToken = calculSaleToken(totalDepositAmount);
        uint256 _totalAmount = totalExpectOpenSaleAmountView();

        if (_calculSaleToken < _totalAmount) return _calculSaleToken;
        else return _totalAmount;
    }

    /// @inheritdoc IPublicSale
    function totalOpenPurchasedAmount() public override view returns (uint256){
        uint256 _calculSaleToken = calculSaleToken(totalDepositAmount);
        uint256 _totalAmount = totalExpectOpenSaleAmountView();
        if (_calculSaleToken < _totalAmount) return totalDepositAmount;
        else return  calculPayToken(_totalAmount);
    }

    /// @inheritdoc IPublicSale
    function totalWhitelists() external view returns (uint256) {
        return whitelists.length;
    }

    /// @inheritdoc IPublicSale
    function addWhiteList() external override {
        require(
            block.timestamp >= startAddWhiteTime,
            "PublicSale: whitelistStartTime has not passed"
        );
        require(
            block.timestamp < endAddWhiteTime,
            "PublicSale: end the whitelistTime"
        );
        uint256 tier = calculTier(msg.sender);
        require(tier >= 1, "PublicSale: need to more sTOS");
        LibPublicSale.UserInfoEx storage userEx = usersEx[msg.sender];
        require(userEx.join != true, "PublicSale: already attended");

        whitelists.push(msg.sender);

        userEx.join = true;
        userEx.tier = tier;
        userEx.saleAmount = 0;
        tiersAccount[tier] = tiersAccount[tier].add(1);

        emit AddedWhiteList(msg.sender, tier);
    }

    function calculTONTransferAmount(
        uint256 _amount,
        address _sender
    )
        internal
        nonZero(_amount)
        nonZeroAddress(_sender)

    {
        uint256 tonAllowance = IERC20(getToken).allowance(_sender, address(this));
        uint256 tonBalance = IERC20(getToken).balanceOf(_sender);

        if (tonAllowance > tonBalance) {
            tonAllowance = tonBalance; //tonAllowance가 tonBlance보다 더 클때 문제가 된다.
        }
        if (tonAllowance < _amount) {
            uint256 needUserWton;
            uint256 needWton = _amount.sub(tonAllowance);
            needUserWton = _toRAY(needWton);
            require(IERC20(wton).allowance(_sender, address(this)) >= needUserWton, "PublicSale: wton exceeds allowance");
            require(IERC20(wton).balanceOf(_sender) >= needUserWton, "need more wton");
            IERC20(wton).safeTransferFrom(_sender,address(this),needUserWton);
            IIWTON(wton).swapToTON(needUserWton);
            require(tonAllowance >= _amount.sub(needWton), "PublicSale: ton exceeds allowance");
            if (_amount.sub(needWton) > 0) {
                IERC20(getToken).safeTransferFrom(_sender, address(this), _amount.sub(needWton));
            }
        } else {
            require(tonAllowance >= _amount && tonBalance >= _amount, "PublicSale: ton exceeds allowance");
            IERC20(getToken).safeTransferFrom(_sender, address(this), _amount);
        }

        if (block.timestamp < endExclusiveTime) {
            emit ExclusiveSaled(_sender, _amount);
        } else {
            emit Deposited(_sender, _amount);
        }
    }

    /// @inheritdoc IPublicSale
    function exclusiveSale(
        uint256 _amount
    )
        public
        override
    {
        _exclusiveSale(msg.sender,_amount);
    }

    
    function _exclusiveSale(
        address _sender,
        uint256 _amount
    )
        internal
        nonZero(_amount)
        nonZero(totalClaimCounts)
    {
        require(
            block.timestamp >= startExclusiveTime,
            "PublicSale: exclusiveStartTime has not passed"
        );
        require(
            block.timestamp < endExclusiveTime,
            "PublicSale: end the exclusiveTime"
        );
        LibPublicSale.UserInfoEx storage userEx = usersEx[_sender];
        require(userEx.join == true, "PublicSale: not registered in whitelist");
        uint256 tokenSaleAmount = calculSaleToken(_amount);
        uint256 salePossible = calculTierAmount(_sender);

        require(
            salePossible >= userEx.saleAmount.add(tokenSaleAmount),
            "PublicSale: just buy tier's allocated amount"
        );

        uint256 tier = calculTier(_sender);

        if(userEx.payAmount == 0) {
            totalRound1Users = totalRound1Users.add(1);
            totalUsers = totalUsers.add(1);
            tiersExAccount[tier] = tiersExAccount[tier].add(1);
        }

        userEx.payAmount = userEx.payAmount.add(_amount);
        userEx.saleAmount = userEx.saleAmount.add(tokenSaleAmount);

        totalExPurchasedAmount = totalExPurchasedAmount.add(_amount);
        totalExSaleAmount = totalExSaleAmount.add(tokenSaleAmount);

        calculTONTransferAmount(_amount, _sender);
    }

    /// @inheritdoc IPublicSale
    function deposit(
        uint256 _amount
    )   
        public
        override

    {
        _deposit(msg.sender,_amount);
    }

    function _deposit(
        address _sender,
        uint256 _amount
    )
        internal
        nonZero(_amount)
    {
        require(
            block.timestamp >= startDepositTime,
            "PublicSale: don't start depositTime"
        );
        require(
            block.timestamp < endDepositTime,
            "PublicSale: end the depositTime"
        );

        LibPublicSale.UserInfoOpen storage userOpen = usersOpen[_sender];

        if (!userOpen.join) {
            depositors.push(_sender);
            userOpen.join = true;

            totalRound2Users = totalRound2Users.add(1);
            LibPublicSale.UserInfoEx storage userEx = usersEx[_sender];
            if (userEx.payAmount == 0) totalUsers = totalUsers.add(1);
        }
        userOpen.depositAmount = userOpen.depositAmount.add(_amount);
        totalDepositAmount = totalDepositAmount.add(_amount);

        calculTONTransferAmount(_amount, _sender);
    }

    /// @inheritdoc IPublicSale
    function claim() external override {
        require(
            block.timestamp >= claimTimes[0],
            "PublicSale: don't start claimTime"
        );
        LibPublicSale.UserInfoOpen storage userOpen = usersOpen[msg.sender];
        LibPublicSale.UserClaim storage userClaim = usersClaim[msg.sender];
        uint256 hardcapcut = hardcapCalcul();
        if (hardcapcut == 0) {
            require(userClaim.exec != true, "PublicSale: already getRefund");
            LibPublicSale.UserInfoEx storage userEx = usersEx[msg.sender];
            uint256 refundTON = userEx.payAmount.add(userOpen.depositAmount);
            userClaim.exec = true;
            userClaim.refundAmount = refundTON;
            IERC20(getToken).safeTransfer(msg.sender, refundTON);

            emit Refunded(msg.sender, refundTON);
        } else {
            (uint256 reward, uint256 realSaleAmount, uint256 refundAmount) = calculClaimAmount(msg.sender, 0);
            require(
                realSaleAmount > 0,
                "PublicSale: no purchase amount"
            );
            require(reward > 0, "PublicSale: no reward");
            require(
                realSaleAmount.sub(userClaim.claimAmount) >= reward,
                "PublicSale: already getAllreward"
            );
            require(
                saleToken.balanceOf(address(this)) >= reward,
                "PublicSale: dont have saleToken in pool"
            );

            userClaim.claimAmount = userClaim.claimAmount.add(reward);

            saleToken.safeTransfer(msg.sender, reward);

            if (!userClaim.exec && userOpen.join) {
                totalRound2UsersClaim = totalRound2UsersClaim.add(1);
                userClaim.exec = true;
            }

            if (refundAmount > 0 && userClaim.refundAmount == 0){
                require(refundAmount <= IERC20(getToken).balanceOf(address(this)), "PublicSale: dont have refund ton");
                userClaim.refundAmount = refundAmount;
                IERC20(getToken).safeTransfer(msg.sender, refundAmount);

                emit Refunded(msg.sender, refundAmount);
            }

            emit Claimed(msg.sender, reward);
        }
    }

    function hardcapCalcul() public view returns (uint256){
        uint256 totalPurchaseTONamount = totalExPurchasedAmount.add(totalOpenPurchasedAmount());
        uint256 calculAmount;
        if (totalPurchaseTONamount >= hardCap) {
            return calculAmount = totalPurchaseTONamount.mul(changeTOS).div(100);
        } else {
            return 0;
        }
    }

    /// @inheritdoc IPublicSale
    function depositWithdraw() external override {
        require(adminWithdraw != true && exchangeTOS == true,"PublicSale : need the exchangeWTONtoTOS");

        uint256 liquidityTON = hardcapCalcul();
        uint256 getAmount = totalExPurchasedAmount.add(totalOpenPurchasedAmount()).sub(liquidityTON);
        
        require(getAmount <= IERC20(getToken).balanceOf(address(this)), "PublicSale: no token to receive");        

        adminWithdraw = true;

        uint256 burnAmount = totalExpectSaleAmount.add(totalExpectOpenSaleAmount).sub(totalOpenSaleAmount()).sub(totalExSaleAmount);
        if(burnAmount != 0) {
            IIERC20Burnable(address(saleToken)).burn(burnAmount);
        }
        
        IERC20(getToken).approve(address(getTokenOwner), getAmount + 10 ether);
        IIVestingPublicFundAction(getTokenOwner).funding(getAmount);

        emit DepositWithdrawal(msg.sender, getAmount, liquidityTON);
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

    function exchangeWTONtoTOS(
        uint256 amountIn
    ) 
        external
        override
    {
        require(amountIn > 0, "zero input amount");
        require(block.timestamp > endDepositTime,"PublicSale: need to end the depositTime");

        uint256 liquidityTON = hardcapCalcul();
        require(liquidityTON > 0, "PublicSale: don't pass the hardCap");

        address poolAddress = LibPublicSale.getPoolAddress(wton,address(tos));

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  IIUniswapV3Pool(poolAddress).slot0();
        require(sqrtPriceX96 > 0, "pool is not initialized");

        int24 timeWeightedAverageTick = OracleLibrary.consult(poolAddress, 120);
        require(
            tick < LibPublicSale.acceptMaxTick(timeWeightedAverageTick, 60, 2),
            "It's not allowed changed tick range."
        );

        (uint256 amountOutMinimum, , uint160 sqrtPriceLimitX96)
            = LibPublicSale.limitPrameters(amountIn, poolAddress, wton, address(tos), changeTick);

        (,bytes memory result) = address(quoter).call(
            abi.encodeWithSignature(
                "quoteExactInputSingle(address,address,uint24,uint256,uint160)", 
                wton,address(tos),poolFee,amountIn,0
            )
        );
        
        uint256 amountOutMinimum2 = parseRevertReason(result);
        amountOutMinimum2 = amountOutMinimum2 * 995 / 1000; //slippage 0.5% apply
        
        //quoter 값이 더 크다면 quoter값이 minimum값으로 사용됨
        //quoter 값이 더 작으면 priceImpact가 더크게 작용하니 거래는 실패해야함
        require(amountOutMinimum2 >= amountOutMinimum, "PublicSale : priceImpact over");
        
        uint256 wtonAmount = IERC20(wton).balanceOf(address(this));
        
        if(wtonAmount == 0 && exchangeTOS != true) {
            IIWTON(wton).swapFromTON(liquidityTON);
            exchangeTOS = true;
        } else {
            require(wtonAmount >= amountIn, "PublicSale : amountIn is too large");
        }

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: wton,
                tokenOut: address(tos),
                fee: poolFee,
                recipient: liquidityVaultAddress,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum2,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            });
        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        
        emit ExchangeSwap(msg.sender, amountIn ,amountOut);
    }
    
}