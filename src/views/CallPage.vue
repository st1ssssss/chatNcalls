<template>
  <div class="w-full h-full flex flex-col items-center justify-between">
    <div class="flex justify-between gap-3.5">
      <VideoCell class="w-2xl h-96 bg-violet-300" ref="localVideo" autoplay muted playsinline></VideoCell>
      <VideoCell class="w-2xl h-96 bg-violet-300" ref="remoteVideo" autoplay playsinline></VideoCell>
    </div>
    <div class="flex gap-1">
      <button @click="joinRoom">join</button>
      <button @click="startCall">call</button>
            <button @click="joinRoom">join</button>
      <button @click="startCall">call</button>
            <button @click="joinRoom">join</button>
      <button @click="startCall">call</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { io, Socket } from 'socket.io-client'
import { onMounted, ref } from 'vue'
import VideoCell from '../components/VideoCell.vue'

const socket = ref<Socket>()
const localStream = ref<MediaStream>()
const remoteStream = ref<MediaStream>()
const roomId = '1234'
const localId = ref<string>()
const remoteId = ref<string>()
const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const peerConnection = ref<RTCPeerConnection>()
const iceServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

async function initializeMedia() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
    }
  } catch (err) {
    console.error('Media error:', err)
  }
}

function joinRoom() {
  socket.value?.emit('join-room', roomId)
}

function setupPeerConnection() {
  peerConnection.value = new RTCPeerConnection(iceServers)

  // Add local tracks
  localStream.value?.getTracks().forEach(track => {
    peerConnection.value?.addTrack(track, localStream.value!)
  })

  // Setup remote track handling
  peerConnection.value.ontrack = event => {
    remoteStream.value = event.streams[0]
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = remoteStream.value
    }
  }

  // ICE Candidate handling
  peerConnection.value.onicecandidate = event => {
    if (event.candidate && remoteId.value) {
      socket.value?.emit('ice-candidate', {
        targetUserId: remoteId.value,
        candidate: event.candidate
      })
    }
  }
}

async function startCall() {
  if (!remoteId.value) {
    console.error('No remote user selected')
    return
  }

  try {
    const offer = await peerConnection.value!.createOffer()
    await peerConnection.value!.setLocalDescription(offer)

    socket.value?.emit('offer', {
      targetUserId: remoteId.value,
      offer: offer
    })
  } catch (err) {
    console.error('Offer error:', err)
  }
}

async function handleIncomingOffer(payload: { offer: RTCSessionDescriptionInit }) {
  if (!peerConnection.value) setupPeerConnection()

  try {
    await peerConnection.value!.setRemoteDescription(new RTCSessionDescription(payload.offer))
    const answer = await peerConnection.value!.createAnswer()
    await peerConnection.value!.setLocalDescription(answer)

    socket.value?.emit('answer', {
      targetUserId: remoteId.value,
      answer: answer
    })
  } catch (err) {
    console.error('Answer error:', err)
  }
}

onMounted(async () => {
  await initializeMedia()
  setupPeerConnection()

  socket.value = io('http://localhost:3002')
  localId.value = socket.value.id

  // Socket listeners
  socket.value.on('existing-users', users => {
    if (users.length > 0) remoteId.value = users[0].id
  })

  socket.value.on('new-user-connected', user => {
    remoteId.value = user.id
  })

  socket.value.on('offer', handleIncomingOffer)

  socket.value.on('answer', async (payload: { answer: RTCSessionDescriptionInit }) => {
    if (!peerConnection.value) return
    await peerConnection.value.setRemoteDescription(new RTCSessionDescription(payload.answer))
  })

  socket.value.on('ice-candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
    try {
      await peerConnection.value?.addIceCandidate(new RTCIceCandidate(payload.candidate))
    } catch (err) {
      console.error('ICE candidate error:', err)
    }
  })

  socket.value.on('user-disconnected', endCall)
})

function endCall() {
  if (peerConnection.value) {
    peerConnection.value.close()
  }
  if (remoteStream.value) {
    remoteStream.value.getTracks().forEach(track => track.stop())
  }
}
</script>
