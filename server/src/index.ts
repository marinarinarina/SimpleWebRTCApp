import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_PORT = process.env.SERVER_PORT || 4000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: CLIENT_URL,
		methods: ['GET', 'POST'],
	},
});

interface User {
	id: string;
}

interface Room {
	[room: string]: User[];
}

interface SocketToRoom {
	[socketId: string]: string;
}

const users: Room = {};
const socketToRoom: SocketToRoom = {};
const maximum = 2;

io.on('connection', (socket) => {
	socket.on('join_room', (data: { room: string }) => {
		if (users[data.room]) {
			const length = users[data.room].length;
			if (length === maximum) {
				socket.to(socket.id).emit('room_full');
				return;
			}
			users[data.room].push({ id: socket.id });
		} else {
			users[data.room] = [{ id: socket.id }];
		}
		socketToRoom[socket.id] = data.room;

		socket.join(data.room);
		console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

		const usersInThisRoom = users[data.room].filter((user) => user.id !== socket.id);
		console.log(usersInThisRoom);

		io.to(socket.id).emit('all_users', usersInThisRoom);
	});

	socket.on('offer', (sdp: RTCSessionDescriptionInit) => {
		console.log('offer: ' + socket.id);
		socket.broadcast.emit('getOffer', sdp);
	});

	socket.on('answer', (sdp: RTCSessionDescriptionInit) => {
		console.log('answer: ' + socket.id);
		socket.broadcast.emit('getAnswer', sdp);
	});

	socket.on('candidate', (candidate: RTCIceCandidate) => {
		console.log('candidate: ' + socket.id);
		socket.broadcast.emit('getCandidate', candidate);
	});

	socket.on('disconnect', () => {
		console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
		const roomID = socketToRoom[socket.id];
		let room = users[roomID];

		if (room) {
			room = room.filter((user) => user.id !== socket.id);
			users[roomID] = room;
			if (room.length === 0) {
				delete users[roomID];
				return;
			}
		}
		socket.broadcast.to(roomID).emit('user_exit', { id: socket.id });
		console.log(users);
	});
});

httpServer.listen(SERVER_PORT, () => {
	console.log(`listening on *: ${SERVER_PORT}`);
});
