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

describe("Quoter test", () => {
    let chainId = 1;

    let account1, account2, account3;

    let wton,tos;
    let config;

    let quoterTest;
    let testContract;

    let wtonAmount = ethers.utils.parseUnits("1", 27);
    let wtonAmount2 = ethers.utils.parseUnits("5000", 27);
    let bigwtonAmount = ethers.utils.parseUnits("60000", 27);
    let bigwtonAmount2 = ethers.utils.parseUnits("55000", 27);
    let bigwtonAmount3 = ethers.utils.parseUnits("57000", 27);
    let bigwtonAmount4 = ethers.utils.parseUnits("58000", 27);
    let bigwtonAmount5 = ethers.utils.parseUnits("59000", 27);
    let bigwtonAmount6 = ethers.utils.parseUnits("60000", 27); //-10%
    let bigwtonAmount7 = ethers.utils.parseUnits("57500", 27);
    let bigwtonAmount8 = ethers.utils.parseUnits("269479", 27);
    let bigwtonAmount9 = ethers.utils.parseUnits("115000", 27); //-20%

    let quoter;

    let QuoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

    let wtonhave;

    let beforeBalance, afterBalance;

    let limitPriceContract;

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

        it("#1-4. setting the quoter", async () => {
            quoter = new ethers.Contract(QuoterAddress, QuoterABI.abi, ethers.provider);
        })

        it("#1-5. deploy the LibPublicSale", async () => {
            const LibPublicSale = await ethers.getContractFactory("LibPublicSale");
            libPublicSale = await LibPublicSale.deploy();
        })

        it("#1-6. Deploy LimitPriceTest", async () => {
            let priceTest = await ethers.getContractFactory("LimitPriceTest",{
                libraries: {
                    LibPublicSale: libPublicSale.address
                }
            });
            limitPriceContract = await priceTest.deploy();
        })
    })

    describe("#2. LimitPriceTest change the input WTON", () => {
        it("#2-1. limitPrice TickTest, tick is 18, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                wtonAmount,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-1")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                wtonAmount,
                0
            );
        })

        it("#2-2. limitPrice TickTest, tick is 18, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                wtonAmount,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-2")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                wtonAmount,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-3. limitPrice TickTest, tick is 36, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                wtonAmount,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-3")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                wtonAmount,
                0
            );
        })

        it("#2-4. limitPrice TickTest, tick is 36, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                wtonAmount,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-4")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                wtonAmount,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-1. limitPrice TickTest, tick is 18, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount8,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-1")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount8,
                0
            );
        })

        it("#2-2. limitPrice TickTest, tick is 18, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount8,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-2")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount8,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-3. limitPrice TickTest, tick is 36, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount8,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-3")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount8,
                0
            );
        })

        it("#2-4. limitPrice TickTest, tick is 36, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount8,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-4")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount8,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-1. limitPrice TickTest, tick is 18, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-1")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                0
            );
        })

        it("#2-2. limitPrice TickTest, tick is 18, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-2")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-3. limitPrice TickTest, tick is 36, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-3")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                0
            );
        })

        it("#2-4. limitPrice TickTest, tick is 36, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-4")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-5. limitPrice TickTest, tick is 9, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                9
            );
            console.log("#2-5")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                0
            );
        })

        it("#2-6. limitPrice TickTest, tick is 9, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount6,
                wton.address,
                tos.address,
                9
            );
            console.log("#2-6")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount6,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-1. limitPrice TickTest, tick is 18, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-1")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                0
            );
        })

        it("#2-2. limitPrice TickTest, tick is 18, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                18
            );
            console.log("#2-2")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-3. limitPrice TickTest, tick is 36, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-3")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                0
            );
        })

        it("#2-4. limitPrice TickTest, tick is 36, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                36
            );
            console.log("#2-4")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                getlimitPrice.sqrtPriceX96Limit
            );
        })

        it("#2-5. limitPrice TickTest, tick is 9, sq is 0", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                9
            );
            console.log("#2-5")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                0
            );
        })

        it("#2-6. limitPrice TickTest, tick is 9, sq is real", async () => {
            let getlimitPrice = await limitPriceContract.limitPrice(
                bigwtonAmount9,
                wton.address,
                tos.address,
                9
            );
            console.log("#2-6")
            console.log(getlimitPrice)
            console.log("TOS amount1",ethers.utils.formatUnits(getlimitPrice.amountOutMinimum, 18))
            await limitPriceContract.quoterCall(
                wton.address,
                tos.address,
                bigwtonAmount9,
                getlimitPrice.sqrtPriceX96Limit
            );
        })
    })

})