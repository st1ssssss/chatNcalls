<template>
  <button
    :class="[
      'w-full transition duration-300 active:scale-98 py-3 px-1 rounded-xl',
      btnStyle,
      textStyle
    ]"
    type="button"
  >
    <slot></slot>
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  priority: 'primary' | 'secondary' | 'tertiary'
}>()

const btnStyle = computed(() => {
  switch (props.priority) {
    case 'primary':
      return 'bg-brand-600 hover:bg-brand-400'
    case 'secondary':
      return 'bg-neutral-200 hover:bg-neutral-300'
    case 'tertiary':
      return 'bg-white'
  }
})

const textStyle = computed(() => {
  switch (props.priority) {
    case 'primary':
      return 'text-neutral-100 hover:text-brand-100'
    case 'secondary':
      return 'text-brand-600'
    case 'tertiary':
      return 'text-neutral-600'
  }
})
</script>
