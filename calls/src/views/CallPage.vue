<template>
  <div class="w-full h-full flex flex-col items-center justify-between">
    <div class="flex justify-between gap-3.5">
      <VideoCell class="w-2xl h-96 bg-violet-300" ref="localVideo" autoplay muted playsinline></VideoCell>
      <VideoCell class="w-2xl h-96 bg-violet-300" ref="remoteVideo" autoplay playsinline></VideoCell>
    </div>
    <div class="flex gap-1">
      <button class="rounded-xl py-4 px-8 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"  @click="joinRoom">join</button>
      <button class="rounded-xl py-4 px-8 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"  @click="startCall">call</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import VideoCell from '@/components/VideoCell.vue';
import { io, Socket } from 'socket.io-client';
import { onMounted, ref } from 'vue';
import { router } from '../router';

let socket: Socket
const localStream = ref<MediaStream>()
const remoteStream = ref<MediaStream|null>()
const roomId = '1234'
const localId = ref<string>()
const remoteId = ref<string>()
const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const peerConnection = ref<RTCPeerConnection|null>()
const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function initializeMedia() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value;
    }
  } catch (err) {
    console.error('Media error:', err);
  }
}

function joinRoom() {
  socket.emit('join-room', roomId);
}

async function startCall() {
  peerConnection.value = new RTCPeerConnection(iceServers)

  remoteStream.value = new MediaStream()
  if(remoteVideo.value){
    remoteVideo.value.srcObject = remoteStream.value
  }

  localStream.value!.getTracks().forEach(track => {
    peerConnection.value?.addTrack(track, localStream.value!);
  });

  if (remoteVideo.value) {
    remoteVideo.value.srcObject = remoteStream.value;
    peerConnection.value.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteStream.value?.addTrack(track)
        });;
    }
  };

  peerConnection.value.onicecandidate = async (event)=> {
    if(event.candidate){
      console.log(event.candidate)
    }
  }

  let offer = await peerConnection.value.createOffer()
  await peerConnection.value.setLocalDescription(offer)

}

async function handleUserJoined (userId: string){
  console.log('A new user joined the channel: ', userId)
}

onMounted(async () => {
  await initializeMedia();
  //При переходе на эту страницу звонка, считывать с юрл id комнаты и отправлять запрос на сервер о присоединеии к комнате
  //Далее при присоединеии отправлять оффер всем кто есть в комнате
  
  socket = io('http://localhost:5000');
  localId.value = socket.id;
  const roomID = router
  // Socket listeners
  socket.on('existing-users', (users) => {
    if (users.length > 0) remoteId.value = users[0].id;
  });

  socket.on('connectedUser', async(user)=>{ handleUserJoined(user)});

  // socket.value.on('offer', handleIncomingOffer);

  socket.on('answer', async (payload: { answer: RTCSessionDescriptionInit }) => {
    if (!peerConnection.value) return;
    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(payload.answer));
  });

  socket.on('ice-candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
    try {
      await peerConnection.value?.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (err) {
      console.error('ICE candidate error:', err);
    }
  });

  socket.on('user-disconnected', endCall);
});

function endCall() {
  if (peerConnection.value) {
    peerConnection.value.close();
    peerConnection.value = null;
  }
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach(track => track.stop());
    remoteStream.value = null;
  }
}
</script>