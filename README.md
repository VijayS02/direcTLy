[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


# DirecTLy
[DirecTLy](https://direc-tl-y.vercel.app) is a web-based peer-to-peer disposable audio lobby application hosted on Vercel using vanilia Javascript.

# Installation
## Requirements
 - Vite (For bundling)
 - Firebase (Or another signaling database)
 - webRTC supported browser (All modern browsers support this)
 - Hosting service


Thankfully, npm manages vite and setting up the repository. 

## Getting started
Run `npm install` once you are in the root directory to setup the required node modules and packages.

Use `npm run build` to run the vite application. 




# Project information
## Inspiration
Some of the biggest teamwork-oriented games today such as League of Legends and World of Warcraft do not come with an in-game voice chat by default. Even though the games require intense levels of communication throughout the matches in order for the players to be successful, the players are left to download third-party applications and each other as friends, even if it's just for one match or raid.

But what if you don't want to add strangers to your personal discord server or send your email on a global chat to set up a Google Meet? As it stands, there is no easy way to set up a temporary call amongst players for the duration of one session. That's where direcTLy comes in!

## What it does
direcTLy is a completely in-browser application that allows for users to generate a voice chat through a peer-to-peer network. This allows for complete privacy and little-to-no effort to get set up! One person heads over to our website and creates a room, and the others join with the code generated. At the end of the match, simply close the browser tab!

## How we built it
We created the user interface of the website with HTML/CSS and JavaScript.
The logic of establishing the peer-to-peer network was through the utilization of WebRTC in JavaScript.
The networking and client information is persisted through Firestore in Firebase.
The hosting & deployment pipeline was set up through Vercel and the entire application is bundled using Vite.

## Challenges we ran into
One of the biggest challenges we ran into was establishing a multi-party peer-to-peer network. Although the documentation and steps required to set up a 1-1 call is relatively simple, it was much harder to figure out how to scale the system to establish an arbitrary number of connections to allow for group calls.
As a team, we had no prior experience with Firebase, Vite, and Vercel, so it took some time to get set up.

## Accomplishments that we're proud of
We were able to set up a successful real-time communication application which we wouldn't have thought of as possible prior to this hackathon.
We purposefully chose to experiment with new technologies such as Vite, Vercel, and Firebase, and we were able to successfully utilize them to create our end project whilst learning an immense amount.
Our project is entirely functional as we hoped from the initial plan

## What we learned
Setting up an automated hosting and deployment pipeline in Vercel
Implementing an n-dimensional real-time peer-to-peer network through WebRTC and Firestore
Storing and manipulating data through Firebase


## What's next for direcTLy
A potential extension for direcTLy could be the support for video calling
 - We could add the option to mute/unmute during a session
 - A nice feature would be individual user volume control
 - Increase security of connections (perhaps end-to-end encryption)
 - We could allow a user to tune their audio/video settings and much more!

