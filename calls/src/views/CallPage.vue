<template>
  <div class="w-full h-full flex flex-col items-center justify-between">
    <div class="flex flex-wrap justify-center gap-3.5" id="videos-container">
      <div class="relative">
        <video
          class="w-2xl h-96 bg-neutral-600 rounded-xl object-cover"
          ref="localVideo"
          autoplay
          muted
          playsinline
        ></video>
        <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          You
        </div>
      </div>
    </div>
    <div class="flex gap-1 pt-2">
      <button
        class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"
      >
        <span class="material-symbols-outlined">{{ mic ? 'mic' : 'mic_off' }}</span>
      </button>
      <button
        class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"
      >
        <span class="material-icons-outlined">{{ videocam ? 'videocam' : 'videocam_off' }}</span>
      </button>
      <button
        class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"
        @click="toggleScreenShare"
      >
        <span class="material-icons-outlined">{{
          isScreenSharing ? 'stop_screen_share' : 'screen_share'
        }}</span>
      </button>
      <button
        class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-red-600 text-neutral-100 flex justify-center"
        @click="endCall"
      >
        <span class="material-icons-outlined">call_end</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { router } from '@/router'
import * as mediasoupClient from 'mediasoup-client'
import { io, Socket } from 'socket.io-client'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

let socket: Socket
const localStream = ref<MediaStream>()
const roomID = ref<string>()
const mic = ref(true)
const videocam = ref(true)
const route = useRoute()
const isEndingCall = ref(false)
const isScreenSharing = ref(false)
const cameraTrack = ref<MediaStreamTrack | null>(null)
const screenTrack = ref<MediaStreamTrack | null>(null)
const wasVideoEnabledBeforeShare = ref(true)

// Mediasoup variables
let device: mediasoupClient.Device
let room: any = {
  transports: new Map(),
  producers: new Map(),
  consumers: new Map(),
  peers: new Map()
}

const localVideo = ref<HTMLVideoElement>()

async function initializeMedia() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true
    })

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value
    }

    cameraTrack.value = localStream.value.getVideoTracks()[0] ?? null
  } catch (err) {
    console.error('Media error:', err)
  }
}

function findProducerByKind(kind: 'audio' | 'video'): any {
  return Array.from(room.producers.values()).find((producer: any) => producer.track?.kind === kind)
}

async function toggleMic() {
  const audioTrack = localStream.value?.getAudioTracks()[0]
  if (!audioTrack) return

  mic.value = !mic.value
  audioTrack.enabled = mic.value

  const audioProducer = findProducerByKind('audio')
  if (!audioProducer) return

  if (mic.value) {
    audioProducer.resume()
  } else {
    audioProducer.pause()
  }
}

async function toggleCam() {
  const currentVideoTrack = localStream.value?.getVideoTracks()[0]

  videocam.value = !videocam.value

  if (currentVideoTrack) {
    currentVideoTrack.enabled = videocam.value
  }

  const videoProducer = findProducerByKind('video')
  if (!videoProducer) return

  if (videocam.value) {
    videoProducer.resume()
  } else {
    videoProducer.pause()
  }
}

function replaceLocalVideoTrack(nextTrack: MediaStreamTrack) {
  if (!localStream.value) return

  localStream.value.getVideoTracks().forEach(track => {
    localStream.value?.removeTrack(track)
  })

  localStream.value.addTrack(nextTrack)

  if (localVideo.value) {
    localVideo.value.srcObject = localStream.value
  }
}

async function stopScreenShare() {
  if (!isScreenSharing.value) return

  const videoProducer = findProducerByKind('video')
  let camTrack = cameraTrack.value

  if (!camTrack || camTrack.readyState === 'ended') {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      })
      camTrack = camStream.getVideoTracks()[0] ?? null
      cameraTrack.value = camTrack
    } catch (error) {
      console.error('Error restoring camera after screen share:', error)
      isScreenSharing.value = false
      screenTrack.value = null
      return
    }
  }

  if (camTrack && videoProducer) {
    await videoProducer.replaceTrack({ track: camTrack })
    replaceLocalVideoTrack(camTrack)
    camTrack.enabled = wasVideoEnabledBeforeShare.value
  }

  if (screenTrack.value) {
    screenTrack.value.onended = null
    if (screenTrack.value.readyState !== 'ended') {
      screenTrack.value.stop()
    }
  }

  screenTrack.value = null
  isScreenSharing.value = false

  videocam.value = wasVideoEnabledBeforeShare.value
  if (videoProducer) {
    if (videocam.value) {
      videoProducer.resume()
    } else {
      videoProducer.pause()
    }
  }
}

async function toggleScreenShare() {
  if (isScreenSharing.value) {
    await stopScreenShare()
    return
  }

  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    })

    const newScreenTrack = displayStream.getVideoTracks()[0]
    if (!newScreenTrack) return

    const videoProducer = findProducerByKind('video')
    if (!videoProducer) {
      newScreenTrack.stop()
      return
    }

    wasVideoEnabledBeforeShare.value = videocam.value
    await videoProducer.replaceTrack({ track: newScreenTrack })

    const currentCameraTrack = localStream.value?.getVideoTracks()[0] ?? null
    if (currentCameraTrack && currentCameraTrack !== newScreenTrack) {
      cameraTrack.value = currentCameraTrack
    }

    replaceLocalVideoTrack(newScreenTrack)

    screenTrack.value = newScreenTrack
    isScreenSharing.value = true
    videocam.value = true
    newScreenTrack.enabled = true
    videoProducer.resume()

    newScreenTrack.onended = () => {
      stopScreenShare()
    }
  } catch (error) {
    console.error('Error starting screen share:', error)
  }
}

// Mediasoup functions
async function createSendTransport() {
  try {
    const data = await socket.emitWithAck('create-transport', {
      roomId: roomID.value,
      direction: 'send'
    })

    if (data.error) {
      throw new Error(data.error)
    }

    const transport = device.createSendTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters
    })

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await socket.emitWithAck('connect-transport', {
          roomId: roomID.value,
          transportId: transport.id,
          dtlsParameters
        })
        callback()
      } catch (error: any) {
        errback(error)
      }
    })

    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await socket.emitWithAck('produce', {
          roomId: roomID.value,
          transportId: transport.id,
          kind,
          rtpParameters
        })
        callback({ id })
      } catch (error: any) {
        errback(error)
      }
    })

    transport.on('connectionstatechange', state => {
      console.log('Send transport state:', state)
    })

    return transport
  } catch (error) {
    console.error('Create send transport error:', error)
    throw error
  }
}

async function createRecvTransport() {
  try {
    const data = await socket.emitWithAck('create-transport', {
      roomId: roomID.value,
      direction: 'recv'
    })

    if (data.error) {
      throw new Error(data.error)
    }

    const transport = device.createRecvTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters
    })

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await socket.emitWithAck('connect-transport', {
          roomId: roomID.value,
          transportId: transport.id,
          dtlsParameters
        })
        callback()
      } catch (error: any) {
        errback(error)
      }
    })

    transport.on('connectionstatechange', state => {
      console.log('Recv transport state:', state)
    })

    return transport
  } catch (error) {
    console.error('Create recv transport error:', error)
    throw error
  }
}

async function produceMedia(transport: any) {
  if (!localStream.value) return

  // Аудио
  const audioTrack = localStream.value.getAudioTracks()[0]
  if (audioTrack) {
    try {
      const audioProducer = await transport.produce({ track: audioTrack })
      room.producers.set(audioProducer.id, audioProducer)
    } catch (error) {
      console.error('Produce audio error:', error)
    }
  }

  // Видео
  const videoTrack = localStream.value.getVideoTracks()[0]
  if (videoTrack) {
    try {
      const videoProducer = await transport.produce({ track: videoTrack })
      room.producers.set(videoProducer.id, videoProducer)
    } catch (error) {
      console.error('Produce video error:', error)
    }
  }
}

async function consumeProducer(peerId: string, producerId: string, kind: string) {
  try {
    // Создаем транспорт для приема, если его нет
    if (!room.transports.has('recv')) {
      const recvTransport = await createRecvTransport()
      room.transports.set('recv', recvTransport)
    }

    const recvTransport = room.transports.get('recv')

    const data = await socket.emitWithAck('consume', {
      roomId: roomID.value,
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities
    })

    if (data.error) {
      throw new Error(data.error)
    }

    const consumer = await recvTransport.consume({
      id: data.id,
      producerId: data.producerId,
      kind: data.kind,
      rtpParameters: data.rtpParameters
    })

    // Resume consumer
    await socket.emitWithAck('resume-consumer', {
      roomId: roomID.value,
      consumerId: consumer.id
    })

    // Сохраняем consumer
    if (!room.consumers.has(peerId)) {
      room.consumers.set(peerId, new Map())
    }
    room.consumers.get(peerId).set(producerId, consumer)

    // Создаем видео элемент для удаленного потока
    const stream = new MediaStream()
    stream.addTrack(consumer.track)

    // Добавляем видео элемент в DOM
    await nextTick()
    const videoElement = document.createElement('video')
    videoElement.className = 'w-2xl h-96 bg-neutral-600 rounded-xl object-cover'
    videoElement.autoplay = true
    videoElement.playsInline = true
    videoElement.srcObject = stream

    const videoContainer = document.createElement('div')
    videoContainer.className = 'relative'
    videoContainer.id = `peer-${peerId}`

    const nameDiv = document.createElement('div')
    nameDiv.className =
      'absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded'
    nameDiv.textContent = `User ${peerId.slice(0, 5)}`

    videoContainer.appendChild(videoElement)
    videoContainer.appendChild(nameDiv)

    const videosContainer = document.getElementById('videos-container')
    if (videosContainer) {
      videosContainer.appendChild(videoContainer)
    }
  } catch (error) {
    console.error('Consume error:', error)
  }
}

async function startCall() {
  try {
    await initializeMedia()

    // Получаем RTP capabilities от сервера
    const data = await socket.emitWithAck('join-room', { roomId: roomID.value })
    if (data.error) throw new Error(data.error)

    // Загружаем device
    device = new mediasoupClient.Device()
    await device.load({ routerRtpCapabilities: data.routerRtpCapabilities })

    // Создаем транспорт для отправки
    const sendTransport = await createSendTransport()
    room.transports.set('send', sendTransport)

    // Начинаем отправку медиа
    await produceMedia(sendTransport)
  } catch (error) {
    console.error('Start call error:', error)
  }
}

const url = 'http://localhost:5000'
onMounted(async () => {
  socket = io(url)
  roomID.value = route.params.id as string

  // Socket listeners
  socket.on('new-peer', async ({ socketId }) => {
    console.log('New peer joined:', socketId)
    room.peers.set(socketId, {})
  })

  socket.on('existing-peers', async ({ peers }) => {
    console.log('Existing peers:', peers)
    peers.forEach((peerId: string) => {
      room.peers.set(peerId, {})
    })

    // Запрашиваем производителей от существующих пиров
    for (const peerId of peers) {
      socket.emit('request-producers', { roomId: roomID.value, peerId })
    }
  })

  socket.on('new-producer', async ({ socketId, producerId, kind }) => {
    console.log('New producer:', socketId, producerId, kind)
    await consumeProducer(socketId, producerId, kind)
  })

  socket.on('peer-disconnected', ({ socketId }) => {
    console.log('Peer disconnected:', socketId)

    // Удаляем видео элемент
    const videoElement = document.getElementById(`peer-${socketId}`)
    if (videoElement) {
      videoElement.remove()
    }

    // Удаляем consumers
    if (room.consumers.has(socketId)) {
      const consumers = room.consumers.get(socketId)
      consumers.forEach((consumer: any) => consumer.close())
      room.consumers.delete(socketId)
    }

    room.peers.delete(socketId)
  })

  socket.on('producer-closed', ({ producerId }) => {
    console.log('Producer closed:', producerId)

    // Ищем и удаляем связанный consumer
    for (const [peerId, consumers] of room.consumers) {
      for (const [consumerId, consumer] of consumers) {
        if (consumer.producerId === producerId) {
          consumer.close()
          consumers.delete(consumerId)

          // Удаляем видео элемент если больше нет треков от этого пира
          if (consumers.size === 0) {
            const videoElement = document.getElementById(`peer-${peerId}`)
            if (videoElement) {
              videoElement.remove()
            }
          }
          break
        }
      }
    }
  })

  await startCall()
})

onBeforeUnmount(() => {
  endCall()
})

function endCall() {
  if (isEndingCall.value) return
  isEndingCall.value = true
  // Закрываем все producers
  room.producers.forEach((producer: any) => {
    try {
      producer.close()
      if (socket?.connected) {
        socket.emit('producer-closed', {
          roomId: roomID.value,
          producerId: producer.id
        })
      }
    } catch (error) {
      console.error('Error closing producer:', error)
    }
  })

  // Закрываем все consumers
  room.consumers.forEach((peerConsumers: Map<string, any>) => {
    peerConsumers.forEach((consumer: any) => consumer.close())
  })

  // Закрываем все transports
  room.transports.forEach((transport: any) => transport.close())

  if (screenTrack.value && screenTrack.value.readyState !== 'ended') {
    screenTrack.value.stop()
  }
  // Останавливаем локальный поток
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop())
  }

  // Уведомляем сервер о выходе
  if (socket?.connected) {
    socket.disconnect()
  }

  room.peers.clear()
  room.producers.clear()
  room.consumers.clear()
  room.transports.clear()

  router.push('/rooms')
}
</script>
