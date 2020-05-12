'use strict';
// const { RTCPeerConnection, MediaStream } = require('wrtc')

// const localVideo = document.createElement('video');
// localVideo.autoplay = true;
// localVideo.muted = true;

const remoteVideo = document.createElement('video');
remoteVideo.autoplay = true;
remoteVideo.controls = true;

const info = document.createElement("p");


let rc, ws;

const startButton = document.createElement("button");
startButton.innerText = "开始";
startButton.addEventListener("click", async () => {
  ws = new WebSocket(`ws://${location.host}`);
  // const offer = await rc.createOffer({ offerToReceiveAudio: true, offerToReceiveAudio: true });
  // await rc.setLocalDescription(offer)
  // ws.send(JSON.stringify({
  //   type: "offer",
  //   data: offer
  // }));

  // navigator.getUserMedia({ audio: true, video: false }, async function (mediaStream) {
  //   rc.addTrack(mediaStream.getAudioTracks()[0], mediaStream);
  // }, function () { });


  ws.addEventListener("message", async function ({ data }) {
    data = JSON.parse(data);
    if (data.type == "candidate") {
      console.log("remote candidate", data.data);
      rc.addIceCandidate(new RTCIceCandidate(data.data))
    }
    if (data.type == "offer") {
      // # 4 创建客户端 rc
      rc = new RTCPeerConnection({
        sdpSemantics: 'unified-plan',
        iceServers: [
          {
            urls: 'stun:stun.l.google.com:19302'
          },
          {
            urls: 'stun:global.stun.twilio.com:3478?transport=udp'
          }
        ],
      });

      rc.addEventListener("icecandidate", function ({ candidate }) {
        if (!candidate) return;
        ws.send(JSON.stringify({ type: "candidate", data: candidate }));
        console.log("local candidate", candidate);
      })

      // # 5 设置客户端远程 description
      await rc.setRemoteDescription(data.data);

      // # 6 获取远程 stream
      const remoteStream = new MediaStream(rc.getReceivers().map(receiver => receiver.track));
      remoteVideo.srcObject = remoteStream;

      const localStream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      localStream.getTracks().forEach(track => {
        rc.addTrack(track)
      });


      // # 7 设置客户端本地 description
      const answer = await rc.createAnswer();
      await rc.setLocalDescription(answer);
      ws.send(JSON.stringify({
        type: 'answer',
        data: answer
      }))
    }
  });
});

const stopButton = document.createElement("button");
stopButton.innerText = "停止";
stopButton.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "close" }))
  rc.close();
});

const videos = document.createElement('div');
// videos.appendChild(localVideo);
videos.appendChild(remoteVideo);
document.body.appendChild(videos);
document.body.appendChild(startButton);
document.body.appendChild(stopButton);
document.body.appendChild(info);