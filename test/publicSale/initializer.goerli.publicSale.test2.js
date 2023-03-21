/* eslint-disable no-undef */
const chai = require("chai");
const { expect } = require("chai");

const { solidity } = require("ethereum-waffle");
chai.use(solidity);

const { time } = require("@openzeppelin/test-helpers");
const { toBN, toWei, keccak256, fromWei } = require("web3-utils");

const { getAddresses, findSigner, setupContracts } = require("./utils");
const { ethers, network } = require("hardhat");

const {
    ICO20Contracts,
    PHASE2_ETHTOS_Staking,
    PHASE2_MINING_PERSECOND,
    HASH_PHASE2_ETHTOS_Staking,
} = require("../../utils/ico_test_deploy_ethers.js");

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
} = require("./uniswap-v3/uniswap-v3-contracts");

const {getAddressInfo} = require('../config_info');

// let UniswapV3Factory = require('../abis/UniswapV3Factory.json');

const PublicSale_ABI = require('../../artifacts/contracts/sale/PublicSale.sol/PublicSale.json');
const PublicSaleProxy_ABI = require('../../artifacts/contracts/sale/PublicSaleProxy.sol/PublicSaleProxy.json');
const LibPublicSale_ABI = require('../../artifacts/contracts/libraries/LibPublicSale.sol/LibPublicSale.json');
// const PublicSaleTest_ABI = require('../../artifacts/contracts/sale/PublicSaleTest.sol/PublicSaleTest.json');
// const PublicSale2_ABI = require('../../artifacts/contracts/sale/PublicSale2.sol/PublicSale2.json');
// const PublicSaleForDoM_ABI = require('../../artifacts/contracts/sale/PublicSaleForDoM.sol/PublicSaleForDoM.json');
const LiquidtyVault = require("../../abis/InitialLiquidityVaultFactory.json");
const LiquidtyVaultLogic = require("../../abis/InitialLiquidityVault.json");
const EventLog_ABI = require("../../abis/EventLog.json");

const Initializer_ABI = require("../../abis/Initializer.json");

const UniswapRouter_ABI = require("../../abis/SwapRouter.json");

const VestingFundFactory = require("../../abis/VestingPublicFundFactory.json");
const VestingFundLogic = require("../../abis/VestingPublicFund.json");

const VestingFundLogicProxy = require("../../abis/VestingPublicFundProxy.json");

const LockTOS_ABI =  require("../../abis/LockTOS.json");
const LockTOSProxy_ABI = require("../../abis/LockTOSProxy.json");

const TON_ABI = require("../../abis/TON.json");
const WTON_ABI = require("../../abis/WTON.json");

const TOS_ABI = require("../../abis/TOS.json");
const { joinSignature } = require("@ethersproject/bytes");

const zeroAddress = "0x0000000000000000000000000000000000000000";

//typeC로 세팅 업그레이드 테스트
describe("Sale", () => {
    let chainId = 5

    //mockERC20으로 doc, ton 배포함
    //시나리오
    //티어별 참여자가 여러명일때 모든 풀에 참여자가 있을때 테스트 (티어1,2,3,4에 모든 유저가 whitelist했고 exclusive했을 경우)
    //saleTokenPrice(DOC) = 12원
    //payTokenPrice(TON) = 12,000원
    //TON 10개 = DOC 10,000개  1: 1000
    //티어1 : 100 sTOS, 6%(600)     /60,000 DOC -> TON 60개 
    //티어2 : 200 sTOS, 12%(1200)   /120,000 DOC -> TON 120개
    //티어3 : 1,000 sTOS, 22%(2200) /220,000 DOC -> TON 220개
    //티어4 : 4,000 sTOS, 60%(6000) /600,000 DOC -> TON 600개
    //Round1 : 1,000,000 -> 1000개 참여면 끝 (총 1000TON 참여)
    //account1 -> 티어 1 참여 -> 60,000DOC 할당 -> TON 60개 (WTON으로 참여)
    //account2 -> 티어 2 참여 -> 120,000DOC 할당 -> TON 120개
    //account3 -> 티어 3 참여 -> 220,000DOC 할당 -> TON 220개
    //account4 -> 티어 4 참여 -> 300,000DOC 할당 -> TON 300개
    //account6 -> 티어 4 참여 -> 300,000DOC 할당 -> TON 300개
    //Round2 : 1,000,000 -> 1000개 참여면 끝 (총 500TON 참여 -> 500개 구매, 판매되지않은 token burn)
    //account1 -> 50TON 참여 -> 50,000 DOC
    //account2 -> 100TON 참여 -> 100,000 DOC
    //account3 -> 150TON참여 -> 150,000 DOC
    //account4 -> 200TON 참여 -> 200,000 DOC

    //원하는 시간에 맞춰서 정해진 수량 배분 (총 6번 실행할 것 시간은 처음 클레임 시작 후 1분 후 2분 후 3분 후 4분 후 로 테스트)
    //claimPercent1 = 30%
    //claimPercent2 = 20%
    //claimPercent3 = 20%
    //claimPercent4 = 20%
    //claimPercent5 = 10%

    //account들 총 TON창여량
    //account1 = 110TON
    //account2 = 220TON
    //account3 = 370TON
    //account4 = 500TON
    //account6 = 300TON

    //account이 받는 DOC양
    //account1 = 33,000 , 22,000 , 22,000, 22,000 , 11,000 -> 110,000 DOC
    //account2 = 66,000 , 44,000 , 44,000, 44,000 , 22,000 -> 220,000 DOC
    //account3 = 111,000 , 74,000 , 74,000, 74,000, 37,000 -> 370,000 DOC
    //account4 = 150,000 , 100,000 , 100,000, 100,000 , 50,000 -> 500,000 DOC
    //account6 = 90,000 , 60,000 , 60,000, 60,000 , 30,000 -> 300,000 DOC

    //round1 = 450,000
    //round2 = 300,000
    //round3 = 300,000
    //round4 = 300,000
    //round5 = 150,000

    //total = 1,500,000
    //burn = 500,000

    //판매자가 받을 TON양
    //총 1500TON 중 10% 제외 -> 1350TON
    let testTotalSalesAmount = ethers.utils.parseUnits("1500000", 18);


    // let claimPercent1 = 30;
    // let claimPercent2 = 20;
    // let claimPercent3 = 20;
    // let claimPercent4 = 20;
    // let claimPercent5 = 10;

    let claimPercent1 = 2;
    let claimPercent2 = 3;
    let claimPercent3 = 3;
    let claimPercent4 = 3;
    let claimPercent5 = 2;
    let claimPercent6 = 3;
    let claimPercent7 = 3;
    let claimPercent8 = 3;
    let claimPercent9 = 2;
    let claimPercent10 = 3;
    let claimPercent11 = 3;
    let claimPercent12 = 3;
    let claimPercent13 = 2;
    let claimPercent14 = 3;
    let claimPercent15 = 3;
    let claimPercent16 = 3;
    let claimPercent17 = 2;
    let claimPercent18 = 3;
    let claimPercent19 = 3;
    let claimPercent20 = 3;
    let claimPercent21 = 2;
    let claimPercent22 = 3;
    let claimPercent23 = 3;
    let claimPercent24 = 3;
    let claimPercent25 = 2;
    let claimPercent26 = 3;
    let claimPercent27 = 3;
    let claimPercent28 = 3;
    let claimPercent29 = 2;
    let claimPercent30 = 3;
    let claimPercent31 = 3;
    let claimPercent32 = 3;
    let claimPercent33 = 2;
    let claimPercent34 = 3;
    let claimPercent35 = 3;
    let claimPercent36 = 4;
    
    // let claimTime1, claimTime2, claimTime3, claimTime4, claimTime5;

    let claimTime1, claimTime2, claimTime3, claimTime4, claimTime5, claimTime6;
    let claimTime7, claimTime8, claimTime9, claimTime10, claimTime11, claimTime12;
    let claimTime13, claimTime14, claimTime15, claimTime16, claimTime17, claimTime18;
    let claimTime19, claimTime20, claimTime21, claimTime22, claimTime23, claimTime24;
    let claimTime25, claimTime26, claimTime27, claimTime28, claimTime29, claimTime30;
    let claimTime31, claimTime32, claimTime33, claimTime34, claimTime35, claimTime36;

    // let claimCounts = 5;
    let claimCounts = 36;
    
    let saleTokenPrice = 12;
    let payTokenPrice = 12000;

    let saleTokenOwner;         //doc
    let getTokenOwner;         //ton
    let tosTokenOwner;          //sTOS
    let saleOwner;              //publicContract
    let vaultAddress;
    let fundVaultAddress;
    let vaultAmount = ethers.utils.parseUnits("500000", 18);            //500,000 token -> 500 TON
    let hardcapAmount = ethers.utils.parseUnits("100", 18);     
    let changeTOS = 10;
    let minPer = 5;
    let maxPer = 10;

    let account1;
    let account2;
    let account3;
    let account4;
    let account5;
    let account6;
    let daoAccount;
    
    let ico20Contracts;
    let TokamakContractsDeployed;
    let ICOContractsDeployed;

    // let account3 = accounts[6];   
    // let account4 = accounts[7];
    let balance1, balance2, balance3;
    
    let erc20token, erc20snapToken, saleToken, getToken, tosToken, deploySale, saleContract;
    let swapRouter

    // let BN = toBN("1");
    // let basicAmount = toBN("1000");

    let basicAmount = 1000000;          //round1 판매량
    let totalSaleAmount = 1000000;      //round2 판매량
    let round1SaleAmount = ethers.utils.parseUnits("1000000", 18);
    let round2SaleAmount = ethers.utils.parseUnits("1000000", 18);
    let totalBigAmount = ethers.utils.parseUnits("2000000", 18); //round1, round2 판매량

    let account1BigTONAmount = ethers.utils.parseUnits("200", 18);
    let account1BigTONAmount2 = ethers.utils.parseUnits("60", 18);
    let account1BigWTONAmount = ethers.utils.parseUnits("60", 27);
    let account2BigTONAmount = ethers.utils.parseUnits("120", 18);
    let account2BigTONAmount2 = ethers.utils.parseUnits("100", 18);
    // let account2BigWTONAmount = ethers.utils.parseUnits("400", 27);
    let account2BigWTONAmount = ethers.utils.parseUnits("100", 27);
    let account3BigTONAmount = ethers.utils.parseUnits("520", 18);
    let account3BigTONAmount2 = ethers.utils.parseUnits("300", 18);
    let account3BigWTONAmount = ethers.utils.parseUnits("300", 27);
    let account4BigTONAmount = ethers.utils.parseUnits("1100", 18);
    let account4BigTONAmount2 = ethers.utils.parseUnits("1100", 18);
    let account4BigWTONAmount = ethers.utils.parseUnits("1100", 27);
    let account6BigTONAmount = ethers.utils.parseUnits("300", 18);

    let adminTONAmount = ethers.utils.parseUnits("50000", 18);
    let adminWTONAmount = ethers.utils.parseUnits("50000", 27);
    
    let contracthaveTON = ethers.utils.parseUnits("1500", 18);
    let getTokenOwnerHaveTON = ethers.utils.parseUnits("1350", 18);
    let contractChangeWTON1 = ethers.utils.parseUnits("100", 27);
    let contractChangeWTON2 = ethers.utils.parseUnits("50", 27);
    let contractChangeWTON3 = ethers.utils.parseUnits("150", 27);
    let contractChangeWTON4 = ethers.utils.parseUnits("1", 27);

    let refundAmount1 = ethers.utils.parseUnits("100", 18);
    let refundAmount2 = ethers.utils.parseUnits("200", 18);
    let refundAmount3 = ethers.utils.parseUnits("300", 18);
    let refundAmount4 = ethers.utils.parseUnits("400", 18);

    let setSnapshot;
    let blocktime;
    let whitelistStartTime;
    let whitelistEndTime;
    let exclusiveStartTime;
    let exclusiveEndTime;
    let depositStartTime;
    let depositEndTime;
    let openSaleStartTime;
    let openSaleEndTime;
    let claimStartTime;

    let claimInterval = 86400;  //86400은 하루
    let claimPeriod = 6;
    let claimTestTime;
    let claimFirst = 50;

    let tos, ton, wton, lockTOS, lockTOSImpl, lockTOSProxy ;
    let epochUnit, maxTime;
    const name = "TONStarter";
    const symbol = "TOS";
    const version = "1.0";
    // const tosAmount = ethers.BigNumber.from('100000000000000000000');
    const tosAmount = 100000000000;
    const admintosAmount = 100000000000 * 10;
    const tosuniAmount = ethers.utils.parseUnits("1000000", 18);
    const wtonuniAmount = ethers.utils.parseUnits("1000000", 27);
    let deployer, user1, user2;
    let defaultSender;
    let userLockInfo = [];
    let account1Before, account1After;
    let account2Before, account2After;
    let account3Before, account3After;
    let account4Before, account4After;
    let publicFactory;
    let deploySaleImpl;
    let deploySaleImpl2;
    let libPublicSale;
    let libPublicSaleContract;
    let libPublicSale2;
    let uniswapRouter;
    let testTemp;
    let wtonTosPool;
    let initialliquidityVault;
    let initialVaultFactory;
    let initialVaultLogic;

    let initializerAddress;
    let initializerContract;

    let publicProxy;

    let vestingPublicFundLogic;
    let vestingPublicFundFactory;

    let initialLiquidityContract;

    let tosWtonPoolAddress;

    let addressVault;
    let eventLogAddress;

    let upgradeAdmin;

    let deployTime;

    let config;

    let manymoney;
    let manymoney2;

    let vestingClaimTimes;
    let vestingClaimAmounts;

    let publicClaimTimes;
    let publicClaimPercents;
    let publicStos;
    let publicSetAmounts;
    let publicSetTimes;

    let tester1 = {
        account: null,
        lockTOSIds: [],
        balanceOf: 0,
        snapshot: 0,
        balanceOfAt: 0,
        wtonAmount: null,
        tonAmount: null
    }
    let tester2 = {
        account: null,
        lockTOSIds: [],
        balanceOf: 0,
        snapshot: 0,
        balanceOfAt: 0,
        wtonAmount: null,
        tonAmount: null
    }

    let tester3 = {
        account: null,
        lockTOSIds: [],
        balanceOf: 0,
        snapshot: 0,
        balanceOfAt: 0,
        wtonAmount: null,
        tonAmount: null
    }

    let tester4 = {
        account: null,
        lockTOSIds: [],
        balanceOf: 0,
        snapshot: 0,
        balanceOfAt: 0,
        wtonAmount: null,
        tonAmount: null
    }

    let tester6 = {
        account: null,
        lockTOSIds: [],
        balanceOf: 0,
        snapshot: 0,
        balanceOfAt: 0,
        wtonAmount: null,
        tonAmount: null
    }

    let saleContracts = [
        {
         name : "Test1",
         owner : null,
         contractAddress: null,
         index : null,
  
        },
        {
         name : "Test2",
         owner : null,
         contractAddress: null,
         index : null
        },
        {
         name : "Test3",
         owner : null,
         contractAddress: null,
         index : null
        },
    ]
    
    // let uniswapInfo = {
    //     poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    //     npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    //     swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    //     wethUsdcPool: "",
    //     wtonWethPool: "0x9EF32Ae2acAF105557DB0E98E68c6CD4f1A1aE63",
    //     wtonTosPool: "0x8DF54aDA313293E80634f981820969BE7542CEe9",
    //     tosethPool: "0x3b466f5d9b49aedd65f6124d5986a9f30b1f5442",
    //     wton: "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6",
    //     tos: "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9",
    //     weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    //     usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    //     fee: ethers.BigNumber.from("3000"),
    //     NonfungibleTokenPositionDescriptor:"0x91ae842A5Ffd8d12023116943e72A606179294f3",
    //     UniswapV3Staker: "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65",
    //     ton: "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00",
    //     lockTOSaddr: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79",
    //     Quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    //     aura: "0x80Eea029B5Cdb8A215Ae78e20B4fF81607F44A38",
    //     lyda: "0x51C5E2D3dc8Ee66Dffdb1747dEB20d6b326E8bF2",
    //     doc: "0x020A7c41212057B2A880191c07F7c7C7a71a8b57"
    // }
    

    // let lockTOSAddress = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568";
    // let tonAddress = "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00";

    let price = {
        tos: ethers.BigNumber.from("1000"),
        projectToken:  ethers.BigNumber.from("100"),
        totalAllocatedAmount: ethers.BigNumber.from("10000"),
        initSqrtPrice: ethers.BigNumber.from("1686184204767588883554408884792865"),
        initTick: 0,
        targetPriceInterval: 1,
        targetInterval: 1,
        tickPrice: 0
    }

    let vaultInfo = {
        name: "test",
        contractAddress: null,
        allocateToken: null,
        admin : null,
        totalAllocatedAmount: null,
        claimCounts: ethers.BigNumber.from("3"),
        claimTimes: [],
        claimIntervalSeconds : 60*60*24,
        claimAmounts: [],
        totalClaimsAmount: ethers.BigNumber.from("0")
    }

    let initializeCalls = {
        vestingVault: "",
        publicSaleVault: "",
    }

    before(async () => {
        ico20Contracts = new ICO20Contracts();

        const addresses = await getAddresses();
        defaultSender = addresses[0];
        saleTokenOwner = await findSigner(addresses[0]);
        getTokenOwner = await findSigner(addresses[1]);
        tosTokenOwner = await findSigner(addresses[2]);
        saleOwner = await findSigner(addresses[3]);
        account1 = await findSigner(addresses[4]);
        account2 = await findSigner(addresses[5]);
        account3 = await findSigner(addresses[6]);
        account4 = await findSigner(addresses[7]);
        account5 = await findSigner(addresses[8]);
        account6 = await findSigner(addresses[9]);
        vaultAddress = await findSigner(addresses[10]);
        // uniswapRouter = await findSigner(addresses[11]);
        testTemp = await findSigner(addresses[11]); 
        daoAccount = await findSigner(addresses[12]);
        upgradeAdmin = await findSigner(addresses[13]);

        // //goerli
        // let testAccount = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea"
        // let testAccount2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea"

        // //mainnet
        // let testAccount = "0x340C44089bc45F86060922d2d89eFee9e0CDF5c7"
        // let testAccount2 = "0x2Db13E39eaf889A433E0CB23C38520419eC37202"

        let testAccount
        let testAccount2


        if(chainId == 1) {
            testAccount = "0x340C44089bc45F86060922d2d89eFee9e0CDF5c7"
            testAccount2 = "0x2Db13E39eaf889A433E0CB23C38520419eC37202"
        } else if(chainId == 5) {
            testAccount = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea"
            testAccount2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea"
        }
        
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [testAccount],
        });

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [testAccount2],
        });

        manymoney = await ethers.getSigner(testAccount);
        manymoney2 = await ethers.getSigner(testAccount2);

        saleContracts[0].owner = saleOwner;
        saleContracts[1].owner = saleTokenOwner;
        saleContracts[2].owner = account2;

        deployer = saleTokenOwner;
        tester1.account = account1;
        tester2.account = account2;
        tester3.account = account3;
        tester4.account = account4;
        tester6.account = account6;
        
        // for sTOS
        epochUnit = 60*60*1;  // 1시간
        maxTime = epochUnit * 156;
        // let lockTosAdmin = 0x5b6e72248b19F2c5b88A4511A6994AD101d0c287;
        // await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);

        // let _lockTosAdmin = await ethers.getSigner(lockTosAdmin);

        // manymoney = 0x340C44089bc45F86060922d2d89eFee9e0CDF5c7;
        // await hre.ethers.provider.send("hardhat_impersonateAccount",[manymoney]);

        config = await getAddressInfo(chainId);
    });

    describe("#1 .setting the TON, WTON, LockTOS, SaleToken, eventLog", () => {
        //saleToken Deploy
        it("#1-1. Initialize Sale Token", async function () {
            erc20token = await ethers.getContractFactory("ERC20Mock");
            saleToken = await erc20token.connect(saleTokenOwner).deploy("testDoM", "AURA");
        })

        it("#1-2. setting the TON", async () => {
            ton = new ethers.Contract( config.addressinfo.ton, TON_ABI.abi, ethers.provider );
            
            // ton = await (
            //     await ethers.getContractFactory(
            //         TON_ABI.abi,
            //         TON_ABI.bytecode
            //     )
            // ).connect(saleTokenOwner).deploy();
            // await ton.deployed();
            // await ton.connect(saleTokenOwner).mint(saleTokenOwner.address,adminTONAmount);
        })

        it("#1-3. setting the WTON", async () => {
            wton = new ethers.Contract(config.addressinfo.wton, WTON_ABI.abi, ethers.provider );
            
            // wton = await (
            //     await ethers.getContractFactory(
            //         WTON_ABI.abi,
            //         WTON_ABI.bytecode
            //     )
            // ).connect(saleTokenOwner).deploy(ton.address);
            // await wton.deployed();
            // await wton.connect(saleTokenOwner).mint(saleTokenOwner.address,adminWTONAmount);
        })

        it("#1-4. setting the TOS", async () => {
            tos = new ethers.Contract(config.addressinfo.tos, TOS_ABI.abi, ethers.provider );
            
            // tos = await (
            //     await ethers.getContractFactory(
            //         TOS_ABI.abi,
            //         TOS_ABI.bytecode
            //     )
            // ).connect(saleTokenOwner).deploy("TONStarter","TOS",1);
            // await tos.deployed();
            // await tos.connect(saleTokenOwner).mint(saleTokenOwner.address,admintosAmount);
        })

        it("#1-5. Deploy LockTOS", async function () {
            lockTOSImpl = await (
                await ethers.getContractFactory(
                    LockTOS_ABI.abi,
                    LockTOS_ABI.bytecode
                )
            ).deploy();
            await lockTOSImpl.deployed();

            lockTOSProxy = await (
                await ethers.getContractFactory(
                    LockTOSProxy_ABI.abi,
                    LockTOSProxy_ABI.bytecode
                )
            ).deploy(lockTOSImpl.address, deployer.address);
            await lockTOSProxy.deployed();

            await (
                await lockTOSProxy.initialize(tos.address, epochUnit, maxTime)
            ).wait();

            lockTOS = new ethers.Contract( lockTOSProxy.address, LockTOS_ABI.abi, ethers.provider );
        });

        it("#1-6. Deploy the eventLog", async () => {
            const contract = await (
                await ethers.getContractFactory(
                    EventLog_ABI.abi,
                    EventLog_ABI.bytecode
                )
            ).deploy();
            await contract.deployed();
            // let tx = await contract.deployed();
            eventLogAddress = contract.address;
        })

        it("#1-7. Deploy the uniswapRouter", async () => {
            uniswapRouter = new ethers.Contract(config.addressinfo.swapRouter, UniswapRouter_ABI.abi, ethers.provider );
        })
        
        it("#1-8. Deploy the Initializer", async () => {
            initializerContract = await (
                await ethers.getContractFactory(
                    Initializer_ABI.abi,
                    Initializer_ABI.bytecode
                )
            ).deploy();
            await initializerContract.deployed();
            // let tx = await contract.deployed();
            initializerAddress = initializerContract.address;
            console.log("initializerAddress :",initializerAddress);
        })

        describe("1-9. Deploy VestingPublicFundFactory & setLogic", () => {
            it("#1-9-1. deploy VestingPublicFundFactory", async () => {
                const contract = await (
                    await ethers.getContractFactory(
                        VestingFundFactory.abi,
                        VestingFundFactory.bytecode
                    )
                ).deploy();
    
                await contract.deployed();
                vestingPublicFundFactory = await ethers.getContractAt(VestingFundFactory.abi,contract.address);
                let code = await ethers.provider.getCode(vestingPublicFundFactory.address);
                expect(code).to.not.eq("0x"); 
            })
    
            it("#1-9-2. deploy VestingPublicFundLogic", async () => {
                const contract = await (
                    await ethers.getContractFactory(
                        VestingFundLogic.abi,
                        VestingFundLogic.bytecode
                    )
                ).deploy();
    
                await contract.deployed();
                vestingPublicFundLogic = await ethers.getContractAt(VestingFundLogic.abi,contract.address);
                let code = await ethers.provider.getCode(vestingPublicFundLogic.address);
                expect(code).to.not.eq("0x"); 
            })
    
            it("#1-9-3. set logic", async () => {
                await vestingPublicFundFactory.connect(deployer).setLogic(vestingPublicFundLogic.address);
    
                expect(await vestingPublicFundFactory.vaultLogic()).to.be.eq(vestingPublicFundLogic.address);
            })

            it("#1-9-4. setUpgradeAdmin ", async () => {
                await vestingPublicFundFactory.connect(deployer).setUpgradeAdmin(upgradeAdmin.address);
                expect(await vestingPublicFundFactory.upgradeAdmin()).to.be.eq(upgradeAdmin.address);
            });
    
            it("#1-9-5. setBaseInfo : when not admin, fail ", async () => {
                await vestingPublicFundFactory.connect(deployer).setBaseInfo(
                    [
                        ton.address,
                        tos.address, 
                        saleTokenOwner.address,
                        config.addressinfo.poolfactory,
                        initializerAddress
                    ]
                );
                expect(await vestingPublicFundFactory.token()).to.be.eq(ton.address);
                expect(await vestingPublicFundFactory.daoAddress()).to.be.eq(saleTokenOwner.address);
                expect(await vestingPublicFundFactory.initializer()).to.be.eq(initializerAddress);
                let check = await vestingPublicFundFactory.initializer()
                console.log("check Address : ", check);
            });

            it("#1-9-6. setLogEventAddress   ", async () => {
                await vestingPublicFundFactory.connect(deployer).setLogEventAddress(eventLogAddress);
                expect(await vestingPublicFundFactory.logEventAddress()).to.be.eq(eventLogAddress);
            });

            it("#1-9-7. create : vestingPublicFundProxy", async () => {
                let tx = await vestingPublicFundFactory.connect(deployer).create(
                    vaultInfo.name,
                    getTokenOwner.address
                );
                vaultInfo.admin = saleTokenOwner;
    
                const receipt = await tx.wait();
                let _function ="CreatedVestingPublicFund(address,string)";
                let interface = vestingPublicFundFactory.interface;
    
                for(let i=0; i< receipt.events.length; i++){
                    if(receipt.events[i].topics[0] == interface.getEventTopic(_function)){
                        let data = receipt.events[i].data;
                        let topics = receipt.events[i].topics;
                        let log = interface.parseLog(
                        {  data,  topics } );
                        fundVaultAddress = log.args.contractAddress;
                        vaultInfo.contractAddress = fundVaultAddress;
                    }
                }
    
                expect(await vestingPublicFundFactory.totalCreatedContracts()).to.be.eq(1);
                expect((await vestingPublicFundFactory.getContracts(0)).contractAddress).to.be.eq(fundVaultAddress);
                expect((await vestingPublicFundFactory.lastestCreated()).contractAddress).to.be.eq(fundVaultAddress);
    
                // let VaultContract = await ethers.getContractAt("VestingPublicFundProxy", fundVaultAddress);
                let VaultContract = await ethers.getContractAt(VestingFundLogicProxy.abi, fundVaultAddress);
                // let VaultContract = new ethers.Contract( fundVaultAddress, VestingFundProxy.abi, ethers.provider );
                vestingPublicFundProxy = VaultContract;
    
                vestingPublicFund = await ethers.getContractAt(VestingFundLogic.abi, fundVaultAddress);
    
                expect(await VaultContract.isProxyAdmin(upgradeAdmin.address)).to.be.eq(true);
                expect(await VaultContract.isProxyAdmin(vaultInfo.admin.address)).to.be.eq(false);
    
                expect(await VaultContract.isAdmin(vaultInfo.admin.address)).to.be.eq(true);
                expect(await VaultContract.isAdmin(upgradeAdmin.address)).to.be.eq(true);
                expect(await VaultContract.isAdmin(initializerAddress)).to.be.eq(true);
    
                expect(await vestingPublicFundFactory.token()).to.be.eq(await vestingPublicFundProxy.token());
                expect(getTokenOwner.address).to.be.eq(await vestingPublicFundProxy.receivedAddress());
            })
        })
    })

    describe("#2. initial LiquidityVault deploy & setting", () => {
        it("#2-1. deploy initialLiquidityFactory", async () => {
            const contract = await (
                await ethers.getContractFactory(
                    LiquidtyVault.abi,
                    LiquidtyVault.bytecode
                )
            ).deploy();

            await contract.deployed();
            initialVaultFactory = await ethers.getContractAt(LiquidtyVault.abi, contract.address);
            let code = await ethers.provider.getCode(initialVaultFactory.address);
            expect(code).to.not.eq("0x");
        })

        it("#2-2. deploy initialLiquidityLogic", async () => {
            const contract = await (
                await ethers.getContractFactory(
                    LiquidtyVaultLogic.abi,
                    LiquidtyVaultLogic.bytecode
                )
            ).deploy();

            await contract.deployed();
            initialVaultLogic = await ethers.getContractAt(LiquidtyVaultLogic.abi, contract.address);
            let code = await ethers.provider.getCode(initialVaultLogic.address);
            expect(code).to.not.eq("0x");
        })

        it("#2-3. setLogic caller is not admin", async () => {
            await expect(
                initialVaultFactory.connect(account1).setLogic(initialVaultLogic.address)
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        })

        it("#2-4. setLogic caller is admin", async () => {
            await initialVaultFactory.connect(saleTokenOwner).setLogic(initialVaultLogic.address);

            expect(await initialVaultFactory.vaultLogic()).to.be.eq(initialVaultLogic.address);
        })

        it("#2-5. setUpgradeAdmin caller is not admin", async () => {
            await expect(
                initialVaultFactory.connect(account1).setUpgradeAdmin(upgradeAdmin.address)
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("#2-6. setUpgradeAdmin caller is admin", async () => {
            await initialVaultFactory.connect(saleTokenOwner).setUpgradeAdmin(upgradeAdmin.address);
            expect(await initialVaultFactory.upgradeAdmin()).to.be.eq(upgradeAdmin.address);
        });

        it("#2-7. setLogEventAddress caller is admin", async () => {
            await initialVaultFactory.connect(saleTokenOwner).setLogEventAddress(eventLogAddress);
            expect(await initialVaultFactory.logEventAddress()).to.be.eq(eventLogAddress);
        });

        it("#2-7. setUniswapInfoNTokens caller is not admin ", async () => {
            await expect(
                initialVaultFactory.connect(account1).setUniswapInfoNTokens(
                    [config.addressinfo.poolfactory,
                    config.addressinfo.npm ],
                    tos.address,
                    ethers.BigNumber.from("3000")
                )
            ).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("#2-8. setUniswapInfoNTokens caller is admin", async () => {
            await initialVaultFactory.connect(saleTokenOwner).setUniswapInfoNTokens(
                [config.addressinfo.poolfactory,
                config.addressinfo.npm],
                tos.address,
                ethers.BigNumber.from("3000")
            );
            expect(await initialVaultFactory.uniswapV3Factory()).to.be.eq(config.addressinfo.poolfactory);
            expect(await initialVaultFactory.nonfungiblePositionManager()).to.be.eq(config.addressinfo.npm);
            expect(await initialVaultFactory.tos()).to.be.eq(tos.address);
            expect(await initialVaultFactory.fee()).to.be.eq(ethers.BigNumber.from("3000"));
        });

        it("#2-9. create the InitialLiquidityFactory", async () => {
            let tx = await initialVaultFactory.create(
                "ABCD",
                saleToken.address,
                tosTokenOwner.address,
                price.tos,
                price.projectToken
            );

            const receipt = await tx.wait();
            let _function ="CreatedInitialLiquidityVault(address, string)";
            let interface = initialVaultFactory.interface;
            let tokenId = null;
            for(let i=0; i< receipt.events.length; i++){
                if(receipt.events[i].topics[0] == interface.getEventTopic(_function)){
                    let data = receipt.events[i].data;
                    let topics = receipt.events[i].topics;
                    let log = interface.parseLog(
                    {  data,  topics } );
                    vaultAddress = log.args.contractAddress;
                }
            }

            expect(await initialVaultFactory.totalCreatedContracts()).to.be.eq(1);
            expect((await initialVaultFactory.getContracts(0)).contractAddress).to.be.eq(vaultAddress);
            expect((await initialVaultFactory.lastestCreated()).contractAddress).to.be.eq(vaultAddress);
        })

        it("#2-10. create2 the InitialLiquidityFactory", async () => {
            let tx = await initialVaultFactory.create(
                "ABC",
                saleToken.address,
                tosTokenOwner.address,
                price.tos,
                price.projectToken
            );

            const receipt = await tx.wait();
            let _function ="CreatedInitialLiquidityVault(address, string)";
            let interface = initialVaultFactory.interface;
            let tokenId = null;
            for(let i=0; i< receipt.events.length; i++){
                if(receipt.events[i].topics[0] == interface.getEventTopic(_function)){
                    let data = receipt.events[i].data;
                    let topics = receipt.events[i].topics;
                    let log = interface.parseLog(
                    {  data,  topics } );
                    vaultAddress = log.args.contractAddress;
                }
            }
            initialLiquidityContract = await ethers.getContractAt(LiquidtyVaultLogic.abi, vaultAddress);

            expect(await initialVaultFactory.totalCreatedContracts()).to.be.eq(2);
            expect((await initialVaultFactory.getContracts(1)).contractAddress).to.be.eq(vaultAddress);
            // let tx2 = await initialVaultFactory.getContracts(1);
            // console.log(tx2);
            expect((await initialVaultFactory.lastestCreated()).contractAddress).to.be.eq(vaultAddress);
        })

        // it("#2-11. initialize : LiquidityContract initialize")
    })

    describe("#3. Initialize PublicSaleProxyFactroy and PublicSale", () => {
        //funding Token set(TON)
        it("#3-1. Initialize Funding Token", async function () {
            getToken = ton;
        });

        it("#3-2. deploy PublicSlaeFactory", async () => {
            const PublicSaleProxyFactory = await ethers.getContractFactory("PublicSaleProxyFactory");

            publicFactory = await PublicSaleProxyFactory.connect(saleTokenOwner).deploy();

            let code = await saleTokenOwner.provider.getCode(publicFactory.address);
            expect(code).to.not.eq("0x");
        })

        it("#3-3. Deploy the LibPublicSale", async () => {
            const LibPublicSale = await ethers.getContractFactory("LibPublicSale");
            libPublicSale = await LibPublicSale.connect(saleOwner).deploy();
            libPublicSaleContract = new ethers.Contract(libPublicSale.address, LibPublicSale_ABI.abi, ethers.provider);
        })

        it("#3-4. Initialize PublicSale", async function () {
            let PublicSale = await ethers.getContractFactory("PublicSale",{
                libraries: {
                    LibPublicSale: libPublicSale.address
                }
            });
            deploySaleImpl = await PublicSale.connect(saleOwner).deploy();

            let code = await saleOwner.provider.getCode(deploySaleImpl.address);
            expect(code).to.not.eq("0x");
        });

        it("#3-6. setting the Proxy basicSet from not admin", async () => {
            await expect(publicFactory.connect(account1).basicSet(
                [
                    getToken.address,
                    wton.address,
                    lockTOS.address,
                    tos.address,
                    config.addressinfo.swapRouter,
                    deploySaleImpl.address
                ]
            )).to.be.revertedWith("Accessible: Caller is not an admin");
        });

        it("#3-7. setting the Proxy basicSet from admin", async () => {
            await publicFactory.connect(saleTokenOwner).basicSet(
                [
                    getToken.address,
                    wton.address,
                    lockTOS.address,
                    tos.address,
                    config.addressinfo.swapRouter,
                    deploySaleImpl.address
                ]
            )

            let tx = await publicFactory.publicLogic();
            expect(tx).to.be.equal(deploySaleImpl.address);
        });
        
        it("#3-9. set allset from admin", async () => {
            await publicFactory.connect(saleTokenOwner).allSet(
                [
                    upgradeAdmin.address,
                    initialVaultFactory.address,
                    eventLogAddress,
                    initializerAddress
                ],
                [
                    minPer,
                    maxPer,
                    100,
                    200,
                    1000,
                    4000,
                    600
                ]
            );
            expect(await publicFactory.initializerAddress()).to.be.equal(initializerAddress);
        })


        it("#3-10. deploy PublicSaleProxy from Factory but not match the liquidtyAddress", async () => {
            let publicSaleContract = saleContracts[1];
            await expect(publicFactory.connect(account2).create(
                publicSaleContract.name,
                publicSaleContract.owner.address,
                [
                    saleToken.address,
                    fundVaultAddress,
                    vaultAddress,
                ],
                0
            )).to.be.revertedWith("another liquidityVault");
        })

        it("#3-11. deploy PublicSaleProxy from Factory", async () => {
            let publicSaleContract = saleContracts[1];
            let prevTotalCreatedContracts = await publicFactory.totalCreatedContracts();

            await publicFactory.connect(account2).create(
                publicSaleContract.name,
                publicSaleContract.owner.address,
                [
                    saleToken.address,
                    fundVaultAddress,
                    vaultAddress,
                ],
                1
            );
        
            let afterTotalCreatedContracts = await publicFactory.totalCreatedContracts();
        
            publicSaleContract.index = prevTotalCreatedContracts;
            expect(afterTotalCreatedContracts).to.be.equal(prevTotalCreatedContracts.add(1));
        
            let info = await publicFactory.connect(saleOwner).getContracts(publicSaleContract.index);
            expect(info.name).to.be.equal(publicSaleContract.name);
            publicSaleContract.contractAddress = info.contractAddress;

            saleContract = new ethers.Contract( publicSaleContract.contractAddress, PublicSale_ABI.abi, ethers.provider );
            publicProxy = new ethers.Contract( publicSaleContract.contractAddress, PublicSaleProxy_ABI.abi, ethers.provider );
            let deployTime1 = await saleContract.deployTime();
            // console.log(Number(deployTime1))
            deployTime = Number(await time.latest())
            // console.log(deployTime)
            expect(deployTime1).to.be.equal(deployTime);
            expect(await saleContract.isAdmin(account2.address)).to.be.equal(false);
            expect(await saleContract.isAdmin(saleTokenOwner.address)).to.be.equal(true);
            expect(await saleContract.isAdmin(upgradeAdmin.address)).to.be.equal(true);
            expect(await saleContract.isProxyAdmin(upgradeAdmin.address)).to.be.equal(true);
            expect(await saleContract.isAdmin(publicSaleContract.owner.address)).to.be.equal(true);
            expect(await saleContract.isAdmin(initializerAddress)).to.be.equal(true);
            //2,000,000의 판매량
            await saleToken.connect(saleTokenOwner).transfer(saleContract.address, totalBigAmount)
            
            //account1 = WTON 60, TON 200
            //account2 = WTON 400, TON 120
            //account3 = WTON 300, TON 520
            //account4 = WTON 0, TON 1100
            //account6 = WTON 0, TON 300
            // await getToken.connect(saleTokenOwner).mint(account1.address, account1BigTONAmount)
            // await wton.connect(saleTokenOwner).transfer(account1.address, account1BigWTONAmount)    

            // await getToken.connect(saleTokenOwner).transfer(account2.address, account2BigTONAmount)
            // await wton.connect(saleTokenOwner).transfer(account2.address, account2BigWTONAmount)

            // await getToken.connect(saleTokenOwner).transfer(account3.address, account3BigTONAmount)
            // await wton.connect(saleTokenOwner).transfer(account3.address, account3BigWTONAmount)

            // await getToken.connect(saleTokenOwner).transfer(account4.address, account4BigTONAmount)

            // await getToken.connect(saleTokenOwner).transfer(account6.address, account6BigTONAmount)
        });

        it("#3-12. transfer TON,WTON", async () => {
            //account1 = WTON 60, TON 200
            //account2 = WTON 400, TON 120
            //account3 = WTON 300, TON 520
            //account4 = WTON 0, TON 1100
            //account6 = WTON 0, TON 300
            await getToken.connect(manymoney).transfer(account1.address, account1BigTONAmount)
            await wton.connect(manymoney2).transfer(account1.address, account1BigWTONAmount)    

            await getToken.connect(manymoney).transfer(account2.address, account2BigTONAmount)
            await wton.connect(manymoney2).transfer(account2.address, account2BigWTONAmount)

            await getToken.connect(manymoney).transfer(account3.address, account3BigTONAmount)
            await wton.connect(manymoney2).transfer(account3.address, account3BigWTONAmount)

            await getToken.connect(manymoney).transfer(account4.address, account4BigTONAmount)
            await getToken.connect(manymoney).transfer(account6.address, account6BigTONAmount)
        })

        it("duration the time", async () => {
            await ethers.provider.send('evm_setNextBlockTimestamp', [deployTime + 600]);
            await ethers.provider.send('evm_mine');
        })

        it("#3-12. transfer tos", async () => {
            // await tos.connect(deployer).transfer(tester1.account.address, tosAmount);
            // await tos.connect(deployer).transfer(tester2.account.address, tosAmount);
            // await tos.connect(deployer).transfer(tester3.account.address, tosAmount);
            // await tos.connect(deployer).transfer(tester4.account.address, tosAmount);
            // await tos.connect(deployer).transfer(tester6.account.address, tosAmount);
            await tos.connect(manymoney).transfer(tester1.account.address, tosAmount);
            await tos.connect(manymoney).transfer(tester2.account.address, tosAmount);
            await tos.connect(manymoney).transfer(tester3.account.address, tosAmount);
            await tos.connect(manymoney).transfer(tester4.account.address, tosAmount);
            await tos.connect(manymoney).transfer(tester6.account.address, tosAmount);
        })

        it("#3-13. should create locks for user", async function () {
            expect(await lockTOS.balanceOf(tester1.account.address)).to.be.equal(0);
            expect(await lockTOS.balanceOf(tester2.account.address)).to.be.equal(0);

            await tos.connect(tester1.account).approve(lockTOS.address, 15500) 
            await lockTOS.connect(tester1.account).createLock(15500, 2);

            let userLocks = await lockTOS.connect(tester1.account).locksOf(tester1.account.address);
            let lockId = userLocks[userLocks.length - 1];
            expect(lockId).to.be.equal(1);
            tester1.lockTOSIds.push(lockId);


            await tos.connect(tester2.account).approve(lockTOS.address, 35000) 
            await lockTOS.connect(tester2.account).createLock(35000, 2);

            userLocks = await lockTOS.connect(tester2.account).locksOf(tester2.account.address);
            lockId = userLocks[userLocks.length - 1];
            expect(lockId).to.be.equal(2);
            tester2.lockTOSIds.push(lockId);


            await tos.connect(tester3.account).approve(lockTOS.address, 170000) 
            await lockTOS.connect(tester3.account).createLock(170000, 2);

            userLocks = await lockTOS.connect(tester3.account).locksOf(tester3.account.address);
            lockId = userLocks[userLocks.length - 1];
            expect(lockId).to.be.equal(3);
            tester3.lockTOSIds.push(lockId);


            await tos.connect(tester4.account).approve(lockTOS.address, 650000) 
            await lockTOS.connect(tester4.account).createLock(650000, 2);

            userLocks = await lockTOS.connect(tester4.account).locksOf(tester4.account.address);
            lockId = userLocks[userLocks.length - 1];
            expect(lockId).to.be.equal(4);
            tester4.lockTOSIds.push(lockId);


            await tos.connect(tester6.account).approve(lockTOS.address, 650000) 
            await lockTOS.connect(tester6.account).createLock(650000, 2);

            userLocks = await lockTOS.connect(tester6.account).locksOf(tester6.account.address);
            lockId = userLocks[userLocks.length - 1];
            expect(lockId).to.be.equal(5);
            tester6.lockTOSIds.push(lockId);

            // ethers.provider.send("evm_increaseTime", [10])   // add 26 seconds
            // ethers.provider.send("evm_mine")      // mine the next block

            const block = await ethers.provider.getBlock('latest')
            if (!block) {
                throw new Error('null block returned from provider')
            }


            setSnapshot = block.timestamp;
            // console.log(Number(setSnapshot))

            tester1.balanceOfAt = Number(await lockTOS.balanceOfAt(tester1.account.address, setSnapshot))
            
            tester2.balanceOfAt = Number(await lockTOS.balanceOfAt(tester2.account.address, setSnapshot))
            
            tester3.balanceOfAt = Number(await lockTOS.balanceOfAt(tester3.account.address, setSnapshot))
            
            tester4.balanceOfAt = Number(await lockTOS.balanceOfAt(tester4.account.address, setSnapshot))
            
            tester6.balanceOfAt = Number(await lockTOS.balanceOfAt(tester6.account.address, setSnapshot))
            console.log(tester1.balanceOfAt)
            console.log(tester2.balanceOfAt)
            console.log(tester3.balanceOfAt)
            console.log(tester4.balanceOfAt)
            console.log(tester6.balanceOfAt)
            
            expect(tester1.balanceOfAt).to.be.above(0);
            expect(tester2.balanceOfAt).to.be.above(0);
            expect(tester3.balanceOfAt).to.be.above(0);
            expect(tester4.balanceOfAt).to.be.above(0);
        });
    });

    describe("#4. setting VestingVault and PublicSale from initializer", () => {
        it("#4-1. check the balance (contract have the saleToken) ", async () => {
            balance1 = await saleToken.balanceOf(saleContract.address)

            expect(Number(balance1)).to.be.equal(Number(totalBigAmount))
        })

        //setting owner test
        it('#4-2. setAllsetting caller not owner', async () => {
            blocktime = Number(await time.latest())
            whitelistStartTime = blocktime + 86400;
            whitelistEndTime = whitelistStartTime + (86400*7);
            exclusiveStartTime = whitelistEndTime + 1;
            exclusiveEndTime = exclusiveStartTime + (86400*7);
            depositStartTime = exclusiveEndTime;
            depositEndTime = depositStartTime + (86400*7);
            claimTime1 = depositEndTime + (86400 * 20);
            claimTime2 = claimTime1 + (60 * 1);
            claimTime3 = claimTime2 + (60 * 2);
            claimTime4 = claimTime3 + (60 * 3);
            claimTime5 = claimTime4 + (60 * 4);
            claimTime6 = claimTime5 + (60 * 2);
            claimTime7 = claimTime6 + (60 * 2);
            claimTime8 = claimTime7 + (60 * 2);
            claimTime9 = claimTime8 + (60 * 2);
            claimTime10 = claimTime9 + (60 * 2);
            claimTime11 = claimTime10 + (60 * 2);
            claimTime12 = claimTime11 + (60 * 2);
            claimTime13 = claimTime12 + (60 * 2);
            claimTime14 = claimTime13 + (60 * 2);
            claimTime15 = claimTime14 + (60 * 2);
            claimTime16 = claimTime15 + (60 * 2);
            claimTime17 = claimTime16 + (60 * 2);
            claimTime18 = claimTime17 + (60 * 2);
            claimTime19 = claimTime18 + (60 * 2);
            claimTime20 = claimTime19 + (60 * 2);
            claimTime21 = claimTime20 + (60 * 2);
            claimTime22 = claimTime21 + (60 * 2);
            claimTime23 = claimTime22 + (60 * 2);
            claimTime24 = claimTime23 + (60 * 2);
            claimTime25 = claimTime24 + (60 * 2);
            claimTime26 = claimTime25 + (60 * 2);
            claimTime27 = claimTime26 + (60 * 2);
            claimTime28 = claimTime27 + (60 * 2);
            claimTime29 = claimTime28 + (60 * 2);
            claimTime30 = claimTime29 + (60 * 2);
            claimTime31 = claimTime30 + (60 * 2);
            claimTime32 = claimTime31 + (60 * 2);
            claimTime33 = claimTime32 + (60 * 2);
            claimTime34 = claimTime33 + (60 * 2);
            claimTime35 = claimTime34 + (60 * 2);
            claimTime36 = claimTime35 + (60 * 2);

            let tx = saleContract.connect(account1).setAllsetting(
                [100, 200, 1000, 4000, 600, 1200, 2200, 6000],
                [round1SaleAmount, round2SaleAmount, saleTokenPrice, payTokenPrice, hardcapAmount, changeTOS],
                [setSnapshot, whitelistStartTime, whitelistEndTime, exclusiveStartTime, exclusiveEndTime, depositStartTime, depositEndTime, claimCounts],
                [claimTime1,claimTime2,claimTime3,claimTime4,claimTime5,claimTime6,claimTime7,claimTime8,claimTime9,claimTime10,claimTime11,claimTime12,claimTime13,claimTime14,claimTime15,claimTime16,claimTime17,claimTime18,claimTime19,claimTime20,claimTime21,claimTime22,claimTime23,claimTime24,claimTime25,claimTime26,claimTime27,claimTime28,claimTime29,claimTime30,claimTime31,claimTime32,claimTime33,claimTime34,claimTime35,claimTime36],
                [claimPercent1,claimPercent2,claimPercent3,claimPercent4,claimPercent5,claimPercent6,claimPercent7,claimPercent8,claimPercent9,claimPercent10,claimPercent11,claimPercent12,claimPercent13,claimPercent14,claimPercent15,claimPercent16,claimPercent17,claimPercent18,claimPercent19,claimPercent20,claimPercent21,claimPercent22,claimPercent23,claimPercent24,claimPercent25,claimPercent26,claimPercent27,claimPercent28,claimPercent29,claimPercent30,claimPercent31,claimPercent32,claimPercent33,claimPercent34,claimPercent35,claimPercent36]
            )
            await expect(tx).to.be.revertedWith("Accessible: Caller is not an admin")
        })

        it("#4-3. setAllsetting snapshot error", async () => {
            let smallsnapshot = setSnapshot-100;
            let tx = saleContract.connect(saleTokenOwner).setAllsetting(
                [100, 200, 1000, 4000, 600, 1200, 2200, 6000],
                [round1SaleAmount, round2SaleAmount, saleTokenPrice, payTokenPrice, hardcapAmount, changeTOS],
                [smallsnapshot, whitelistStartTime, whitelistEndTime, exclusiveStartTime, exclusiveEndTime, depositStartTime, depositEndTime, claimCounts],
                [claimTime1,claimTime2,claimTime3,claimTime4,claimTime5,claimTime6,claimTime7,claimTime8,claimTime9,claimTime10,claimTime11,claimTime12,claimTime13,claimTime14,claimTime15,claimTime16,claimTime17,claimTime18,claimTime19,claimTime20,claimTime21,claimTime22,claimTime23,claimTime24,claimTime25,claimTime26,claimTime27,claimTime28,claimTime29,claimTime30,claimTime31,claimTime32,claimTime33,claimTime34,claimTime35,claimTime36],
                [claimPercent1,claimPercent2,claimPercent3,claimPercent4,claimPercent5,claimPercent6,claimPercent7,claimPercent8,claimPercent9,claimPercent10,claimPercent11,claimPercent12,claimPercent13,claimPercent14,claimPercent15,claimPercent16,claimPercent17,claimPercent18,claimPercent19,claimPercent20,claimPercent21,claimPercent22,claimPercent23,claimPercent24,claimPercent25,claimPercent26,claimPercent27,claimPercent28,claimPercent29,claimPercent30,claimPercent31,claimPercent32,claimPercent33,claimPercent34,claimPercent35,claimPercent36]
            )
            await expect(tx).to.be.revertedWith("snapshot need later")
        })
        
        it("#4-4. Initialzer : PublicSale", async () => {
            publicStos = [100, 200, 1000, 4000, 600, 1200, 2200, 6000]
            publicSetAmounts = [round1SaleAmount, round2SaleAmount, saleTokenPrice, payTokenPrice, hardcapAmount, changeTOS]
            publicSetTimes = [setSnapshot, whitelistStartTime, whitelistEndTime, exclusiveStartTime, exclusiveEndTime, depositStartTime, depositEndTime, claimCounts]
            publicClaimTimes = [claimTime1,claimTime2,claimTime3,claimTime4,claimTime5,claimTime6,claimTime7,claimTime8,claimTime9,claimTime10,claimTime11,claimTime12,claimTime13,claimTime14,claimTime15,claimTime16,claimTime17,claimTime18,claimTime19,claimTime20,claimTime21,claimTime22,claimTime23,claimTime24,claimTime25,claimTime26,claimTime27,claimTime28,claimTime29,claimTime30,claimTime31,claimTime32,claimTime33,claimTime34,claimTime35,claimTime36]
            publicClaimPercents = [claimPercent1,claimPercent2,claimPercent3,claimPercent4,claimPercent5,claimPercent6,claimPercent7,claimPercent8,claimPercent9,claimPercent10,claimPercent11,claimPercent12,claimPercent13,claimPercent14,claimPercent15,claimPercent16,claimPercent17,claimPercent18,claimPercent19,claimPercent20,claimPercent21,claimPercent22,claimPercent23,claimPercent24,claimPercent25,claimPercent26,claimPercent27,claimPercent28,claimPercent29,claimPercent30,claimPercent31,claimPercent32,claimPercent33,claimPercent34,claimPercent35,claimPercent36]

            let calldata = saleContract.interface.encodeFunctionData(
                "setAllsetting",
                [
                    publicStos, //vaults.publicSaleVault,
                    publicSetAmounts,
                    publicSetTimes,
                    publicClaimTimes,
                    publicClaimPercents
                ]
            )

            initializeCalls.publicSaleVault = {
                target: saleContract.address,
                callData: calldata
            }
        })

        it("#4-5. Initialier : vestingFundVault", async () => {
            let _block = await ethers.provider.getBlock();

            claimTmes = [
                _block.timestamp+(60*60*24*1),
                _block.timestamp+(60*60*24*2),
                _block.timestamp+(60*60*24*3)
            ];

            claimAmounts = [
                ethers.BigNumber.from("20"),
                ethers.BigNumber.from("40"),
                ethers.BigNumber.from("100")
            ];

            let calldata = vestingPublicFund.interface.encodeFunctionData(
                "initialize",
                [
                    saleContract.address, //vaults.publicSaleVault,
                    saleToken.address,
                    claimTmes,
                    claimAmounts,
                    3000
                ]
            )

            initializeCalls.vestingVault = {
                target: fundVaultAddress,
                callData: calldata
            }
        })

        it("#4-6. initializeCalls : call", async () => {
            await initializerContract.connect(saleTokenOwner).initialize(
                [
                  initializeCalls.vestingVault,
                  initializeCalls.publicSaleVault
                ]
            );

            let tx3 = Number(await saleContract.connect(saleOwner).totalExpectSaleAmount())
            expect(tx3).to.be.equal(Number(round1SaleAmount))
            let tx4 = Number(await saleContract.connect(saleOwner).totalExpectOpenSaleAmount())
            expect(tx4).to.be.equal(Number(round2SaleAmount))
            let tx17 = Number(await saleContract.claimTimes(0))
            expect(tx17).to.be.equal(claimTime1)
            let tx18 = Number(await saleContract.totalClaimCounts())
            expect(tx18).to.be.equal(claimCounts)
        })

    })
})