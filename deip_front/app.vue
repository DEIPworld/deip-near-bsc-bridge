<template>
  <div class="relative">
    <app-header />
    <modal-window />
    <div class="absolute lg:right-3 flex flex-col mt-3 gap-2 px-1 md:p-0">
      <info
        :type="notificationType"
        :message="notificationMessage"
        :hash="hash"
      />
      <!-- <info type="Error" /> -->
      <!-- <info type="Info" /> -->
    </div>
    <main class="w-full flex justify-center">
      <div class="main w-[1200px] py-[50px]">
        <h1 class="head-title">Bridge DEIP tokens</h1>

        <h3 class="sub-title mt-2">
          Transfer tokens between Binance Smart Chain and NEAR
        </h3>
        <div class="transfer-forms mt-[50px] flex justify-between items-center">
          <div
            class="flex lg:flex-col flex-row overflow-hidden transfer-form w-[500px] h-[420px]"
          >
            <transition name="slide-up1">
              <transfer-form
                v-model:amount="amount"
                v-model:destAddress="destAddress"
                class="transfer-form"
                v-if="transferValue === 1"
                bc="bsc"
                type="from"
              />
              <transfer-form
                v-model:amount="amount"
                v-model:destAddress="destAddress"
                class="transfer-form"
                v-else-if="transferValue === 2"
                bc="near"
                type="from"
              />
            </transition>
          </div>
          <svg
            @click="setTransferValue()"
            class="cursor-pointer ease-in duration-300 hover:fill-[#D9EE00]"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="31" stroke="black" stroke-width="2" />
            <path
              d="M49 37.48L38.98 47.52"
              stroke="black"
              stroke-width="2"
              stroke-miterlimit="10"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15 37.48H49"
              stroke="black"
              stroke-width="2"
              stroke-miterlimit="10"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15 25.52L25.02 15.48"
              stroke="black"
              stroke-width="2"
              stroke-miterlimit="10"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M49 25.52H15"
              stroke="black"
              stroke-width="2"
              stroke-miterlimit="10"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <div
            class="flex lg:flex-col flex-row overflow-hidden transfer-form w-[500px] h-[420px]"
          >
            <transition name="slide-up2">
              <transfer-form
                v-model:amount="amount"
                v-model:destAddress="destAddress"
                v-if="transferValue === 1"
                class="transfer-form"
                bc="near"
                type="to"
              />
              <transfer-form
                v-model:amount="amount"
                v-model:destAddress="destAddress"
                v-else-if="transferValue === 2"
                class="transfer-form"
                bc="bsc"
                type="to"
              />
            </transition>
          </div>
        </div>
        <div v-if="store.backendIsDown">
          <button
            class="bg-[#808080] text-white mw-[200px] rounded-r-[32px] px-[60px] py-[15px] mt-[50px] font-semibold text-[24px]"
          >
            Backend is down
          </button>
        </div>
        <div v-else-if="!store.NEARFee || !store.BSCFee">
          <button
            class="bg-[#808080] text-white mw-[200px] rounded-r-[32px] px-[60px] py-[15px] mt-[50px] font-semibold text-[24px]"
          >
            Wait for fee calculation
          </button>
        </div>
        <div v-else-if="processing">
          <button
            class="bg-[#808080] text-white mw-[200px] rounded-r-[32px] px-[60px] py-[15px] mt-[50px] font-semibold text-[24px]"
          >
            Processing
          </button>
        </div>
        <div v-else-if="err">
          <button
            class="bg-[#808080] text-white mw-[200px] rounded-r-[32px] px-[60px] py-[15px] mt-[50px] font-semibold text-[24px]"
          >
            Insufficient amount
          </button>
        </div>
        <div v-else>
          <button
            @click="transfer()"
            class="bg-black text-white mw-[200px] rounded-r-[32px] px-[60px] py-[15px] mt-[50px] font-semibold text-[24px]"
          >
            bridge
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
import { BigNumber, utils } from "ethers";
import { ref, onMounted } from "vue";
import { useStore } from "./store/store";
import { numstrToBN } from "./store/store";
import { BNToNumstr } from "./store/store";

import * as buffer from "buffer";
(window as any).Buffer = buffer.Buffer;

const err = ref(false);

onMounted(async () => {
  try {
    await store.checkBackend();
    // alert("1")
    store.backendIsDown = false;
  } catch (error) {
    store.backendIsDown = true;
  }
  //   finally {
  //     // await bscConnect();
  // }
});

const store = useStore();
let savedTransferValue = localStorage.getItem("transferValue");
let transferValue = ref(+savedTransferValue || 1);

const setTransferValue = () => {
  if (transferValue.value === 1) {
    transferValue.value = 2;
    localStorage.removeItem("transferValue");
    localStorage.setItem("transferValue", "2");
  } else {
    transferValue.value = 1;
    localStorage.removeItem("transferValue");
    localStorage.setItem("transferValue", "1");
  }
};

const amount = ref("");
const destAddress = ref("");
const hash = ref("");
const notificationType = ref("");
const notificationMessage = ref("");

// numstrToBN(props.amount, 18).sub(BSCFee)

watch(amount, (cur, prev) => {
  const regex = /^[0-9]*[.]?[0-9]*$/;
  if (!regex.test(cur)) {
    amount.value = prev;
  }
  if (Number(amount.value) < Number(BNToNumstr(store.BSCFee, 18, 18)) && transferValue.value === 1) {
    err.value = true;
    console.log(err.value);
  } else if(Number(amount.value) < Number(BNToNumstr(store.NEARFee, 18, 18)) && transferValue.value === 2) {
    err.value = true;
    console.log(err.value);
  } else {
    err.value = false;
  }
});

async function transfer() {
  try {
    if (transferValue.value === 1) {
      bscToNear();
    } else {
      nearToBsc();
    }
  } catch (e) {
    console.log("Error calling transfer function");
    notificationMessage.value = e;
    notificationType.value = "Error";
    store.setNotificationStatus();
  }
}

const processing = ref(false);

async function bscToNear() {
  processing.value = true;
  const validBalance =
    store.bscBalance == null
      ? false
      : numstrToBN(amount.value, 18).lte(store.bscBalance);
  const validAmount = amount.value != "" && amount.value !== "0";
  try {
    if (!validBalance) {
      throw new Error("Your balance is too low, get more Deip tokens");
    }
    if (!validAmount) {
      throw new Error("You can't send zero Deip tokens");
    }

    const tx = await store.bridgeToNear(
      destAddress.value,
      numstrToBN(amount.value, 18)
    );

    if (tx === "Using old lock") {
      hash.value = "Using old lock";
    }

    if (!tx) {
      throw new Error("Transaction failed from BSC to Near");
    } else {
      notificationType.value = "Success";
      store.setNotificationStatus();
      // hash.value = tx.transactionHash;
    }
  } catch (err) {
    notificationMessage.value = err;
    notificationType.value = "Error while get info";
    store.setNotificationStatus();
    processing.value = false;
  }
  processing.value = false;
}

async function nearToBsc() {
  processing.value = true;
  const validBalance =
    store.nearBalance == null
      ? false
      : numstrToBN(amount.value, 18).lte(store.nearBalance);
  const validAmount = amount.value != "" && amount.value !== "0";

  try {
    if (!validBalance) {
      throw new Error("Your balance is too low, get more Deip tokens");
    }
    if (!validAmount) {
      throw new Error("You can't send zero Deip tokens");
    }

    if (!utils.isAddress(destAddress.value)) {
      throw new Error("Invalid BSC address");
    }

    const tx = await store.bridgeToBSC(
      destAddress.value,
      numstrToBN(amount.value, 18)
    );

    if (tx === "Using old lock") {
      hash.value = "Using old lock";
    }

    if (!tx) {
      throw new Error("Transaction failed from Near to BSC");
    } else {
      notificationType.value = "Success";
      store.setNotificationStatus();
      // hash.value = tx.transactionHash;
    }
  } catch (err) {
    notificationMessage.value = err;
    notificationType.value = "Error while get info";
    store.setNotificationStatus();
    processing.value = false;
  }
  processing.value = false;
}

// const nearConnect = onMounted(() => store.connectNear())
</script>

<style scoped>
.slide-up1-enter-active,
.slide-up1-leave-active,
.slide-up2-enter-active,
.slide-up2-leave-active {
  transition: all 0.6s ease-out;
}

.slide-up1-enter-from {
  opacity: 0;
  transform: translateY(450px);
}

.slide-up1-leave-to {
  opacity: 0;
  transform: translateY(-450px);
}
.slide-up2-enter-from {
  opacity: 0;
  transform: translateY(-450px);
}

.slide-up2-leave-to {
  opacity: 0;
  transform: translateY(450px);
}
@media screen and (max-width: 1024px) {
  .transfer-forms {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .transfer-form {
    width: 95%;
    height: fit-content;
  }

  .main {
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .head-title,
  .sub-title {
    padding: 0 1rem;
  }

  .sub-title {
    font-size: 18px;
  }

  .head-title {
    font-size: 44px;
  }

  .slide-up1-enter-active,
  .slide-up1-leave-active,
  .slide-up2-enter-active,
  .slide-up2-leave-active {
    transition: all 0.4s ease-out;
  }

  .slide-up1-enter-from {
    opacity: 0;
    transform: translateY(0px);
    transform: translateX(400px);
  }
  .slide-up1-leave-to {
    opacity: 0;
    transform: translateY(0px);
    transform: translateX(-400px);
  }
  .slide-up2-enter-from {
    opacity: 0;
    transform: translateY(0px);
    transform: translateX(-400px);
  }
  .slide-up2-leave-to {
    opacity: 0;
    transform: translateY(0px);
    transform: translateX(400px);
  }
}
</style>
