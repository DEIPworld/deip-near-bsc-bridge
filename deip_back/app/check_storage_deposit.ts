import { connect, keyStores, utils, Contract } from 'near-api-js'
import secret from "./secret.json"

const nearTokenId = secret.nearTokenId

const privateKey = secret.keyNearBackend
const accountId = secret.NearBackendAccount

const keyPair = utils.KeyPair.fromString(privateKey)
const keyStore = new keyStores.InMemoryKeyStore()
keyStore.setKey('testnet', accountId, keyPair)

const nearConfig = {
    networkId: 'testnet',
    keyStore,
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

export async function isStorageDeposited(account: String) {

    const bridgeSigher = await getNearBridgeSigner()

    let storageDeposit = await bridgeSigher.viewFunction(
        nearTokenId,
        "storage_balance_of",
        {
            account_id: account
        }
    )

    if (storageDeposit == null) {
        return false
    } else {
        return true
    }
}