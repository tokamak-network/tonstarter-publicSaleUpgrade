const { ethers, run } = require('hardhat')
const { BigNumber } = require("ethers")
const { isConstructorDeclaration } = require('typescript')

let logicAddress;

async function deployLogic() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contract with the account :", deployer.address)
    let PublicSale
    let alreadyDeploy = false
    let libPublicSaleAddress = "0x31512fA8D38d0aD35c0FF8A2F4385dCE0003a368";

    if(!alreadyDeploy) {
        const LibPublicSale = await ethers.getContractFactory("LibPublicSale");
        let libPublicSale = await LibPublicSale.connect(deployer).deploy();
        await libPublicSale.deployed();
    
        console.log("libPublicSale : ", libPublicSale.address);
    
        PublicSale = await ethers.getContractFactory("PublicSale",{
            libraries: {
                LibPublicSale: libPublicSale.address
            }
        });
    } else {
        //already deploy Library
        PublicSale = await ethers.getContractFactory("PublicSale",{
            libraries: {
                LibPublicSale: libPublicSaleAddress
            }
        });
        console.log("already deploy lib");
    }

    const saleContract = await PublicSale.connect(deployer).deploy()
    logicAddress = saleContract.address;
    console.log("PublicSaleContract Address: ", saleContract.address)
    await saleContract.deployed();
    console.log("logic deploy finish");
}

async function deployFactory() {
    const [deployer] = await ethers.getSigners()
    
    console.log("Deploying contract with the account :", deployer.address)
    
    const publicSaleProxyFactory = await ethers.getContractFactory('PublicSaleProxyFactory')
    const AddressContract = await publicSaleProxyFactory.deploy()
    console.log("PublicSaleFactory Address: ", AddressContract.address)
    await AddressContract.deployed()
    console.log("deploy finished")

    // //goerli
    // // const publicSaleLogic = "0x21b08650a049a9497b64a0E6a8497EDEBC532962"
    // const tonAddress = "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00"
    // const wtonAddress = "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6"
    // // const lockTOSAddress = "0x63689448AbEaaDb57342D9e0E9B5535894C35433" //lockTOSProxy
    // const lockTOSAddress = "0x770e0d682277A4a9167971073f1Aa6d6403bb315" //lockTOSProxy 최신것
    // const tosAddress = "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9"
    // const uniRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

    // const minPer = 5
    // const maxPer = 10

    // const upgradeaddr = "0x8c595DA827F4182bC0E3917BccA8e654DF8223E1"
    // const initialLiuiqidty = "0x174e97B891701D207BD48087Fe9e3b3d10ed7c99" //factory
    // const eventAddr2 = "0xcCcFc0c04c8c751f0ffF7CAf4340f2155BB352C8"
    // const initializer = "0xE56f199482B6402Aabe9EFD19194c3dBdf789F31"

    //mainnet
    const tonAddress = "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5"
    const wtonAddress = "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2"
    const lockTOSAddress = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79" //lockTOSProxy
    const tosAddress = "0x409c4D8cd5d2924b9bc5509230d16a61289c8153"
    const uniRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

    const minPer = 5
    const maxPer = 10

    const upgradeaddr = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1"      //기존 세팅되어있던 값
    const initialLiuiqidty = "0xcf9A97F0CBBc2eB588E3e4301773d13267616F10" //factory
    const eventAddr2 = "0x508d5FaDA6871348A5b4fb66f4A1F58b187Ce9Bd"
    const initializer = "0x653601b33a8faf6455Aa1f18Ea9F5E7662274a88"    //23.04.26 배포예정

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
    let delayTime = 604800;

    console.log("logicAddress check : ",logicAddress);

    await AddressContract.basicSet(
        [
            tonAddress,
            wtonAddress,
            lockTOSAddress,
            tosAddress,
            uniRouter,
            logicAddress
        ]
    )

    console.log("basicSet okay")

    await AddressContract.allSet(
        [
            upgradeaddr,
            initialLiuiqidty,
            eventAddr2,
            initializer
        ],
        [
            minPer,
            maxPer,
            bigTier1,
            bigTier2,
            bigTier3,
            bigTier4,
            delayTime
        ]
    )

    console.log("setting finish")
}

const main = async () => {
    await deployLogic()
    await deployFactory()
}  // main

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
