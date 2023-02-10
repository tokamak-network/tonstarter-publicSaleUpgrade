const { ethers } = require("hardhat");

// rinkeby
let uniswapInfo_rinkeby ={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "0xfbDc20aEFB98a2dD3842023f21D17004eAefbe68",
    wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
    tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
    weth: "0xc778417e063141139fce010982780140aa0cd5ab",
    usdc: "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
}

// goerli
let uniswapInfo_goerli = {
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "",
    wtonWethPool: "0x9EF32Ae2acAF105557DB0E98E68c6CD4f1A1aE63",
    wtonTosPool: "0x8DF54aDA313293E80634f981820969BE7542CEe9",
    tosethPool: "0x3b466f5d9b49aedd65f6124d5986a9f30b1f5442",
    wton: "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6",
    tos: "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9",
    weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3",
    UniswapV3Staker: "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65",
    ton: "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00",
    lockTOSaddr: "0x770e0d682277A4a9167971073f1Aa6d6403bb315",
    lockTOSaddr2: "0x5adc7de3a0B4A4797f02C3E99265cd7391437568",
    tosAdminAddress: "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287",
    aura: "0x80Eea029B5Cdb8A215Ae78e20B4fF81607F44A38",
    lyda: "0x51C5E2D3dc8Ee66Dffdb1747dEB20d6b326E8bF2",
    doc: "0x020A7c41212057B2A880191c07F7c7C7a71a8b57"
}

// mainnet
let uniswapInfo_mainnet = {
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
    tosDOCPool: "0x369bca127b8858108536b71528ab3befa1deb6fc",
    wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    doc: "0x0e498afce58de8651b983f136256fa3b8d9703bc",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3",
    ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
    lockTOSaddr: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79",
    lockTOSaddr2: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
}

// let networkName = "mainnet"
let networkName = "goerli"
let addressinfo;

async function getAddressInfo(chainId) {

    if (chainId == 1) {
        addressinfo = uniswapInfo_mainnet
    } else if (chainId == 5) {
        addressinfo = uniswapInfo_goerli
    } else if (chainId == 4) {
        addressinfo = uniswapInfo_rinkeby
    }
    // if (networkName == "mainnet") {
    //     addressinfo = uniswapInfo_mainnet
    // } else if (networkName == "goerli") {
    //     addressinfo = uniswapInfo_goerli
    // } else if (networkName == "rinkeby") {
    //     addressinfo = uniswapInfo_rinkeby
    // }

    return {
        addressinfo
    };
}

module.exports = {
    getAddressInfo
}