<template>
  <VContainer
    fluid
    class="pa-0 fill-height d-flex align-start "
  >
    <VCard
      class="d-flex flex-column fill-height"
      style="width: 100%; "
    >
      <!-- Header -->
      <VCardTitle
        class="pb-5"
        style="background-color: #172657; border-radius: 10px;"
      >
        <div class="d-flex align-center justify-space-between text-primary">
          <div class="d-flex align-center">
            <img
              src="@/assets/logo.svg"
              alt="Logo"
              class="icon"
            >
          </div>
          <v-btn
            icon
            @click="handleLeave"
          >
            <v-icon
              icon="mdi-door"
              size="large"
            />
          </v-btn>
        </div>
      </VCardTitle>

      <VDivider />

      <!-- Chat content -->
      <VCardText class="py-6 px-0 flex-grow-1 overflow-y-auto">
        <div
          class="d-flex fill-height"
          style="border-radius: 10px; "
        >
          <!-- Sidebar -->
          <div
            class="bg-grey-lighten-3 py-4 px-6"
            style="border-radius: 10px; min-width: 200px;"
          >
            <div class="mb-4">
              <div
                class="d-flex align-center mb-2 px-3 py-2 rounded-md bg-white"
                style="border-radius: 10px;"
              >
                <VIcon icon="mdi-chat-outline" />
                <div class="text-body-1 ml-2 text-capitalize">
                  {{ currentRoom }}
                </div>
              </div>
            </div>

            <div
              class="d-flex align-center mb-2 px-3 py-2 rounded-md bg-white"
              style="border-radius: 10px;"
            >
              <VIcon icon="mdi-account-group-outline" />
              <div class="text-body-1 ml-2">
                Users
              </div>
            </div>

            <v-list
              style="border-radius: 10px;"
              class=" bg-white"
            >
              <v-list-item
                v-for="(user, i) in users"
                :key="i"
              >
                <v-list-item-title>{{ user.username }}</v-list-item-title>
                <VDivider v-if="user.username === route.query.username" />
              </v-list-item>
            </v-list>
          </div>

          <!-- Chat messages -->
          <div class="overflow-y-auto pl-6 flex-fill">
            <div
              v-for="(chat, i) in chats"
              :key="i"
              class="bg-transparent w-full mb-3 d-flex"
              :class="{
                'justify-center': chat.username === 'Vue Chatapp Admin',
                'justify-end': chat.username === route.query.username,
                'justify-start': chat.username !== route.query.username,
              }"
            >
              <div
                class="px-6 py-2 w-50 rounded-md mb-3"
                style="border-radius: 10px;"
                :class="{
                  'bg-red-lighten-4': chat.username === 'Vue Chatapp Admin',
                  'bg-blue-lighten-5': chat.username === route.query.username,
                  'bg-light-green-lighten-4': chat.username !== route.query.username && chat.username !== 'Vue Chatapp Admin',
                }"
              >
                <div class="d-flex align-center gap-x-3">
                  <div class="text-xs text-primary font-semibold mr-4">
                    {{ chat.username }}
                  </div>
                  <div class="text-xs">
                    {{ chat.time }}
                  </div>
                </div>
                <div class="mt-1 text-body-1">
                  {{ chat.text }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </VCardText>

      <VDivider />

      <!-- Footer / Input -->
      <VCardActions class="pt-6">
        <form
          class="w-100 d-flex align-center"
          @submit.prevent="onSubmit"
        >
          <!-- Кнопка вызова окна смайликов -->
          <VBtn
            icon
            variant="text"
            @click="toggleEmojiPicker"
          >
            <VIcon>mdi-emoticon-outline</VIcon>
          </VBtn>

          <!-- Окно смайликов -->
          <VDialog
            v-model="emojiPickerOpen"
            width="400px"
          >
            <VCard>
              <VCardTitle class="d-flex justify-space-between align-center">
                <span>Выберите смайлик</span>
                <VBtn
                  icon
                  @click="emojiPickerOpen = false"
                >
                  <VIcon>mdi-close</VIcon>
                </VBtn>
              </VCardTitle>
              <VDivider />
              <VCardText class="emoji-grid">
                <VBtn
                  v-for="emoji in emojis"
                  :key="emoji"
                  variant="text"
                  class="emoji-btn"
                  @click="addEmoji(emoji)"
                >
                  {{ emoji }}
                </VBtn>
              </VCardText>
            </VCard>
          </VDialog>
    

          <VTextField
            v-model="message"
            placeholder="Message"
            hide-details
            variant="solo"
            elevation="0"
            rounded="lg"
            class="mx-2"
          >
            <template #append-inner>
              <v-btn
                class="px-6"
                :color="isMessageEmpty ? 'grey-lighten-3' : 'primary'"
                :variant="isMessageEmpty ? 'tonal' : 'flat'"
                :disabled="isMessageEmpty"
                @click="handleClick"
              >
                Send
              </v-btn>
            </template>
          </VTextField>
        </form>
      </VCardActions>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import { io, Socket } from 'socket.io-client';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const emojiPickerOpen = ref(false);
const emojis  = [
  '😀', '😂', '🥰', '😎', '🤔', '😍', '👍',
  '❤️', '🔥', '🎉', '🤷', '🙏', '👋', '💯'
] as const

  const isMessageEmpty = computed(() => !message.value || message.value.trim() === '')

  const addEmoji = (emoji: typeof emojis[number]) => {
    message.value += emoji
  }

  // Открыть/закрыть окно смайликов
  const toggleEmojiPicker = () => {
    emojiPickerOpen.value = !emojiPickerOpen.value;
  };

  function handleClick() {
    console.log(message.value);
    socket.value?.emit('chatMessage', message.value);
    nextTick(() => message.value = '')
  }

  function handleLeave() {
    router.push('/');
  }

  type Chat = {
    username: string;
    text: string;
    time: string;
    room?: string;
  };
  type User = {
    id: string;
    username: string;
    room: string;
  };
  const route = useRoute();
  const router = useRouter();
  
  const message = ref('');
  const chats = ref<Chat[]>([
  
  ]);
  const users = ref<User[]>([
  
  ]);
  const currentRoom = ref('')
  const socket = ref<Socket>();
  const onSubmit = async() => {
  
    socket.value?.emit('chatMessage', message.value);
    await nextTick(() => message.value = '')
  }
  onMounted(() => {
    socket.value = io("http://10.69.19.174:5001");
    const { username, room } = route.query as Partial<Chat>;
  
      if(!username || !room){
        router.push('/')
      }
      socket.value?.emit("joinRoom", { username, room });
      socket.value?.on("roomUsers", (response: { room: string, users: User[] }) => {
        users.value = response.users
        currentRoom.value = response.room
      })

      socket.value?.on("loadMessages", (messages: Chat[]) => {
        chats.value = messages // ✅ перезаписываем весь список
      })

      // при новом сообщении — добавляем в чат
      socket.value?.on('message', (message: Chat) => {
        chats.value.push(message)
      })
  
  });
  onBeforeUnmount(() => {
    console.log('[DISCONNECT_BLOCK]');
    socket.value?.disconnect();
  })
  </script>
  
  <style scoped></style>