<template>
  <div class="w-full h-full flex flex-col items-center justify-between">
    <div class="flex justify-between gap-3.5">
      <video class="w-2xl h-96 bg-neutral-600 rounded-xl" ref="localVideo" autoplay muted playsinline></video>
      <video class="w-2xl h-96 bg-neutral-600 rounded-xl" ref="remoteVideo" autoplay playsinline></video>
    </div>
    <div class="flex gap-1">
      <button class="rounded-xl py-4 px-8 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"  @click="endCall">decline</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { router } from '@/router';
import { io, Socket } from 'socket.io-client';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
let socket: Socket
const localStream = ref<MediaStream>()
const remoteStream = ref<MediaStream|null>()
const roomId = '1234'
const localId = ref<string>()
const remoteId = ref<string>()
const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const peerConnection = ref<RTCPeerConnection|null>()
const roomID = ref<string>()
const offer = ref()
const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const route = useRoute()

async function initializeMedia() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value;
    }
  } catch (err) {
    console.error('Media error:', err);
  }
}


async function startCall() {
  peerConnection.value = new RTCPeerConnection(iceServers)
  await initializeMedia()
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

  offer.value = await peerConnection.value.createOffer()
  await peerConnection.value.setLocalDescription(offer.value)

}

async function handleUserJoined (userId: string){
  console.log('A new user joined the channel: ', userId)
}

onMounted(async () => {
  
  socket = io('http://localhost:5000');
  localId.value = socket.id;
  roomID.value = route.params.id as string
  await startCall()
  socket.emit('join-room', {roomId: roomID.value, offer: offer.value})
  // Socket listeners
  socket.on('offer', async (offer) => {
    peerConnection.value?.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.value?.createAnswer()
    await peerConnection.value?.setLocalDescription(answer)
    socket.emit('answer', {roomId: roomID.value, answer: answer })
  });
    peerConnection.value!.onicecandidate = async (event)=> {
    if(event.candidate){
      console.log(event.candidate)
      socket.emit('ice-candidate', {roomId: roomID.value, candidate: event.candidate })
    }
  }

  socket.on('answer', async (payload:any) => {
    if (!peerConnection.value) return;
    console.log('Answer from signal: ', payload)
    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(payload));
  });

  socket.on('ice-candidate', async (payload: any) => {
    try {
      console.log('ice from signal: ', payload)
      await peerConnection.value?.addIceCandidate(new RTCIceCandidate(payload ));
    } catch (err) {
      console.error('ICE candidate error:', err);
    }
  });

  socket.on('user-disconnected', endCall);
});

onBeforeUnmount(()=>{
  socket.emit('before-disconnect', roomID.value)
})

function endCall() {
  if (peerConnection.value) {
    peerConnection.value.close();
    peerConnection.value = null;
  }
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach(track => track.stop());
    remoteStream.value = null;
  }
  router.push('/rooms')
}
</script>