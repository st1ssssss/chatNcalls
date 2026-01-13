<template>
  <div class="w-full h-full flex flex-col items-center justify-between">
    <div class="flex flex-wrap justify-center gap-3.5" id="videos-container">
      <div class="relative">
        <video class="w-2xl h-96 bg-neutral-600 rounded-xl object-cover" 
               ref="localVideo" autoplay muted playsinline></video>
        <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          You
        </div>
      </div>
    </div>
    <div class="flex gap-1 pt-2">
      <button class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"  
              @click="toggleMic">
        <span class="material-symbols-outlined">{{ mic ? 'mic' : 'mic_off' }}</span>
      </button>
      <button class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-neutral-600 text-neutral-100 flex justify-center"  
              @click="toggleCam">
        <span class="material-icons-outlined">{{ videocam ? 'videocam' : 'videocam_off' }}</span>
      </button>
      <button class="rounded-xl py-4 px-4 transition duration-300 active:scale-98 bg-red-600 text-neutral-100 flex justify-center"  
              @click="endCall">
        <span class="material-icons-outlined">call_end</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { router } from '@/router';
import * as mediasoupClient from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

let socket: Socket;
const localStream = ref<MediaStream>();
const roomID = ref<string>();
const mic = ref(true);
const videocam = ref(true);
const route = useRoute();

// Mediasoup variables
let device: mediasoupClient.Device;
let room: any = {
  transports: new Map(),
  producers: new Map(),
  consumers: new Map(),
  peers: new Map()
};

const localVideo = ref<HTMLVideoElement>();

async function initializeMedia() {
  try {
    localStream.value = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: true 
    });

    if (localVideo.value) {
      localVideo.value.srcObject = localStream.value;
    }
  } catch (err) {
    console.error('Media error:', err);
  }
}

async function toggleCam() {
  if (!videocam.value) {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Обновляем producer
      const videoProducer = Array.from(room.producers.values())
        .find((p: any) => p.track.kind === 'video');
      
      if (videoProducer && newVideoTrack) {
        await videoProducer.replaceTrack({ track: newVideoTrack });
      } else if (newVideoTrack) {
        // Создаем новый producer
        const sendTransport = room.transports.get('send');
        if (sendTransport) {
          const producer = await sendTransport.produce({ track: newVideoTrack });
          room.producers.set(producer.id, producer);
        }
      }
      
      if (localVideo.value && localStream.value) {
        const oldTrack = localStream.value.getVideoTracks()[0];
        if (oldTrack) {
          localStream.value.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStream.value.addTrack(newVideoTrack);
        localVideo.value.srcObject = localStream.value;
      }
      
      // Останавливаем старый stream
      newStream.getTracks().forEach(track => {
        if (track.kind === 'audio') track.stop();
      });
      
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  } else {
    // Отключаем видео
    const videoProducer = Array.from(room.producers.values())
      .find((p: any) => p.track.kind === 'video');
    
    if (videoProducer) {
      videoProducer.close();
    }
    
    const videoTrack = localStream.value?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      localStream.value?.removeTrack(videoTrack);
    }
  }
  videocam.value = !videocam.value;
}

async function toggleMic() {
  if (mic.value) {
    // Отключаем микрофон
    const audioProducer = Array.from(room.producers.values())
      .find((p: any) => p.track.kind === 'audio');
    
    if (audioProducer) {
      audioProducer.close();
    }
    
    const audioTrack = localStream.value?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.stop();
    }
  } else {
    // Включаем микрофон
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const newAudioTrack = newStream.getAudioTracks()[0];
      
      const sendTransport = room.transports.get('send');
      if (sendTransport && newAudioTrack) {
        const producer = await sendTransport.produce({ track: newAudioTrack });
        room.producers.set(producer.id, producer);
      }
      
      if (localStream.value) {
        const oldTrack = localStream.value.getAudioTracks()[0];
        if (oldTrack) {
          localStream.value.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStream.value.addTrack(newAudioTrack);
      }
      
      // Останавливаем старый stream
      newStream.getTracks().forEach(track => {
        if (track.kind === 'video') track.stop();
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  }
  mic.value = !mic.value;
}

// Mediasoup functions
async function createSendTransport() {
  try {
    const data = await socket.emitWithAck('create-transport', { 
      roomId: roomID.value, 
      direction: 'send' 
    });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const transport = device.createSendTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters
    });
    
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await socket.emitWithAck('connect-transport', {
          roomId: roomID.value,
          transportId: transport.id,
          dtlsParameters
        });
        callback();
      } catch (error:any) {
        errback(error);
      }
    });
    
    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await socket.emitWithAck('produce', {
          roomId: roomID.value,
          transportId: transport.id,
          kind,
          rtpParameters
        });
        callback({ id });
      } catch (error:any) {
        errback(error);
      }
    });
    
    transport.on('connectionstatechange', (state) => {
      console.log('Send transport state:', state);
    });
    
    return transport;
  } catch (error) {
    console.error('Create send transport error:', error);
    throw error;
  }
}

async function createRecvTransport() {
  try {
    const data = await socket.emitWithAck('create-transport', { 
      roomId: roomID.value, 
      direction: 'recv' 
    });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const transport = device.createRecvTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters
    });
    
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        const result = await socket.emitWithAck('connect-transport', {
          roomId: roomID.value,
          transportId: transport.id,
          dtlsParameters
        });
        callback();
      } catch (error:any) {
        errback(error);
      }
    });
    
    transport.on('connectionstatechange', (state) => {
      console.log('Recv transport state:', state);
    });
    
    return transport;
  } catch (error) {
    console.error('Create recv transport error:', error);
    throw error;
  }
}

async function produceMedia(transport: any) {
  if (!localStream.value) return;
  
  // Аудио
  const audioTrack = localStream.value.getAudioTracks()[0];
  if (audioTrack) {
    try {
      const audioProducer = await transport.produce({ track: audioTrack });
      room.producers.set(audioProducer.id, audioProducer);
    } catch (error) {
      console.error('Produce audio error:', error);
    }
  }
  
  // Видео
  const videoTrack = localStream.value.getVideoTracks()[0];
  if (videoTrack) {
    try {
      const videoProducer = await transport.produce({ track: videoTrack });
      room.producers.set(videoProducer.id, videoProducer);
    } catch (error) {
      console.error('Produce video error:', error);
    }
  }
}

async function consumeProducer(peerId: string, producerId: string, kind: string) {
  try {
    // Создаем транспорт для приема, если его нет
    if (!room.transports.has('recv')) {
      const recvTransport = await createRecvTransport();
      room.transports.set('recv', recvTransport);
    }
    
    const recvTransport = room.transports.get('recv');
    
    const data = await socket.emitWithAck('consume', {
      roomId: roomID.value,
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities
    });
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const consumer = await recvTransport.consume({
      id: data.id,
      producerId: data.producerId,
      kind: data.kind,
      rtpParameters: data.rtpParameters
    });
    
    // Resume consumer
    await socket.emitWithAck('resume-consumer', {
      roomId: roomID.value,
      consumerId: consumer.id
    });
    
    // Сохраняем consumer
    if (!room.consumers.has(peerId)) {
      room.consumers.set(peerId, new Map());
    }
    room.consumers.get(peerId).set(producerId, consumer);
    
    // Создаем видео элемент для удаленного потока
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    
    // Добавляем видео элемент в DOM
    await nextTick();
    const videoElement = document.createElement('video');
    videoElement.className = 'w-2xl h-96 bg-neutral-600 rounded-xl object-cover';
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.srcObject = stream;
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'relative';
    videoContainer.id = `peer-${peerId}`;
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded';
    nameDiv.textContent = `User ${peerId.slice(0, 5)}`;
    
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(nameDiv);
    
    const videosContainer = document.getElementById('videos-container');
    if (videosContainer) {
      videosContainer.appendChild(videoContainer);
    }
    
  } catch (error) {
    console.error('Consume error:', error);
  }
}

async function startCall() {
  try {
    await initializeMedia();
    
    // Получаем RTP capabilities от сервера
    const data = await socket.emitWithAck('join-room', { roomId: roomID.value });
    if (data.error) throw new Error(data.error);
    
    // Загружаем device
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: data.routerRtpCapabilities });
    
    // Создаем транспорт для отправки
    const sendTransport = await createSendTransport();
    room.transports.set('send', sendTransport);
    
    // Начинаем отправку медиа
    await produceMedia(sendTransport);
    
  } catch (error) {
    console.error('Start call error:', error);
  }
}

onMounted(async () => {
  socket = io('http://localhost:5000');
  roomID.value = route.params.id as string;
  
  // Socket listeners
  socket.on('new-peer', async ({ socketId }) => {
    console.log('New peer joined:', socketId);
    room.peers.set(socketId, {});
  });
  
  socket.on('existing-peers', async ({ peers }) => {
    console.log('Existing peers:', peers);
    peers.forEach((peerId: string) => {
      room.peers.set(peerId, {});
    });
    
    // Запрашиваем производителей от существующих пиров
    for (const peerId of peers) {
      socket.emit('request-producers', { roomId: roomID.value, peerId });
    }
  });
  
  socket.on('new-producer', async ({ socketId, producerId, kind }) => {
    console.log('New producer:', socketId, producerId, kind);
    await consumeProducer(socketId, producerId, kind);
  });
  
  socket.on('peer-disconnected', ({ socketId }) => {
    console.log('Peer disconnected:', socketId);
    
    // Удаляем видео элемент
    const videoElement = document.getElementById(`peer-${socketId}`);
    if (videoElement) {
      videoElement.remove();
    }
    
    // Удаляем consumers
    if (room.consumers.has(socketId)) {
      const consumers = room.consumers.get(socketId);
      consumers.forEach((consumer: any) => consumer.close());
      room.consumers.delete(socketId);
    }
    
    room.peers.delete(socketId);
  });
  
  socket.on('producer-closed', ({ producerId }) => {
    console.log('Producer closed:', producerId);
    
    // Ищем и удаляем связанный consumer
    for (const [peerId, consumers] of room.consumers) {
      for (const [consumerId, consumer] of consumers) {
        if (consumer.producerId === producerId) {
          consumer.close();
          consumers.delete(consumerId);
          
          // Удаляем видео элемент если больше нет треков от этого пира
          if (consumers.size === 0) {
            const videoElement = document.getElementById(`peer-${peerId}`);
            if (videoElement) {
              videoElement.remove();
            }
          }
          break;
        }
      }
    }
  });
  
  await startCall();
});

onBeforeUnmount(() => {
  endCall();
});

function endCall() {
  // Закрываем все producers
  room.producers.forEach((producer: any) => {
    try {
      producer.close();
      socket.emit('producer-closed', { 
        roomId: roomID.value, 
        producerId: producer.id 
      });
    } catch (error) {
      console.error('Error closing producer:', error);
    }
  });
  
  // Закрываем все consumers
  room.consumers.forEach((peerConsumers: Map<string, any>) => {
    peerConsumers.forEach((consumer: any) => consumer.close());
  });
  
  // Закрываем все transports
  room.transports.forEach((transport: any) => transport.close());
  
  // Останавливаем локальный поток
  if (localStream.value) {
    localStream.value.getTracks().forEach(track => track.stop());
  }
  
  // Уведомляем сервер о выходе
  if (socket) {
    socket.emit('disconnect');
  }
  
  router.push('/rooms');
}
</script>