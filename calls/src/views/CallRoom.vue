<template>
  <header class="flex items-center justify-between px-3 py-3 bg-neutral-600 rounded-b-lg">
    <div class="logo">
    <img :src="Logo" alt="" srcset="">
    </div>
    <Avatar :img-src="profilePic" :user-name="user"/>
  </header>
  <button class="rounded-xl mt-2 py-2 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center" @click="createNewRoom">Create new room</button>
  <div class="h-full">
    <div class="flex gap-8 my-4">
      <p :class="{'opacity-100':!sliderrec, 'opacity-50':!sliderfav}" 
      @click="()=>{changeTab('rec')}">Recent</p>
      <p :class="{'opacity-100':!sliderfav, 'opacity-50':!sliderrec}" 
      @click="()=>{changeTab('fav')}">Favourites</p>
    </div>
    <div class="overflow-hidden h-full relative transition duration-400">
      <ul id="rec" :class="{'grid grid-cols-4 gap-4 transition-all duration-400 absolute':true, '-right-full left-full':sliderrec, 'right-0 left-0':sliderfav}">
      <RoomCard v-for="room in rooms" :key="room.id" :room-id="room.id" :room-name="room.name" :description="room.description ? room.description : null"/>
    </ul>
      <ul id="fav" :class="{'grid grid-cols-4 gap-4 transition-all duration-400 absolute':true, '-left-full right-full':sliderfav, 'right-0 left-0':sliderrec}">
      <RoomCard v-for="room in rooms" :key="room.id" :room-id="room.id" :room-name="room.name" :description="room.description ? room.description : null"/>
    </ul>
    </div>
  </div>

</template>
<script setup lang="ts">
import Avatar from '@/components/Avatar.vue';
import RoomCard from '@/components/RoomCard.vue';
import { router } from '@/router';
import { v4 } from 'uuid';
import { onMounted, ref } from 'vue';
import Logo from '../../../chat/client/src/assets/logo.svg';

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

const sliderfav = ref(true)
const sliderrec = ref(false)


function createNewRoom() {
  const id = v4()
  rooms.value.push({name: 'room', id})
  localStorage.setItem('ROOMS', JSON.stringify(rooms.value))
  router.push(`/rooms/${id}`)
}
function changeTab(param:'rec'|'fav'){
  if(param == 'fav'){
    sliderfav.value = false
    sliderrec.value = true
    console.log(sliderfav.value, sliderrec.value)
  }else{
    sliderrec.value =false
    sliderfav.value = true
    console.log(sliderfav.value, sliderrec.value)

  }
}
</script>
