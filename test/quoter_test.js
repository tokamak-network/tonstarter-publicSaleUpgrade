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

describe("Quoter test", () => {
    let chainId = 1;

    let account1, account2, account3;

    let wton,tos;
    let config;

    let quoterTest;
    let testContract;

    let wtonAmount = ethers.utils.parseUnits("1", 27);
    let wtonAmount2 = ethers.utils.parseUnits("1000", 27);

    before(async () => {
        const addresses = await getAddresses();
        account1 = await findSigner(addresses[0]);
        account2 = await findSigner(addresses[1]);
        account3 = await findSigner(addresses[2]);

        config = await getAddressInfo(chainId);
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
    })

    describe("#2. quoter test", () => {
        it("#2-1. quoter call the WTON to TOS", async () => {
            await testContract.quoterCall(wton.address,tos.address,wtonAmount);
        })
    })
})