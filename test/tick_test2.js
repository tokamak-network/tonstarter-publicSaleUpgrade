/* eslint-disable no-undef */
const chai = require("chai");
const { expect } = require("chai");

const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { time } = require("@openzeppelin/test-helpers");
const { toBN, toWei, keccak256, fromWei } = require("web3-utils");

const { getAddresses, findSigner, setupContracts } = require("./publicSale/utils");
const { ethers, network } = require("hardhat");

const {
    ICO20Contracts,
    PHASE2_ETHTOS_Staking,
    PHASE2_MINING_PERSECOND,
    HASH_PHASE2_ETHTOS_Staking,
} = require("../utils/ico_test_deploy_ethers.js");

const {
    deployedUniswapV3Contracts,
    FeeAmount,
    TICK_SPACINGS,
    getMinTick,
    getMaxTick,
    getNegativeOneTick,
    getPositiveOneMaxTick,
    encodePriceSqrt,
    getUniswapV3Pool,
    getBlock,
    mintPosition2,
    getTick,
    // getMaxLiquidityPerTick,
} = require("./publicSale/uniswap-v3/uniswap-v3-contracts");

const {getAddressInfo} = require('./config_info');

const WTON_ABI = require("../abis/WTON.json");
const TOS_ABI = require("../abis/TOS.json");

const QuoterABI = require("../abis/Quoter.json");
const swapRouterABI = require("../abis/SwapRouter.json");

async function quoteExactInputSingle(
    quoteContract,
    tokenIn,
    tokenOut,
    fee,
    amountIn
) {
    const amountOut = await quoteContract.callStatic.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        0
    );

    return amountOut;
}

async function quoteExactInput(quoteContract, path, amountIn) {
    const amountOut = await quoteContract.callStatic.quoteExactInput(
        path,
        amountIn
    );
    return amountOut;
}

describe("Tick test", () => {
    let chainId = 1;

    let account1, account2, account3;

    let wton,tos;
    let config;

    let quoterTest;
    let testContract;

    let wtonAmount = ethers.utils.parseUnits("1", 27);
    let wtonAmount2 = ethers.utils.parseUnits("5000", 27);
    let bigwtonAmount = ethers.utils.parseUnits("70000", 27);
    
    let swapWTONAmount = ethers.utils.parseUnits("1000", 27);
    
    let quoter;
    let uniswapRouter;
    let libPublicSaleContract;

    let QuoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

    let wtonhave;

    let beforeBalance, afterBalance;

    let path;
    let params;

    const FEE_SIZE = 3;
    const encodePath = (path, fees) => {
        if (path.length != fees.length + 1) {
            throw new Error("path/fee lengths do not match");
        }
        let encoded = "0x";
        for (let i = 0; i < fees.length; i++) {
            encoded += path[i].slice(2);
            encoded += fees[i].toString(16).padStart(2 * FEE_SIZE, "0");
        }
        encoded += path[path.length - 1].slice(2);
        return encoded.toLowerCase();
    };

    function getExactInputParams(recipient, path, amountIn, amountOut, deadline) {
        return {
          recipient: recipient,
          path: path,
          amountIn: amountIn,
          amountOutMinimum: amountOut,
          deadline: deadline,
        };
    }

    before(async () => {
        const addresses = await getAddresses();
        account1 = await findSigner(addresses[0]);
        account2 = await findSigner(addresses[1]);
        account3 = await findSigner(addresses[2]);

        config = await getAddressInfo(chainId);

        let wtonAccount = "0x2Db13E39eaf889A433E0CB23C38520419eC37202";

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [wtonAccount],
        });

        wtonhave = await ethers.getSigner(wtonAccount);   
    })

    describe("#1. contract setting", () => {
        it("#1-1. setting the WTON", async () => {
            wton = new ethers.Contract(config.addressinfo.wton, WTON_ABI.abi, ethers.provider );
        })

        it("#1-2. setting the TOS", async () => {
            tos = new ethers.Contract(config.addressinfo.tos, TOS_ABI.abi, ethers.provider );
        })

        it("#1-3. Deploy LibPublicSale", async () => {
            const LibPublicSale = await ethers.getContractFactory("LibPublicSale");
            libPublicSaleContract = await LibPublicSale.deploy();
        })

        it("#1-4. setting the quoter", async () => {
            quoter = new ethers.Contract(QuoterAddress, QuoterABI.abi, ethers.provider);
        })

        it("#1-5. setting the uniswapRouter", async () => {
            uniswapRouter = new ethers.Contract(config.addressinfo.swapRouter, swapRouterABI.abi, ethers.provider );
        })
    })

    describe("#2. tick & timeWeightedAverageTick check", () => {
        it("#2-1. first tick & timeWeightedAverageTick check", async () => {
            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-2. WTON->TOS swap", async () => {
            const block = await ethers.provider.getBlock('latest')
            path = encodePath(
                [config.addressinfo.wton,config.addressinfo.tos],
                [FeeAmount.MEDIUM]
            )

            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );

            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();
        })

        it("duration the time to period end", async () => {
            const block = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block.timestamp+60]);
            await ethers.provider.send('evm_mine');
        })

        it("#2-3. second tick & timeWeightedAverageTick check", async () => {
            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-4.round3 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-5.round4 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-6.round5 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-7.round6 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })
        
        it("#2-8.round7 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-9.round8 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-10.round9 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-11.round10 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-12.round11 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-13.round12 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-14.round13 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-15.round14 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-16.round15 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-17.round16 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-18.round17 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-19.round18 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-20.round19 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })

        it("#2-21.round20 : swap & check", async () => {
            const block = await ethers.provider.getBlock('latest')
            params = getExactInputParams(
                wtonhave.address,
                path,
                swapWTONAmount,
                0,
                block.timestamp+50
            );
            await wton.connect(wtonhave).approve(uniswapRouter.address,swapWTONAmount);
            let tx = await uniswapRouter.connect(wtonhave).exactInput(params);
            await tx.wait();

            const block2 = await ethers.provider.getBlock('latest')
            await ethers.provider.send('evm_setNextBlockTimestamp', [block2.timestamp+60]);
            await ethers.provider.send('evm_mine');

            let wtontosPool = await libPublicSaleContract.getPoolAddress(config.addressinfo.wton,config.addressinfo.tos);
            let tickOrder = await libPublicSaleContract.getTokenOrder(wtontosPool);
            console.log("tick :",tickOrder[2]);
            let timeWeight = await libPublicSaleContract.getTimeWeightTick(wtontosPool,120);
            console.log("timeWeight : ",timeWeight);
            let nowaccepctMaxTick = await libPublicSaleContract.acceptMaxTick(tickOrder[2],60,2);
            console.log("nowaccepctMaxTick : ",nowaccepctMaxTick);
        })
    })
})