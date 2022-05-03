import * as nearAPI from "near-api-js";

const { connect, WalletConnection, keyStores } = nearAPI;

const config = {
  networkId: "testnet",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
  headers: {}
};

const near = await connect(config)
export const wallet = new WalletConnection(near, "Bridge App BSC-NEAR");

export const walletConnect = async () => {
  await wallet.requestSignIn(
    "dev-2.testnet", // contract requesting access
  )
}

export const walletDisconnect = () => {
  if (wallet.isSignedIn()) {
    wallet.signOut()
  }
}

export const getBalance = async (account) => {
  const balance = await account.getAccountBalance();
  return balance
}

export const userInfo = () => {
  const walletAccountObj = wallet.account();
  return walletAccountObj
}