<template>
    <p class="text-3xl font-bold">Metran Call</p>
    <div class="flex flex-col items-center justify-center">
      <label for="profilePicture">
        <Avatar :img-src="userPicture" :user-name="userName" />
      </label>
      <input @change="handleFile" id="profilePicture" name="profilePicture" type="file" class="hidden" accept="image/png, image/jpeg">
      <div class="flex w-2xs justify-between">
        <input @input="handleUserName" :value="userName" class="bg-neutral-600 w-55 rounded-md p-2" placeholder="Your Name">
        <button @click="saveUserName" class="rounded-md transition duration-300 active:scale-98 bg-neutral-600 px-2 py-1">Save</button>
      </div>

  </div>
</template>
<script setup lang="ts">
import Avatar from '@/components/Avatar.vue';
import { router } from '@/router';
import { v4 } from 'uuid';
import { onMounted, ref } from 'vue';

const inputFile = document.getElementById('profilePicture')

const userName = ref('')
const userPicture = ref('')
onMounted(()=>{
  localStorage.setItem('ROOMS', JSON.stringify([
    {name:'DTM scrum', id: v4()}, {name: 'MTG', id: v4(), description: 'Some description about room'},
    {name:'DTM scrum', id: v4()}, {name: 'MTG', id: v4()},
    {name:'DTM scrum', id: v4()}, {name: 'MTG', id: v4()},
    {name:'DTM scrum', id: v4()}, 
]))
})

function handleUserName(event:Event){
  if(event.target != null){
    userName.value = (event.target as HTMLInputElement).value
  }
}

function saveUserName() {
  localStorage.setItem('USER', JSON.stringify({userName: userName.value, profilePicture: userPicture.value}))
  router.push('/rooms')
}

function handleFile(){
  const inputFile = document.getElementById('profilePicture')

  const img = (inputFile as HTMLInputElement)?.files?.item(0)
  if(img){
    userPicture.value = URL.createObjectURL(img)
    const reader = new FileReader()
    reader.onload = function(e) {
    const base64Image = e.target?.result;
    if(base64Image != null){
      localStorage.setItem('myImage', JSON.stringify(base64Image));
    }
  }
  reader.readAsDataURL(img);
  } 
}
</script>
