import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

// Max number of allowable connections
// Note each new connection does not yet automatically make new audio elements (TODO)
// This means that index.html must be motified accordingly
const maxConns = 5;
// UserID for the given session
let userId = null;
// RoomID for the given session
let roomId = null;
let activeCons = 0;


// Firebase Constants
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};
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



// Global State
// These are the active connections - One for each peer 
const pcs = [];
for(let i =0;i<maxConns;i++){
  pcs.push(new RTCPeerConnection(servers));
}

// Unimportant
let localStream = null;

// Streams that take input from the connections
let remoteStreams = [];

// HTML elements
const roomButton = document.getElementById('roomButton');
const roomInput = document.getElementById('roomId');

const generateRoom = document.getElementById('generateRoom');

let setupWebcam = async () => {
  // Gets webcam permission and adds stream to all connections


  // Loads the webcam into a stream of data
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

  // webcamVideo.srcObject = localStream;
  for(let i =0;i<maxConns;i++){
    let str = "remoteAudio"+ (i+1).toString();
    console.log(str);
    let remVid = document.getElementById(str);
    remVid.srcObject = remoteStreams[i];
  }
};


async function CreateConn(con){
  // Create a connection by initializing required fields in DB and generating connection code
  // Mostly code for creating a new webRTC connection

  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  // Get candidates for caller, save to db
  con.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await con.createOffer();
  await con.setLocalDescription(offerDescription);

  // webRTC offer
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
      // Update remote information for connection establishment
      con.setRemoteDescription(answerDescription);
      
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        con.addIceCandidate(candidate);
        activeCons++;
      }
    });
  });


  return callDoc.id;
}


async function CreateRoom(){
  // Creates a room in the firebase DB and sets up snapshot listener
  setupWebcam();
  userId = 0;
  const newRoom = await firestore.collection('rooms').add({
    users: 1
  });
  roomId = newRoom.id;
  console.log(roomId);
  document.getElementById("roomText").innerHTML = roomId;

  // On new entry in connections db, check if it is relevant to roomID and user id
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
  // Join a room with a given room id

  setupWebcam();

  // Set the session's room id
  roomId = roomID;

  // Get the room information from firestore
  const room = await firestore.collection('rooms').doc(roomID);
  let roomRef = await room.get();
  // userid is 0,1,2,3... depending on when you joined.
  userId = roomRef.data()['users'];
  
  for(let i = 0; i< userId; i++){
    let connId = await CreateConn(pcs[i]);
    // User's ids are "<UserIndex>:<RoomID>" 
    CreateConnEntry(userId.toString() + ":" + roomID, i.toString()+ ":" + roomID, connId);
  }

  room.update({
    // Increment the users
    users: userId + 1
  })

  // Listen for changes on the connections table so as to be able to join when someone 
  // enters the room.
  firestore.collection('connections').onSnapshot((snapshot)=>{
    snapshot.docChanges().forEach((changes)=>{
      listenForConnections(changes);
    })
  })

  roomButton.disabled = true;
  generateRoom.disabled = true;
}

async function CreateConnEntry(user1, user2, code){
  // Insert connection information into firebase db
  firestore.collection('connections').add({
    user1: user1,
    user2: user2,
    code: code
  }).then((docref)=>{
    console.log("New connection entry inserted with id: ", docref.id);
  })
}

async function JoinConn(conn, code_id){
  // Called when a user joins the room
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
        // Setup the connection.
        conn.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}



function listenForConnections(change){
  // Check if new event is relevant to room and user
  if(change.type == "added"){
    let new_doc = change.doc.data();
    if(new_doc["user2"] == userId.toString() + ":" + roomId){
      console.log("New connection required!", new_doc);
      let ind = parseInt(new_doc["user1"].split(":")[0]);
      // If it is relevant, join the connection
      JoinConn(pcs[ind], new_doc["code"]);
      activeCons++;
      document.getElementById("numConnections").innerHTML = activeCons;
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