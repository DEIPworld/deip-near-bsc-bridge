<template>
    <div
      v-if="showNotification && store.notificationStatus"
      class="rounded-[8px] w-[340px]  z-50 sm:w-[400px] h-fit bg-[#ffffff] p-[0.5rem] flex gap-[1rem] border-black border-2 text-[#272727f3] relative"
    >
      <img :src="imgTypeSrc" alt="" />
      <div class="flex flex-col gap-1 w-[320px]">
        <h3>{{ props.type }}</h3>
        <div class="w-[300px]">
          <p>{{ msg }}</p>
        </div>
        <div
          @click="copyHash"
          v-if="props.type === 'Success'"
          class="flex gap-1 cursor-pointer w-[460px]"
        >
          <img src="~/assets/icons/copy.svg" alt="copy" class="w-[24px]" />
          <div>
            <p
              id="hash"
              class="text-[#C398FF] w-[250px] hover:text-[#aa7aec] whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {{ hash }}
            </p>
          </div>
        </div>
      </div>
      <img
        @click="setShowNotification"
        class="absolute top-3 right-3 cursor-pointer"
        src="~/assets/icons/close.svg"
        alt="close"
      />
    </div>
</template>

<script setup lang="ts">
import {computed} from "vue";
import { useStore } from "../store/store";

const store = useStore();

const props = defineProps<{
  type: string; // Error, Success, Info
  hash?: string;
  message?: string
}>();

const showNotification = ref(true);

const msg = computed(() => {
  if (props.type === "Success") {
    return "You can follow the status of your transaction with this transaction hash:";
  } else {
    return props.message
  }
});

const imgTypeSrc = computed(() => `../assets/icons/${props.type}.svg`)

const setShowNotification = () => {
  showNotification.value = false;
  store.setNotificationStatus();
  showNotification.value = true;
};

const copyHash = () => {
  const str = document.getElementById("hash").innerText;

  const el = document.createElement("textarea");
  el.value = str;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
};
</script>
