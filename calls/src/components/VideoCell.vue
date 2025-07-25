<template>
    <video class="rounded-lg" poster="@/assets/base-avatar.svg" v-bind="$attrs" autoplay muted playsinline></video>
</template>
<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})
</script>
