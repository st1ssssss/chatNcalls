<template>
  <h2>callRoom</h2>
  <Avatar :img-src="profilePic" :user-name="user"/>
  <button class="rounded-xl py-2 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center" @click="createNewRoom">Create new room</button>
<ul>
  <li class="flex" v-for="room in rooms" :key="room.id">
    <span>{{ room.name }}</span>
    <button class="rounded-xl py-2 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center" @click="()=>{
      router.push(`/call/${room.id}`)
    }">join {{ room.name }}</button>
  </li>
</ul>
</template>
<script setup lang="ts">
import Avatar from '@/components/Avatar.vue'
import { router } from '@/router'
import { v4 } from 'uuid'
import { onMounted, ref } from 'vue'

const rooms = ref()
const user = ref('') 
const profilePic = ref('')
onMounted(() => {
  const roomsToParse = localStorage.getItem('ROOMS')
  if(typeof roomsToParse == 'string'){
    rooms.value = JSON.parse(roomsToParse)
  }
  const userToParse = localStorage.getItem('USER')
    if(typeof userToParse == 'string'){
    let {userName, profilePicture} = JSON.parse(userToParse)
    profilePic.value = profilePicture
    user.value = userName
  }
})

function createNewRoom() {
  const id = v4()
  rooms.value.push({name: 'room', id})
  localStorage.setItem('ROOMS', JSON.stringify(rooms.value))
  router.push(`/call/${id}`)
}
</script>
