<template>
  <button
    :class="[
      'w-12 h-12 transition duration-300 active:scale-98 rounded-xl text-neutral-100 flex justify-center',
      btnStyle,
      textStyle
    ]"
    type="button"
  >
  <img :src="status ? camOn : camOff" alt="cam" />
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import camOff from './cam-off.svg';
import camOn from './cam-on.svg';

const props = defineProps<{
  status: boolean
}>()

const btnStyle = computed(() => {
  switch (props.status) {
    case true:
      return 'bg-neutral-900 hover:opacity-75'
    case false:
      return 'bg-feedback-800 hover:opacity-75'

  }
})

const textStyle = computed(() => {
  switch (props.status) {
    case true:
      return 'text-neutral-100 hover:text-brand-100'
    case false:
      return 'text-brand-600'
  }
})
</script>
