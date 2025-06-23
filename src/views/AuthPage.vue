<template>
    <p class="text-3xl font-bold">AuthPage</p>
    <div class="flex flex-col items-center justify-center">
      <Avatar :user-name="'Kirill Shokurov'" />
      <Button :priority="'primary'">Lorem ipsum dolor sit amet.</Button>
      <Button :priority="'secondary'">Lorem, ipsum dolor.</Button>
      <Button :priority="'tertiary'">Lorem.</Button>
      <ButtonIcon :type="'cam'" :status="sts" @click="handler"/>
      <ButtonIcon :type="'chat'" :status="sts" @click="handler"/>
      <ButtonIcon :type="'leave'" :status="sts" @click="handler"/>
      <ButtonIcon :type="'mic'" :status="sts" @click="handler"/>
      <ButtonIcon :type="'share'" :status="sts" @click="handler"/>
  
  </div>
</template>
<script setup lang="ts">
import Avatar from '@/components/Avatar.vue';
import Button from '@/components/Button.vue';
import ButtonIcon from '@/components/ButtonIcon.vue';
import { ref } from 'vue';

const sts = ref(true)
const handler = () => sts.value = !sts.value
</script>
