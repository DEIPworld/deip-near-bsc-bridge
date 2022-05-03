import { BigNumber, providers, Wallet, Contract } from 'ethers'
import { connect, keyStores, utils } from 'near-api-js'

import pancake from "./pancake_bsc.json"
import secret from "./secret.json"

const bsc_rpc_main = secret.rpcOfNetworkMainBSC
const bnb_address = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
const busd_address = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
const near_address = "0x1Fa4a73a3F0133f0025378af00236f3aBDEE5D63"

const privateKey = secret.keyNearBackend
const accountId = secret.NearBackendAccount

const keyPair = utils.KeyPair.fromString(privateKey)
const keyStore = new keyStores.InMemoryKeyStore()
keyStore.setKey('testnet', accountId, keyPair)

const nearConfig = {
    keyStore,
    networkId: 'testnet',
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
}

// 10 ** 18 - 1 BNB
const clear_lock_gas_bsc = BigNumber.from("60000")
const dispense_gas_bsc = BigNumber.from("100000")

// 10 ** 24 - 1 Near
const clear_lock_gas_near = BigNumber.from("7000000000000")
const dispense_gas_near = BigNumber.from("15000000000000")

async function getPancakeProvider() {
    const provider = new providers.JsonRpcProvider(bsc_rpc_main)

    const PancakeAbi = pancake.abi
    const PancakeAddr = pancake.address

    const PancakeProvider = new Contract(PancakeAddr, PancakeAbi, provider)

    return PancakeProvider
}

//We take price like 10.0000
async function getPriceBNB(): Promise<BigNumber> {
    let PancakeProvider = await getPancakeProvider()

    let BNBPriceInBUSD = await PancakeProvider.getAmountsOut(10000, [bnb_address, busd_address])
    return BNBPriceInBUSD[1]
}

async function getPriceNear(): Promise<BigNumber> {
    let PancakeProvider = await getPancakeProvider()

    let NearPriceInBUSD = await PancakeProvider.getAmountsOut(10000, [near_address, busd_address])
    return NearPriceInBUSD[1]
}

//In future we call PancakeProvider
//For now 10000 tokens for 15 dollars
async function getPriceDeip(): Promise<BigNumber> {
    return BigNumber.from(15)
}

// Gas price at the current moment
async function calculateGasPriceBSC(): Promise<BigNumber> {
    const provider = new providers.JsonRpcProvider(bsc_rpc_main)
    const gasPrice = await provider.getGasPrice()
    return gasPrice
}

// 10 ** 18 - default native token decimals
async function calculatePriceOnBSC(fee: BigNumber): Promise<BigNumber> {
    const gas = (await calculateGasPriceBSC()).mul(fee).div(10 ** 9) // A*10^5 +-
    const gasInBNB = gas.mul(await getPriceBNB()).div(10 ** 9) // 3600 +- max
    const deipTokensFee = gasInBNB.div(await getPriceDeip()) // Depends on deip token price, but for now 150 deip max
    return deipTokensFee.mul(10 ** 9).mul(10 ** 9) // Cause decimals is 10**18
}

async function calculateGasPriceNear(): Promise<BigNumber> {
    const near = await connect(nearConfig);
    const response = await near.connection.provider.block({
        finality: "final",
    });
    const gasPrice = await near.connection.provider.gasPrice(response.header.height)
    return BigNumber.from(gasPrice.gas_price)
}

// 10 ** 24 - default native token decimals
async function calculatePriceOnNear(fee: BigNumber): Promise<BigNumber> {
    const gas = (await calculateGasPriceNear()).mul(fee) // A*10^20 +-
    const gasInNear = gas.mul(await getPriceNear()) // A*B*10^24 +-
    const deipTokensFee = gasInNear.div(await getPriceDeip()).div(10 ** 6) // Cause decimals is 10**18
    return deipTokensFee
}

export async function FullFeeFromNearToBSC(): Promise<BigNumber> {
    let clear_lock = await calculatePriceOnNear(clear_lock_gas_near)
    let dispense = await calculatePriceOnBSC(dispense_gas_bsc)

    const deipTokens = clear_lock.add(dispense)
    return deipTokens
}

export async function FullFeeFromBSCToNear(): Promise<BigNumber> {
    let clear_lock = await calculatePriceOnBSC(clear_lock_gas_bsc)
    let dispense = await calculatePriceOnNear(dispense_gas_near)

    const deipTokens = clear_lock.add(dispense)
    return deipTokens
}
