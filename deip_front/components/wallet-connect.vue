<template>
  <div v-if="!isConnected" class="wallet-connect">
    <label>your wallet address</label>
    <div
      v-if="bc === 'bsc'"
      @click="store.connectMetamask"
      class="
        border-[1px] border-black
        rounded-[40px]
        px-[8px]
        py-[4px]
        font-semibold
        cursor-pointer
        ease-in
        duration-300
        hover:bg-[#D9EE00]
      "
    >
      connect wallet
    </div>
    <div
      v-if="bc === 'near'"
      @click="store.connectNear"
      class="
        border-[1px] border-black
        rounded-[40px]
        px-[8px]
        py-[4px]
        font-semibold
        cursor-pointer
        ease-in
        duration-300
        hover:bg-[#D9EE00]
      "
    >
      connect wallet
    </div>
  </div>
  <div v-if="isConnected" class="wallet-connect">
    <div class="flex gap-1">
      <img src="~/assets/icons/connected.svg" alt="connected" /><label>{{
        accountId
      }}</label>
    </div>
    <div
      class="
        border-[1px] border-[#0000080]
        rounded-[40px]
        px-[8px]
        py-[4px]
        font-semibold
        cursor-pointer
        text-[#0000080]
        ease-in
        duration-300
        hover:bg-[#D9EE00]
      "
    >
      <label
        v-if="bc === 'bsc'"
        @click="store.resetMetamask"
        class="cursor-pointer"
        >disconnect</label
      >
      <label
        v-if="bc === 'near'"
        @click="store.resetNear"
        class="cursor-pointer"
        >disconnect</label
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { stringify } from "querystring";
import { useStore } from "../store/store";
import { onMounted } from "vue";
import { userInfo, wallet } from "../utils/near_connect";

const store = useStore();

const props = defineProps<{
  bc: string;
}>();

const nearConnect = onMounted(async () => {
  if (props.bc === "near") {
    store.connectNear();
  }
});

const isConnected = computed(() => {
  if (store.nearWalletAddress != null && props.bc === "near") {
    return true;
  }
  if (store.bscSigner != null && props.bc === "bsc") {
    return true;
  }
  return false;
});

const accountId = computed(() => {
  if (props.bc === "near") {
    return store.nearWalletAddress;
  }
  if (props.bc === "bsc") {
    return customString(store.bscWalletAddress);
  }
});

async function connectNear() {
  store.connectNear();
}

function customString(str: string) {
  if (str.length >= 9) {
    return (
      str[0] +
      str[1] +
      str[2] +
      str[3] +
      str[4] +
      str[5] +
      "..." +
      str[str.length - 4] +
      str[str.length - 3] +
      str[str.length - 2] +
      str[str.length - 1]
    );
  } else {
    return str;
  }
}
</script>

<style>
.wallet-connect {
  width: 100%;
  padding: 0 20px;
  height: 55px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 40px;
}
</style>
