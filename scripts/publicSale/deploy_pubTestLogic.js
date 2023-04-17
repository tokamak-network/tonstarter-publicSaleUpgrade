const { ethers, run } = require('hardhat')
const { BigNumber } = require("ethers")
const { isConstructorDeclaration } = require('typescript')

const PublicSale_ABI = require('../../artifacts/contracts/sale/PublicSale.sol/PublicSale.json');

let logicAddress;
let proxyAddress = "0x580868d10843995cd42a3df4b651eb5190e61d9a";

async function deployLogic() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contract with the account :", deployer.address)
    let PublicSale
    let alreadyDeploy = true
    let libPublicSaleAddress = "0x31512fA8D38d0aD35c0FF8A2F4385dCE0003a368";

    if(!alreadyDeploy) {
        const LibPublicSale = await ethers.getContractFactory("LibPublicSale");
        let libPublicSale = await LibPublicSale.connect(deployer).deploy();
        await libPublicSale.deployed();
    
        console.log("libPublicSale : ", libPublicSale.address);
    
        PublicSale = await ethers.getContractFactory("PublicSaleTest",{
            libraries: {
                LibPublicSale: libPublicSale.address
            }
        });
    } else {
        //already deploy Library
        PublicSale = await ethers.getContractFactory("PublicSaleTest",{
            libraries: {
                LibPublicSale: libPublicSaleAddress
            }
        });
        console.log("already deploy lib");
    }

    const saleContract = await PublicSale.connect(deployer).deploy()
    logicAddress = saleContract.address;
    console.log("saleContract Address: ", saleContract.address)
    await saleContract.deployed();
    console.log("logic deploy finish");
}

async function testSetting() {
    const [deployer] = await ethers.getSigners()
    
    console.log("Deploying contract with the account :", deployer.address)
    
    let proxyLogic = new ethers.Contract( proxyAddress, PublicSale_ABI.abi, ethers.provider );

    //goerli
    // const publicSaleLogic = "0x21b08650a049a9497b64a0E6a8497EDEBC532962"
    const tonAddress = "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00"
    const wtonAddress = "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6"
    // const lockTOSAddress = "0x63689448AbEaaDb57342D9e0E9B5535894C35433" //lockTOSProxy
    const lockTOSAddress = "0x770e0d682277A4a9167971073f1Aa6d6403bb315" //lockTOSProxy 최신것
    const tosAddress = "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9"
    const uniRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

    const minPer = 5
    const maxPer = 10

    const upgradeaddr = "0x8c595DA827F4182bC0E3917BccA8e654DF8223E1"
    const initialLiuiqidty = "0x174e97B891701D207BD48087Fe9e3b3d10ed7c99" //factory
    const eventAddr2 = "0xcCcFc0c04c8c751f0ffF7CAf4340f2155BB352C8"
    const initializer = "0xE56f199482B6402Aabe9EFD19194c3dBdf789F31"


    const BASE_TEN = 10
    const decimals = 18
    let tier1 = 600
    let tier2 = 1200
    let tier3 = 2200
    let tier4 = 6000
    let bigTier1 = BigNumber.from(tier1).mul(BigNumber.from(BASE_TEN).pow(decimals))
    let bigTier2 = BigNumber.from(tier2).mul(BigNumber.from(BASE_TEN).pow(decimals))
    let bigTier3 = BigNumber.from(tier3).mul(BigNumber.from(BASE_TEN).pow(decimals))
    let bigTier4 = BigNumber.from(tier4).mul(BigNumber.from(BASE_TEN).pow(decimals))

    let round1SaleAmount = ethers.utils.parseUnits("1500000", 18);
    let round2SaleAmount = ethers.utils.parseUnits("1500000", 18);
    let saleTokenPrice = 1
    let payTokenPrice = 1000
    let hardcapAmount = ethers.utils.parseUnits("100", 18);
    let changeTOS = 10

    let setSnapshot = 1681783800         //2023/4/18 11:10 am
    let whitelistStartTime = 1681783801  //2023/4/18 11:10 am 1초
    let whitelistEndTime = 1681784098   //23/04/18 11:14 am 58초
    let exclusiveStartTime = 1681784100 //23/04/18 11:15 am
    let exclusiveEndTime = 1681784698 //23/04/18 11:24 am 58초
    let depositStartTime = 1681784700 //23/04/18 11:25 am
    let depositEndTime = 1681784998 //23/04/18 11:29 am 58초
    
    let claimCounts = 3
    let claimTime1 = 1681785000 //23/04/18 11:30 am
    let claimTime2 = 1681785300 //23/04/18 11:35 am
    let claimTime3 = 1681785600 //23/04/18 11:40 am
    let claimPercent1 = 3000
    let claimPercent2 = 3000
    let claimPercent3 = 4000


    await proxyLogic.connect(deployer).setAllsetting(
        [bigTier1, bigTier2, bigTier3, bigTier4, tier1, tier2, tier3, tier4],
        [round1SaleAmount, round2SaleAmount, saleTokenPrice, payTokenPrice, hardcapAmount, changeTOS],
        [setSnapshot, whitelistStartTime, whitelistEndTime, exclusiveStartTime, exclusiveEndTime, depositStartTime, depositEndTime, claimCounts],
        [claimTime1,claimTime2,claimTime3],
        [claimPercent1,claimPercent2,claimPercent3]
    )

    console.log("setting finish")
}

const main = async () => {
    // await deployLogic()
    await testSetting()
}  // main

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
