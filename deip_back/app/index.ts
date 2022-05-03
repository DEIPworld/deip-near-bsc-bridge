import { BigNumber, providers, Wallet, Contract, Signer, ethers } from 'ethers'
import { NonceManager } from "@ethersproject/experimental";
import BN from 'bn.js'

import { connect, keyStores, utils } from 'near-api-js'
import { FunctionCallOptions } from 'near-api-js/lib/account'

import BscBridge from "./bsc_bridge.json"
import secret from "./secret.json"
import { FullFeeFromBSCToNear, FullFeeFromNearToBSC } from "./fee"

const nearTokenId = secret.nearTokenId
const nearBridgeId = secret.nearBridgeId

const privateKey = secret.keyNearBackend
const accountId = secret.NearBackendAccount

const keyPair = utils.KeyPair.fromString(privateKey)
const keyStore = new keyStores.InMemoryKeyStore()
keyStore.setKey('testnet', accountId, keyPair)

const walletPrivateKeyBSC = secret.keyBSCBackend
const bsc_rpc_test = secret.rpcOfNetworkTestBSC
const bsc_rpc_main = secret.rpcOfNetworkMainBSC

export enum Direction {
  BSC_TO_NEAR = 1,
  NEAR_TO_BSC = 2
}

async function getBscBridgeSigner() {
  const provider = new providers.JsonRpcProvider(bsc_rpc_test)

  const BridgeAbi = BscBridge.abi
  const BridgeAddr = BscBridge.address

  const signer = new Wallet(walletPrivateKeyBSC, provider);
  const BridgeSigner = new Contract(BridgeAddr, BridgeAbi, signer)

  return BridgeSigner
}

export async function getSigner(): Promise<NonceManager> {
  const provider = new providers.JsonRpcProvider(secret.rpcOfNetworkTestBSC)
  const signer = new Wallet(walletPrivateKeyBSC, provider);
  return new NonceManager(signer)
}

const nearConfig = {
  keyStore,
  networkId: 'testnet',
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
}

async function getNearBridgeSigner() {
  const near = await connect(nearConfig)

  const bridge = await near.account(accountId)
  return bridge
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function bscToNear(bscAddress: string) {

  // As bsc chain can be reverted, so we will wait 15 sec to get time for stakers to reproduce 5 more blocks 
  // to be sure that transaction won't be reverted
  delay(15000)

  const bridgeSignerBSC = await getBscBridgeSigner()
  const bridgeSignerNear = await getNearBridgeSigner()
  const signer = await getSigner()
  const feeDeip = await FullFeeFromBSCToNear()

  let amountAndAddress = await bridgeSignerBSC.checkUserLock(bscAddress)
  for (let i = 0; i < 20; ++i) {
    if (amountAndAddress[1] != '') {
      console.log("Lock was created on BSC: address: ", amountAndAddress[1], "\nAmount of tokens: ", amountAndAddress[0])
      break
    }

    await delay(15000)
    console.log("Whaiting for lock")

    amountAndAddress = await bridgeSignerBSC.checkUserLock(bscAddress)
  }

  if (amountAndAddress[1] == '') {
    console.log("Error: lock structure wasn't created on BSC")
    return
  }

  const amountToSend = BigNumber.from(amountAndAddress[0]).sub(feeDeip)
  if (amountToSend.lt(0)) {
    console.log("Error: transactions fee is greater than tokens to send: " + amountAndAddress[0] + " is less than fee: " + feeDeip.toString())
    return
  }

  const availableTokensOnNear = await bridgeSignerNear.viewFunction(
    nearTokenId,
    "ft_balance_of",
    { account_id: nearBridgeId }
  )

  if (amountToSend.gt(availableTokensOnNear)) {
    console.log("Error: available for transfer tokens on Near: " + availableTokensOnNear + " is less than needed: " + amountToSend.toString())
    return
  }

  const balance = await bridgeSignerNear.getAccountBalance()
  const balanceToCompare = BigNumber.from(balance.available)
  if (balanceToCompare.lt("300000000000000")) {
    console.log("Error: available near tokens: " + availableTokensOnNear + " for transaction fee max needed: 300000000000000")
    return
  }

  let i
  for (i = 0; i < 20; i++) {
    try {
      const params = [bscAddress]
      const unsignedTx = await bridgeSignerBSC.populateTransaction["clearLock"](...params)
      const tx = await signer.sendTransaction(unsignedTx)
      await tx.wait()
      break
    } catch (e) {
      await delay(5000)
      console.log("Error: clear lock on BSC wasn't successful.\n" + e, "Try num: ", i, " max 20")
    }
  }

  if (i == 20) {
    console.log("Error: clear lock on BSC wasn't successful. Need to clear by yourself.")
    return
  }

  const deipToSend = amountToSend.toString()
  const args: FunctionCallOptions = {
    contractId: nearBridgeId,
    methodName: "dispense",
    args:
    {
      account_id: amountAndAddress[1],
      amount: deipToSend,
    },
    gas: new BN("300000000000000"),
    attachedDeposit: new BN("0")
  }

  try {
    await bridgeSignerNear.functionCall(
      args
    )
  } catch (e) {
    console.log("Error: dispense on NEAR wasn't successful.\n" + e)
  }
  console.log("Success: BSC->NEAR done")
}

async function nearToBsc(nearAddress: string) {
  const bridgeSignerBSC = await getBscBridgeSigner()
  const bridgeSignerNear = await getNearBridgeSigner()
  const signer = await getSigner()

  let lockTokens = await bridgeSignerNear.viewFunction(
    nearBridgeId,
    "view_lock_amount",
    {
      account_id: nearAddress
    }
  )
  let lockForAddress = await bridgeSignerNear.viewFunction(
    nearBridgeId,
    "view_lock_address",
    {
      account_id: nearAddress
    }
  )

  let amount = BigNumber.from(lockTokens)

  for (let i = 0; i < 20; ++i) {
    if (!amount.eq(BigNumber.from(0))) {
      console.log("Lock was created on BSC:\n address: ", lockForAddress, "\nAmount of tokens: ", amount.toString())
      break
    }

    await delay(15000)
    console.log("Whaiting for lock")

    lockTokens = await bridgeSignerNear.viewFunction(
      nearBridgeId,
      "view_lock_amount",
      {
        account_id: nearAddress
      }
    )

    lockForAddress = await bridgeSignerNear.viewFunction(
      nearBridgeId,
      "view_lock_address",
      {
        account_id: nearAddress
      }
    )

    amount = BigNumber.from(lockTokens)
  }

  if (lockTokens == '0') {
    console.log("Error: lock structure wasn't created on NEAR for amounts")
    return
  }

  if (lockForAddress == "") {
    console.log("Error: lock structure wasn't created on NEAR for address")
    return
  }

  const feeDeip = await FullFeeFromNearToBSC()
  const amountToSend = amount.sub(feeDeip)
  if (amountToSend.lt(0)) {
    console.log("Error: transactions fee is greater than tokens to send: " + amount.toString() + " is less than fee: " + feeDeip.toString())
    return
  }

  const args: FunctionCallOptions = {
    contractId: nearBridgeId,
    methodName: "clear_lock",
    args:
    {
      account_id: nearAddress,
    },
    gas: new BN("300000000000000"),
    attachedDeposit: new BN("0")
  }

  await bridgeSignerNear.functionCall(
    args
  )

  let i
  for (i = 0; i < 20; i++) {
    try {
      const params = [lockForAddress, amountToSend]
      const unsignedTx = await bridgeSignerBSC.populateTransaction["dispense"](...params)
      const tx = await signer.sendTransaction(unsignedTx)
      await tx.wait()
      console.log("Success: NEAR->BSC done")
      break
    } catch (e) {
      await delay(5000)
      console.log("Error: dispense on BSC wasn't successful.\n" + e, "Try num: ", i, " max 20")
    }
  }
  if (i == 20) {
    console.log("Error: dispense on BSC wasn't successful. Need to clear by yourself.")
    return
  }
}

export async function main(direction: Direction, address: string) {
  let directionString = (direction == Direction.BSC_TO_NEAR) ? "BSC_TO_NEAR" : (direction == Direction.NEAR_TO_BSC) ? "NEAR_TO_BSC" : "Invalid direction"
  console.log(directionString, address)
  if (direction == Direction.BSC_TO_NEAR) {
    await bscToNear(address)
  } else if (direction == Direction.NEAR_TO_BSC) {
    await nearToBsc(address)
  } else {
    return
  }
}