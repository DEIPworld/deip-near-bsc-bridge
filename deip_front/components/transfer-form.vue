<template>
  <div
    class="
      w-[500px]
      h-[420px]
      border-2 border-black
      rounded-[40px]
      p-[32px]
      flex flex-col
      gap-[1rem]
    "
  >
    <label>{{ type === "from" ? "from" : "to" }}</label>
    <div class="flex gap-2 items-center">
      <img v-if="bc === 'near'" src="~/assets/icons/near.svg" alt="bcLogo" />
      <img v-if="bc === 'bsc'" src="~/assets/icons/bsc.svg" alt="bcLogo" />
      <h2>{{ bc === "near" ? "NEAR" : "Binance Smart Chain" }}</h2>
    </div>
    <wallet-connect :bc="bc" v-if="type === 'from'" />
    <div v-if="type === 'to'" class="inputfield">
      <input
        :value="destAddress"
        @input="(event) => $emit('update:destAddress', event.target.value)"
        id="inputField"
        style="width: 100%"
        class="bid_input"
        type="text"
      />
    </div>
    <div v-if="type === 'from'">
      <label>amount</label>
      <div @click="setFocus" class="inputfield">
        <input
          id="inputField"
          :value="amount"
          @input="(event) => $emit('update:amount', event.target.value)"
          class="bid_input"
          type="text"
          maxlength="19"
        />
        <span class="token-symbol">DEIP</span>
        <span
          @click="
            $emit(
              'update:amount',
              bc === 'near'
                ? BNToNumstr(store.nearBalance, 18, 3)
                : BNToNumstr(store.bscBalance, 18, 3)
            )
          "
          class="max-span"
          >MAX</span
        >
      </div>
    </div>
    <div v-if="type === 'from'" class="info">
      <div class="info-item">
        <p>balance</p>
        <p>{{ balance }} DEIP</p>
      </div>
      <div class="info-item">
        <p>fee</p>
        <p>{{ calculatedFee }} DEIP</p>
      </div>
      <!--
      <div class="info-item">
        <p>minimum amount</p>
        <p>000.000 DEIP</p>
      </div>-->
    </div>
    <div v-if="type === 'to'">
      <label>to</label>
      <div class="inputfield">
        <span>{{ amountToRecive }} DEIP</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { BNToNumstr, numstrToBN, useStore } from "../store/store";
import { onMounted } from "vue";
import { BigNumber } from "ethers";

const store = useStore();

const props = defineProps<{
  amount: string;
  destAddress: string;
  type: string;
  bc: string;
}>();

defineEmits<{
  (event: "update:destAddress", value: string): void;
  (event: "update:amount", value: string): void;
}>();

onMounted(async () => {
  await store.fetchFee();
  console.log(store.NEARFee, '11')
  console.log(store.BSCFee, '22')
});

const imgUrl = computed(() => `~/assets/icons/${props.bc}.svg`);

const decimalNear = BigNumber.from(10).pow(15);

const formatBalance = (val: BigNumber) =>
  val && val.toString() != "0"
    ? val.div(decimalNear).toString().slice(0, -3) +
      "." +
      val.div(decimalNear).toString().slice(-3)
    : 0;

const balance = computed(() => {
  if (props.bc === "near") {
    return formatBalance(store.nearBalance);
  } else {
    return formatBalance(store.bscBalance);
  }
});

const betPlaceholder = function () {
  if (!props.amount) {
    return "000.000 DEIP";
  } else if (props.amount.indexOf(".") > -1) {
    return "DEIP";
  } else if (props.amount) {
    return ".000 DEIP";
  }
};

const setFocus = function () {
  const input = document.getElementById("inputField");
  input.focus();
};

const calculatedFee = computed(() => {
  if (props.bc === "near") {
    return BNToNumstr(store.NEARFee, 18, 18);
  } else {
    return BNToNumstr(store.BSCFee, 18, 18);
  }
});

const amountToRecive = computed(() => {
  const NEARFee = store.NEARFee || "0";
  const BSCFee = store.BSCFee || "0";

  let recieveAmount;

  if (props.bc === "near") {
    recieveAmount = numstrToBN(props.amount, 18).sub(BSCFee);
  } else {
    recieveAmount = numstrToBN(props.amount, 18).sub(NEARFee);
  }
  return recieveAmount.lt(0) ? "0" : BNToNumstr(recieveAmount, 18, 3);
});
</script>

<style scoped>
.inputfield {
  cursor: text;
  outline: none;
  width: 100%;
  border: 1px solid #e6e6e6;
  border-radius: 42px;
  font-size: 24px;
  font-weight: 600;
  height: 55px;
  padding: 0 20px;
  display: flex;
  color: grey;
  align-items: center;
  margin-top: 10px;
  position: relative;
}

.bid_input {
  outline: none;
  color: #000;
  border: none;
}

.token-symbol {
  color: grey;
  font-weight: 600;
  font-size: 24px;
  position: absolute;
  right: 85px;
}

.max-span {
  color: #d9ee00;
  font-weight: 600;
  font-size: 24px;
  position: absolute;
  padding-left: 6px;
  right: 1rem;
  border-left: 2px solid gray 60%;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  color: #00000080;
}
</style>
