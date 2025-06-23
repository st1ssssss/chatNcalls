<template>
  <button
    :class="[
      'w-12 h-12 transition duration-300 active:scale-98 rounded-xl text-neutral-100 flex justify-center',
      btnStyle,
      textStyle
    ]"
    type="button"
  >
  <img :src="status ? btnOn : btnOff" alt="cam" />
  </button>
  <span>
    <slot></slot>
  </span>
</template>
<script setup lang="ts">
import camOn from '@/assets//cam-on.svg';
import chat from '@/assets//chat.svg';
import leave from '@/assets//leave-room.svg';
import micOff from '@/assets//mic-off.svg';
import micOn from '@/assets//mic-on.svg';
import share from '@/assets//screenshare.svg';
import camOff from '@/assets/cam-off.svg';
import { computed, onMounted, ref } from 'vue';


const props = defineProps<{
  status: boolean,
  type: 'cam' | 'mic' | 'share' | 'leave' | 'chat'
}>()

const btnOn = ref<string>()
const btnOff = ref<string>()

const btnStyle = computed(() => {
  switch (props.status) {
    case true:
      return 'bg-neutral-900 hover:opacity-75'
    case false:
      return 'bg-feedback-800 hover:opacity-75'

  }
})

onMounted(()=>{
    switch (props.type) {
      case 'cam':
          btnOn.value = camOn 
          btnOff.value = camOff 
        break
      case 'mic':
          btnOn.value = micOn 
          btnOff.value = micOff 
        break
      case 'share':
          btnOn.value = share 
          btnOff.value = share 
        break
      case 'leave':
          btnOn.value = leave 
          btnOff.value = leave 
        break
      case 'chat':
          btnOn.value = chat 
          btnOff.value = chat 
        break
      default:
        btnOn.value = camOn 
        btnOff.value = camOff 
        break
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
