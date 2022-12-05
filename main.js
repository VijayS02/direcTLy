import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

const maxConns = 5;

let userId = null;
let roomId = null;

let activeCons = 0;


const firebaseConfig = {
  apiKey: "AIzaSyCIq8PGJA0ywv8iWjRWmMETpF3JuPNJ_zU",
  authDomain: "liquidxdav.firebaseapp.com",
  projectId: "liquidxdav",
  storageBucket: "liquidxdav.appspot.com",
  messagingSenderId: "25180788907",
  appId: "1:25180788907:web:3c37dd480e09ce30843fee",
  measurementId: "G-KC525G6ZQJ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pcs = [];
for(let i =0;i<maxConns;i++){
  pcs.push(new RTCPeerConnection(servers));
}

let localStream = null;

let remoteStreams = [];

// HTML elements
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');

const roomButton = document.getElementById('roomButton');
const roomInput = document.getElementById('roomId');

const generateRoom = document.getElementById('generateRoom');
// 1. Setup media sources

let setupWebcam = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
  

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    for(let i =0;i<maxConns;i++){
      pcs[i].addTrack(track, localStream);
    }
    
    // pc2.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream

  for(let i =0;i<maxConns;i++){
    remoteStreams[i] = new MediaStream();
    pcs[i].ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreams[i].addTrack(track);
      });
    };
  }

  webcamVideo.srcObject = localStream;
  for(let i =0;i<maxConns;i++){
    let str = "remoteAudio"+ (i+1).toString();
    console.log(str);
    let remVid = document.getElementById(str);
    remVid.srcObject = remoteStreams[i];
  }

  callButton.disabled = false;

  answerButton.disabled = false;
  answerButton2.disabled = false;

  webcamButton.disabled = true;
};


async function CreateConn(con){
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  // callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  con.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await con.createOffer();
  await con.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!con.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      con.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        con.addIceCandidate(candidate);
      }
    });
  });


  return callDoc.id;
}


async function CreateRoom(){
  setupWebcam();
  userId = 0;
  const newRoom = await firestore.collection('rooms').add({
    users: 1
  });
  roomId = newRoom.id;
  console.log(roomId);
  document.getElementById("roomText").innerHTML = roomId;


  firestore.collection('connections').onSnapshot((snapshot)=>{
    snapshot.docChanges().forEach((changes)=>{
      listenForConnections(changes);
    })
  })

  roomButton.disabled = true;
  generateRoom.disabled = true;
  return roomId;
}


async function JoinRoom(roomID){
  setupWebcam();
  roomId = roomID;
  const room = await firestore.collection('rooms').doc(roomID);
  let roomRef = await room.get();
  userId = roomRef.data()['users'];
  
  for(let i = 0; i< userId; i++){
    let connId = await CreateConn(pcs[i]);
    CreateConnEntry(userId.toString() + ":" + roomID, i.toString()+ ":" + roomID, connId);
  }

  room.update({
    users: userId + 1
  })

  firestore.collection('connections').onSnapshot((snapshot)=>{
    snapshot.docChanges().forEach((changes)=>{
      listenForConnections(changes);
    })
  })

  roomButton.disabled = true;
  generateRoom.disabled = true;
}

async function CreateConnEntry(user1, user2, code){
  firestore.collection('connections').add({
    user1: user1,
    user2: user2,
    code: code
  }).then((docref)=>{
    console.log("New connection entry inserted with id: ", docref.id);
  })
}

async function JoinConn(conn, code_id){
  const callDoc = firestore.collection('calls').doc(code_id);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  conn.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await conn.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await conn.createAnswer();
  await conn.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      // console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        conn.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}



function listenForConnections(change){
  if(change.type == "added"){
    let new_doc = change.doc.data();
    if(new_doc["user2"] == userId.toString() + ":" + roomId){
      console.log("New connection required!", new_doc);
      let ind = parseInt(new_doc["user1"].split(":")[0]);
      JoinConn(pcs[ind], new_doc["code"]);
      activeCons++;
    }
  }
  
}


roomButton.onclick = async () => {
  const roomId = roomInput.value;
  JoinRoom(roomId);
  // const rooms = firestore.collection('rooms');
};

generateRoom.onclick = async () => {
    CreateRoom();
}