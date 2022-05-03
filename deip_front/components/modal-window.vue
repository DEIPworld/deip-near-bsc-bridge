<template>
  <div
    v-if="this.store.openModal"
    class="
      absolute
      flex
      justify-center
      items-center
      w-full
      h-full
      bg-black
      z-10
      bg-opacity-[0.6]
    "
  >
    <div class="modal w-[490px] h-[360px] bg-white rounded-[40px]">
      <div
        class="
          relative
          flex
          justify-center
          items-center
          head
          bg-[#D9EE00]
          h-[90px]
          w-full
          rounded-t-[40px]
          font-bold
          text-[32px]
        "
      >
        Connect to a Wallet
        <img
          @click="this.store.setOpenModal(false)"
          class="close"
          src="~/assets/icons/close.svg"
          alt=""
        />
      </div>
      <div
        class="mt-4 flex flex-col gap-4 justify-center items-center px-[32px]"
      >
        <p>To continue you need to connect to a Wallet</p>
        <div
          @click="this.store.connectNear()"
          class="
            flex
            w-full
            justify-center
            items-center
            border-[1px] border-black
            rounded-[40px]
            py-[16px]
            font-bold
            cursor-pointer
            text-[24px]
            gap-4
          "
        >
          <img src="~/assets/icons/wallet.svg" alt="wallet" />
          <span>Connect Wallet</span>
        </div>
        <div
          class="
            flex
            w-full
            justify-center
            items-center
            border-[1px] border-black
            rounded-[40px]
            py-[16px]
            font-bold
            cursor-pointer
            text-[24px]
            gap-4
          "
        >
          <img src="~/assets/icons/metamask.png" alt="wallet" />
          <span>Connect Wallet</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "../store/store";
import { walletConnect } from "../near-utils";
const store = useStore();
</script>

<style scoped>
.close {
  position: absolute;
  right: 1.5rem;
  top: 1.5rem;
  cursor: pointer;
}
</style>