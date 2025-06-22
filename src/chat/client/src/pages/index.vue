<template>
  <VContainer>
    <VForm @submit.prevent="onSubmit">
      <VCard
        max-width="600"
        class="mx-auto pa-5"
      >
        <VCardTitle>
          <div class="d-flex align-center justify-center">
            <img
              src="@/assets/logo.svg"
              alt="Logo"
              class="icon"
            >
            <h3 class="ml-2">
              etran Chat
            </h3>
          </div>
        </VCardTitle>
        <VCardText class="py-4">
          <VTextField
            v-model="state.username"
            label="Username"
          />
          <v-combobox
            v-model="state.room"
            :items="rooms"
            label="Room"
            clearable
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
            Join
          </VBtn>
        </VCardActions>
      </VCard>
    </VForm>
  </VContainer>
</template>

<script lang="ts" setup>
  import { io } from 'socket.io-client';
  const router = useRouter();
  let rooms = [''];
  const state = reactive({
    username: [''],
    room: rooms[0],
  });

  onMounted(() => {
    const socket = io("http://localhost:3001");

    // при новом сообщении — добавляем в чат
    socket?.on('getRooms', (roomsRead: string[]) => {
      rooms = roomsRead
    })
  
  });

  const onSubmit = () => {
    console.log('[SUBMIT]');
    router.push(`/chat?username=${state.username}&room=${state.room}`);
  };
</script>
