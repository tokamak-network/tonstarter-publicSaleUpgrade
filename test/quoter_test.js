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
    let bigwtonAmount = ethers.utils.parseUnits("70000", 27);

    let quoter;

    let QuoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

    let wtonhave;

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

        it("#1-3. Deploy QuoterTest Contract", async () => {
            quoterTest = await ethers.getContractFactory("QuoterTest");
            testContract = await quoterTest.deploy();
        })

        it("#1-4. setting the quoter", async () => {
            quoter = new ethers.Contract(QuoterAddress, QuoterABI.abi, ethers.provider);
        })
    })

    describe("#2. quoter test, case : testContract no have wton", () => {
        it("#2-1. testContract no have wton, quoter call the WTON to TOS", async () => {
            let checkwtonBalance = await wton.balanceOf(testContract.address);
            expect(checkwtonBalance).to.be.equal(0);
            await testContract.quoterCall(wton.address,tos.address,wtonAmount);
        })

        it("#2-2. Quoter get balance, before qutoerCall", async () => {
            const beforeBalance = await quoteExactInputSingle(
                quoter,
                wton.address,
                tos.address,
                FeeAmount.MEDIUM,
                wtonAmount
            )
            console.log("beforeBalance :",Number(beforeBalance));
        })

        it("#2-3. testContract no have wton, bigQuoterCall", async () => {
            let checkwtonBalance = await wton.balanceOf(testContract.address);
            expect(checkwtonBalance).to.be.equal(0);
            await testContract.quoterCall(wton.address,tos.address,bigwtonAmount);
        })

        it("#2-4. Quoter get balance, after qutoerCall", async () => {
            const afterBalance = await quoteExactInputSingle(
                quoter,
                wton.address,
                tos.address,
                FeeAmount.MEDIUM,
                wtonAmount
            )
            console.log("beforeBalance :",Number(afterBalance));
        })
    })

    describe("#3. qutoer test, case : testContract have wton", () => {
        it("#3-1. send the wton token", async () => {
            await wton.connect(wtonhave).transfer(testContract.address,wtonAmount2);
            let checkBlaance = await wton.balanceOf(testContract.address);
            expect(checkBlaance).to.be.equal(wtonAmount2);
        })

        it("#3-2. Quoter get balance, before qutoerCall", async () => {
            const beforeBalance = await quoteExactInputSingle(
                quoter,
                wton.address,
                tos.address,
                FeeAmount.MEDIUM,
                wtonAmount2
            )
            console.log("beforeBalance :",Number(beforeBalance));
        })

        it("#3-3. testContract have wton, don't use wton", async () => {
            await testContract.quoterCall(wton.address,tos.address,wtonAmount2);
            let checkBlaance = await wton.balanceOf(testContract.address);
            expect(checkBlaance).to.be.equal(wtonAmount2);
        })

        it("#3-4. Quoter get balance, after qutoerCall", async () => {
            const afterBalance = await quoteExactInputSingle(
                quoter,
                wton.address,
                tos.address,
                FeeAmount.MEDIUM,
                wtonAmount2
            )
            console.log("beforeBalance :",Number(afterBalance));
        })
    })
})