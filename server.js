const bodyParser = require('body-parser');
const browserify = require('browserify-middleware');
const express = require('express');
const { join } = require('path');
const { RTCPeerConnection, RTCIceCandidate, MediaStream } = require('wrtc');
const RTCAudioSource = require('./RTCAudioSource');
const RTCVideoSource = require('./RTCVideoSource');
const app = express();
require('express-ws')(app);


app.use(bodyParser.json());
app.use(`/index.js`, browserify("./client.js"));
app.use(express.static(join(__dirname, "./www")));
app.ws("/", async (ws, req) => {
  console.log("ws 连接");

  // # 1 创建服务器端 rc
  const rc = new RTCPeerConnection({
    // sdpSemantics: 'unified-plan',
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      },
      {
        urls: 'stun:global.stun.twilio.com:3478?transport=udp'
      }
    ],
  });


  // # 2 添加媒体
  const mediaStream = new MediaStream();
  const rtcAudioSource = new RTCAudioSource();
  const rtcVideoSource = new RTCVideoSource();
  const audioTrack = rtcAudioSource.createTrack();
  const videoTrack = rtcVideoSource.createTrack();
  mediaStream.addTrack(audioTrack);
  mediaStream.addTrack(videoTrack);
  rc.addTrack(audioTrack, mediaStream);
  rc.addTrack(videoTrack, mediaStream);

  rc.addEventListener("icecandidate", function ({ candidate }) {
    if (!candidate) return;
    ws.send(JSON.stringify({ type: "candidate", data: candidate }));
    console.log("local candidate ", candidate.candidate);
  });

  rc.addEventListener("iceconnectionstatechange", function (e) {
    console.log("iceConnectionState", rc.iceConnectionState)
    // if (rc.iceConnectionState == "completed") {
    //   rtcAudioSource.stop();
    //   rtcVideoSourve.stop();
    // }
  })




  // # 3 服务器 设置服务器本地 description
  const offer = await rc.createOffer();
  await rc.setLocalDescription(offer);
  ws.send(JSON.stringify({ type: "offer", data: offer }));

  ws.on('message', async function (data) {
    data = JSON.parse(data);
    if (data.type == "candidate") {
      console.log("remote candidate", data.data.candidate);
      rc.addIceCandidate(new RTCIceCandidate(data.data))
    }
    if (data.type == "answer") {
      // # 8 服务器 设置远程 description
      await rc.setRemoteDescription(data.data);
      // const answer = await rc.createAnswer();
      // await rc.setLocalDescription(answer);
      // return ws.send(JSON.stringify({ type: "answer", data: answer }));
    }
    if (data.type == "close") {
      rtcAudioSource.stop();
      rtcVideoSource.stop();
      rc.close();
    }
  });

})

const server = app.listen(3000, "0.0.0.0", () => {
  const address = server.address();
  console.log("address", address);
});