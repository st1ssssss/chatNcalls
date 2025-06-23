<script setup lang="ts">
import avatar from '@/assets/base-avatar.svg';
defineProps<{ userName: string; imgSrc?: string }>()
</script>

<template>
  <div class="flex flex-col items-center">
    <img :src="imgSrc ? imgSrc : avatar" alt="" class="w-20 h-20" />
    <p>{{ userName.length > 10 ? userName.substring(0, 10) + '...' : userName }}</p>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
