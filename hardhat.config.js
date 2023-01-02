require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
require("dotenv/config");

require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    local: {
      chainId: 31337,
      url: `http://127.0.0.1:8545/`,
      accounts: [
        `${process.env.PRIVATE_KEY}`,
        `${process.env.LOCAL_KEY}`,
        `${process.env.LOCAL_KEY2}`,
        `${process.env.LOCAL_KEY3}`,
        `${process.env.LOCAL_KEY4}`,
        `${process.env.LOCAL_KEY5}`,
        `${process.env.LOCAL_KEY6}`,
        `${process.env.LOCAL_KEY7}`,
        `${process.env.LOCAL_KEY8}`,
        `${process.env.LOCAL_KEY9}`,
        `${process.env.LOCAL_KEY10}`,
        `${process.env.LOCAL_KEY11}`,
        `${process.env.LOCAL_KEY12}`,
        `${process.env.LOCAL_KEY13}`,
        `${process.env.LOCAL_KEY14}`,
        `${process.env.LOCAL_KEY15}`
      ]
    },
    // rinkeby: {
    //   url: `https://rinkeby.infura.io/v3/${process.env.InfuraKey}`,
    //   accounts: [
    //     `${process.env.ACCOUNT0_PK}`,
    //     `${process.env.ACCOUNT1_PK}`,
    //     `${process.env.ACCOUNT2_PK}`,
    //   ],
    //   gasMultiplier: 1.25, //,
    //   // gasPrice: 20000000000,
    // },
    // mainnet: {
    //   url: `https://mainnet.infura.io/v3/${process.env.InfuraKey}`,
    //   accounts: [`${TONSTARTER_DEPLOYER_PK}`, `${ACCOUNT1_PK}`],
    //   gasMultiplier: 1.25,
    //   gasPrice: 50000000000,
    // },

    //harvey setting
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [
        `${process.env.PRIVATE_KEY}`,
        `${process.env.LOCAL_KEY}`,
        `${process.env.LOCAL_KEY2}`,
        `${process.env.LOCAL_KEY3}`,
        `${process.env.LOCAL_KEY4}`,
        `${process.env.LOCAL_KEY5}`,
        `${process.env.LOCAL_KEY6}`,
        `${process.env.LOCAL_KEY7}`,
        `${process.env.LOCAL_KEY8}`,
        `${process.env.LOCAL_KEY9}`,
        `${process.env.LOCAL_KEY10}`,
        `${process.env.LOCAL_KEY11}`,
        `${process.env.LOCAL_KEY12}`,
        `${process.env.LOCAL_KEY13}`,
        `${process.env.LOCAL_KEY14}`,
        `${process.env.LOCAL_KEY15}`
      ]
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [ `${process.env.RINKEBY_PRIVATE_KEY}` ],
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [ `${process.env.MAINNET_PRIVATE_KEY}` ],
      gasMultiplier: 1.25,
      gasPrice: 48000000000
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: "KRW",
    gasPrice: 30,
    // onlyCalledMethods: false,
    // showMethodSig: true,
  },
  blockGasLimit: 30000000,
  mocha: {
    timeout: 10000000,
  },
};
