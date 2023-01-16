const { ethers, run } = require('hardhat')
const { BigNumber } = require("ethers")

let proxyAddress;

async function proxyDeploy() {
    const [deployer] = await ethers.getSigners()
    console.log("Deploying contract with the account :", deployer.address)

    const saleProxy = await ethers.getContractFactory('PublicSaleProxy')
    const proxyContract = await saleProxy.deploy()
    proxyAddress = proxyContract.address
    console.log("proxyContract Address : ", proxyContract.address)
    await proxyContract.deployed()
    console.log("proxy deploy finish")

}

async function verify() {
    const [deployer] = await ethers.getSigners()
    console.log("verifying contract with the account :", deployer.address)

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 5) networkName = "goerli"; 

    if(chainId == 1 || chainId == 5) {
      await run("verify", {
        address: proxyAddress,
        constructorArgsParams: [],
      });
    }

    console.log("PublicSaleProxy verified");
}

const main = async () => {
    await proxyDeploy()
    await verify()
}  // main

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
