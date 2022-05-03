import { defineStore, acceptHMRUpdate } from "pinia";
// import { walletConnect, userInfo, walletDisconnect, wallet } from "../utils/near_connect";

import axios from "axios";

import {
  connect,
  Contract as nearContact,
  WalletConnection,
  keyStores,
} from "near-api-js";

import { BigNumber, BigNumberish, Contract, providers, utils } from "ethers";

import { Token } from "../typechain_types/Token";

import { validateBscAddress, validateNearAddress } from "../utils/utils_func";

// const { connect, WalletConnection, keyStores } = nearAPI;

import config from "./config.json";

import {
  abi as bscTokenAbi,
  address as bscTokenAddress,
} from "../abis/bsc_token.json";

import {
  abi as bscBridgeAbi,
  address as bscBridgeAddress,
} from "../abis/bsc_bridge.json";

//TODO check if it's better then defining window in nuxt.config.ts
declare var window: any;

const configNear = {
  networkId: "testnet",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
  headers: {},
};

const bsc_RPC = config.bsc_RPC;
const _bscProvider = new providers.JsonRpcProvider(bsc_RPC);

const bscTokenContract = new Contract(
  bscTokenAddress,
  bscTokenAbi,
  _bscProvider
) as Token;

const bscBridgeContract = new Contract(
  bscBridgeAddress,
  bscBridgeAbi,
  _bscProvider
);

export async function safe(promise: Promise<any>) {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, error];
  }
}

export function removeTrailingZeros(str: string): string {
  return str.replace(/\.?0+$/, "");
}

export function numstrToBN(input: string, dec: number): BigNumber {
  if (!input) return BigNumber.from(0);
  const spl = input.split(".");
  if (spl[1]?.length > dec) {
    input = [spl[0], spl[1].slice(0, dec)].join(".");
  }
  return utils.parseUnits(input, dec);
}

export function BNToNumstr(
  bn: BigNumberish,
  dec: number,
  prec: number
): string {
  let res = BNToNumstrStrict(bn, dec, prec);
  if (res.split(".")[1]) res = removeTrailingZeros(res);
  return res;
}

export function BNToNumstrStrict(
  bn: BigNumberish,
  dec: number,
  prec: number
): string {
  if (!bn) return "0";
  const spl = utils.formatUnits(bn, dec).split(".");
  if (prec === 0) return spl[0];
  return [spl[0], ((spl[1] || "") + "0".repeat(prec)).slice(0, prec)].join(".");
}

export function wait(time = 3000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export const useStore = defineStore("storeId", {
  state: () => {
    return {
      openModal: false,
      notificationStatus: false,
      back_url: "http://localhost:7777" as String,
      backendIsDown: false as boolean,

      nearWallet: null as WalletConnection,
      nearTokenContract: null as Contract,
      nearBridgeContract: null as Contract,

      BSCFee: undefined as string | undefined,
      NEARFee: undefined as string | undefined,

      nearBalance: null as BigNumber,
      nearWalletAddress: null as string,

      bscWalletAddress: "" as string,
      bscBalance: null as BigNumber,

      bscProvider: null as () => providers.Web3Provider,
      bscSigner: null as () => providers.JsonRpcSigner,
    };
  },
  actions: {
    setOpenModal(bool: boolean) {
      this.openModal = bool;
    },

    async checkBackend() {
      if (!this.back_url) {
        throw new Error("Backend url is not specified");
      }
      try {
        await axios.get("ping", { baseURL: this.back_url });
      } catch (error) {
        throw new Error("Backend is down, try the bridge the other time :)");
      }
    },

    async connectNear() {
      const near = await connect(configNear);
      this.nearWallet = new WalletConnection(near, "Bridge App BSC-NEAR");
      const account = await this.nearWallet.account();

      this.nearTokenContract = new nearContact(
        this.nearWallet.account(),
        config.nearTokenId,
        {
          viewMethods: ["ft_balance_of"],
          changeMethods: ["ft_transfer_call"],
        }
      );

      this.nearBridgeContract = new nearContact(
        this.nearWallet.account(),
        config.nearBridgeId,
        {
          viewMethods: ["view_lock_amount", "view_lock_address"],
          changeMethods: [],
        }
      );

      if (!account.accountId) {
        await this.nearWallet.requestSignIn(
          "deip_bridge.testnet" // contract requesting access
        );
      }
      const balance = await this.nearTokenContract.ft_balance_of({
        account_id: account.accountId,
      });

      this.nearBalance = BigNumber.from(balance);
      this.nearWalletAddress = account.accountId;
    },

    async checkNearAccount(destination: string): Promise<boolean> {
      if (!this.back_url) {
        throw new Error("Backend url is not specified");
      }
      let result;
      try {
        await axios
          .post(
            "/acccount",
            {
              address: destination,
            },
            { baseURL: this.back_url }
          )
          .then(({ data }) => (result = data));
      } catch (error) {
        throw new Error("Backend is down, try the bridge other time");
      }
      return result;
    },

    async connectMetamask() {
      if (!window.ethereum) throw new Error("Please setup MetaMask properly");
      const provider = new providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const wallet = await signer.getAddress();
      const balance = await bscTokenContract.balanceOf(wallet);

      const balanceResult = BigNumber.from(balance);

      this.bscProvider = () => provider;
      this.bscSigner = () => signer;
      this.bscWalletAddress = wallet;
      this.bscBalance = balanceResult;
    },

    async resetMetamask() {
      this.bscProvider = null;
      this.bscSigner = null;
      this.bscWalletAddress = "";
      this.bscBalance = 0;
      this.openModal = false;
    },

    async resetNear() {
      this.nearWalletAddress = null;
      this.nearBalance = null;
      this.openModal = false;

      if (this.nearWallet.isSignedIn()) {
        this.nearWallet.signOut();
      }
    },

    async bridgeToNear(destination: string, amount: BigNumber) {
      if (!this.bscSigner) {
        throw new Error("Please connect your metamask account");
      }

      if (!validateNearAddress(destination)) {
        throw new Error("Near address is invalid");
      }

      await this.checkBackend();

      const isStoraged = await this.checkNearAccount(destination);

      if (isStoraged.isDeposited == false) {
        throw Error(
          "This near account hasn't called storage_deposit to deip token smartcontract on NEAR blockchain"
        );
      }

      const allowance = await bscTokenContract.allowance(
        this.bscWalletAddress,
        bscBridgeAddress
      );

      if (allowance.lt(amount)) {
        const bscTokenSigner = new Contract(
          bscTokenAddress,
          bscTokenAbi,
          this.bscSigner()
        );
        const res = await safe(
          bscTokenSigner.approve(bscBridgeAddress, amount)
        );
        const error = res[1];

        if (error) {
          console.error(error);
          throw new Error(error);
        }

        await res[0].wait();
      }

      const bscBridgeSigner = new Contract(
        bscBridgeAddress,
        bscBridgeAbi,
        this.bscSigner()
      );
      const lockInfo = await safe(
        bscBridgeContract.checkUserLock(this.bscWalletAddress)
      );

      let result;

      if (lockInfo[0].amount.eq(BigNumber.from(0))) {
        if (amount.lt(this.BSCFee)) {
          throw Error("Should send more than fee tokens");
        }

        await this.callToBack(this.bscWalletAddress, "BSC_TO_NEAR");
        console.log("Creating new lock");
        const res = await safe(bscBridgeSigner.upload(amount, destination));
        const error = res[1];
        if (error) {
          console.error(error);
          throw new Error(error);
        }
        result = await res[0].wait();
      } else {
        await this.callToBack(this.bscWalletAddress, "BSC_TO_NEAR");
        console.log("Using old lock");
        result = "Using old lock";
      }

      return result;
    },

    async bridgeToBSC(destination: string, amount: BigNumber) {
      if (!this.nearWalletAddress) {
        throw new Error("Please connect your near wallet");
      }

      if (!validateBscAddress(destination)) {
        throw new Error("BSC address is invalid");
      }

      await this.checkBackend();

      const lock_amount = await safe(
        this.nearBridgeContract.view_lock_amount({
          account_id: this.nearWalletAddress,
        })
      );
      const lock_address = await safe(
        this.nearBridgeContract.view_lock_address({
          account_id: this.nearWalletAddress,
        })
      );

      if (lock_amount[0] == "0" && lock_address[0] == "") {
        if (amount.lt(BigNumber.from(this.NEARFee))) {
          throw Error("Should send more than fee tokens");
        }

        await this.callToBack(this.nearWalletAddress, "NEAR_TO_BSC");

        await this.nearTokenContract.ft_transfer_call(
          {
            receiver_id: config.nearBridgeId,
            amount: amount.toString(),
            msg: destination,
          },
          "300000000000000",
          "1"
        );
      } else {
        await this.callToBack(this.nearWalletAddress, "NEAR_TO_BSC");
        console.log("Using old lock");
        return "Using old lock";
      }

      return true;
    },

    async fetchFee() {
      const fee: any = await axios.get(this.back_url + "/fee");
      console.log(fee);
      this.BSCFee = fee.data.feeBSCToNear;
      this.NEARFee = fee.data.feeNearToBSC;
    },

    async callToBack(address: string, direction: string) {
      if (!this.back_url) {
        throw new Error("Backend url is not specified");
      }

      console.log("call to back");
      console.log("address: ", address);
      console.log("direction: ", direction);

      axios.post(
        "",
        {
          direction: direction,
          address: address,
        },
        { baseURL: this.back_url }
      );
    },

    async setNotificationStatus() {
      if (this.notificationStatus === false) {
        this.notificationStatus = true;
      } else if (this.notificationStatus === true) {
        this.notificationStatus = false;
      }
    },
  },

  getters: {},
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStore, import.meta.hot));
}
