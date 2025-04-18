<template>
  <p class="text-3xl font-bold">AuthPage</p>
  <div class="flex flex-col items-center justify-center">
    <Avatar :user-name="'Kirill Shokurov'" />
    <Button :priority="'primary'">Lorem ipsum dolor sit amet.</Button>
    <Button :priority="'secondary'">Lorem, ipsum dolor.</Button>
    <Button :priority="'tertiary'">Lorem.</Button>
    <ButtonIcon :status="sts" @click="handler"/>
    <ButtonIcon :status="false"/>

</div>
</template>
<script setup lang="ts">
import Avatar from '@/components/Avatar.vue';
import Button from '@/components/Button.vue';
import ButtonIcon from '@/components/ButtonIcon.vue';
import { ref } from 'vue';
defineProps<{
  message: string
}>()

const sts = ref(true)
const handler = () => sts.value = !sts.value
</script>
