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
  const router = useRouter();
  const rooms = ref(['']);
  const state = reactive({
    username: [''],
    room: rooms[0],
  });

  onMounted(() => {
    
    // Проверяем и инициализируем пустой массив комнат, если ничего нет
    if (!localStorage.getItem('rooms')) {
      localStorage.setItem('rooms', JSON.stringify([]));
    }

    rooms.value = JSON.parse(localStorage.getItem('rooms') || '[]');
  });

  const onSubmit = () => {
    console.log('[SUBMIT]');
    router.push(`/chat?username=${state.username}&room=${state.room}`);
    addRoom(state.room)
  };


  function addRoom(roomName) {
  // 1. Получаем текущий список комнат
  const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
  
  // 2. Проверяем, нет ли уже такой комнаты (опционально)
  if (!rooms.includes(roomName)) {
    // 3. Добавляем новую комнату
    rooms.push(roomName);
    
    // 4. Сохраняем обновлённый список
    localStorage.setItem('rooms', JSON.stringify(rooms));
    console.log(`Комната "${roomName}" добавлена`);
  } else {
    console.log(`Комната "${roomName}" уже существует`);
  }
}
</script>
