<template>
  <VContainer>
    <VForm @submit.prevent="onSubmit">
      <VCard
        max-width="600"
        class="mx-auto pa-5"
      >
        <VCardTitle>
          <div class="d-flex align-center justify-center">
            <VIcon icon="mdi-chat" />
            <h3 class="ml-2">
              Vue Chatapp
            </h3>
          </div>
        </VCardTitle>
        <VCardText class="py-4">
          <VTextField
            v-model="state.username"
            label="Username"
          />
          <VSelect
            v-model="state.room"
            :items="rooms"
            label="Room"
          />
        </VCardText>
        <VCardActions>
          <VBtn
            block
            color="primary"
            :disabled="!state.username || !state.room"
            variant="outlined"
            type="submit"
          >
            Join Chatapp
          </VBtn>
        </VCardActions>
      </VCard>
    </VForm>
  </VContainer>
</template>

<script lang="ts" setup>
  const router = useRouter();
  const rooms = ['vue installation', 'vue guide', 'vue api', 'vue examples'];
  const state = reactive({
    username: '',
    room: rooms[0],
  });
  const onSubmit = () => {
    console.log('[SUBMIT]');
    router.push(`/chat?username=${state.username}&room=${state.room}`);
  };
  
  import { io, type Socket } from 'socket.io-client';
import { onBeforeUnmount, onMounted, ref } from 'vue';
  const socket = ref<Socket>();

  onMounted(() => {
    socket.value = io('http://localhost:3001')
  });
  onBeforeUnmount(() => {
    console.log('[DISCONNECT_BLOCK]');
    socket.value?.disconnect();
  })
</script>
