<template>
  <div class="flex flex-col relative">
    <div class="flex bg-neutral-700 rounded-xl justify-between">
      <div class="flex justify-between w-full mx-6 my-5">
        <span class="flex flex-col text-start w-full"  @click="()=>{
          router.push(`/rooms/${roomId}`)}">
          <h3>{{ roomName }}</h3>
          <p class="text-neutral-500 text-xs">{{ description != null ? description : 'No description' }}</p>
        </span>
        <button class="rounded-full hover:bg-neutral-400 flex items-center p-2 transition duration-300" @click="copyLink">
          <span class="material-icons">link</span>
        </button>
      </div>
      
    </div>
    <span :class="{
      'opacity-0': !copyLinkFlag,
      'flex items-center rounded-xl px-4 w-full  bottom-0 absolute bg-blue-500 transition-all duration-400': true,
      'opacity-100 py-2':copyLinkFlag
    }">
        <p class="h-full">Link copied</p>
        <span class="material-icons">check</span>
      </span>
  </div>
</template>
<script setup lang="ts">
import { router } from '@/router';
import { ref } from 'vue';

const props = defineProps<{
  roomName: string,
  roomId: string,
  description?:string 
}>()

const copyLinkFlag = ref<boolean>()

function copyLink(){
  navigator.clipboard.writeText(`http://localhost:5173/rooms/${props.roomId}`)
  console.log('here')
  copyLinkFlag.value = true
  setTimeout(()=>{
    copyLinkFlag.value = false
  }, 3000)
}
</script>