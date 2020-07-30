import socketIO from 'socket.io';
import http from 'http';
import express from 'express';
import uuid from 'uuid';

import {ChatRoom} from './ChatRoom';
import {User} from './User';

interface EventResponse{
    event : string,
    success : boolean,
    msg : string
}

export class ChatServer{

    public readonly ROOM_NAME_MAXLEN = 20;
    public readonly ROOM_NAME_MINLEN = 3;
    private httpServer : http.Server;
    private sio : socketIO.Server;
    private rooms : Map<string, ChatRoom> = new Map<string, ChatRoom>();

    constructor(server : http.Server, sessionMiddleware : express.RequestHandler){
        this.httpServer = server;
        this.sio = socketIO(this.httpServer);
        // connect sockets to sessions
        this.sio.use((socket, next) => {
            sessionMiddleware(socket.request, socket.request.res || {}, next);
        });
        this.initSocketEvents();
    }

    // == Private functions ================================================================ //
    private eventRes(socket : socketIO.Socket, event : string, success : boolean, msg : string = 'OK'){
        let response : EventResponse = {
            event: event,
            success : success,
            msg : msg
        }
        socket.emit('res', response);
    }

    private initSocketEvents(){
        this.sio.on('connection', (socket) => {
            // Authenticate user
            if(!socket.request.session || !socket.request.session.username){
                this.eventRes(socket, 'connection', false, 'User not logged in');
                socket.disconnect();
                return;
            }

            // Create new user
            socket.request.session.user = new User(socket.request.session.username, socket);
            let user : User = socket.request.session.user;

            // Register event handlers
            socket.on('disconnect',     ()=>this.disconnectCB(user));
            socket.on('timeout',        ()=>this.timeoutCB(user));

            socket.on('join_room',      (roomId : string)=>this.joinRoomCB(user, roomId));
            socket.on('leave_room',     ()=>this.leaveRoomCB(user));
            socket.on('create_room',    (roomName : string)=>this.createRoomCB(user, roomName));
            socket.on('chat_msg',       (message : string)=>this.chatMsgCB(user, message));
        });
    }

    // == Default Callbacks ================================================================ //
    private disconnectCB(user : User){
        if(user.room){
            user.room.removeUser(user);
        }
    }

    private timeoutCB(user : User){
        this.disconnectCB(user);
    }

    // == Chat Room Callbacks ============================================================== //

    private createRoomCB(user : User, roomName : string){
        // Limit room name size
        if (roomName.length > this.ROOM_NAME_MAXLEN){
            this.eventRes(user.socket, 'create_room', false, "Room name too long | MaxLen: "+this.ROOM_NAME_MAXLEN);
            return;
        } else if (roomName.length < this.ROOM_NAME_MAXLEN){
            this.eventRes(user.socket, 'create_room', false, "Room name too short | MinLen: "+this.ROOM_NAME_MINLEN);
            return;
        }
        // Check if room exists, then add to room.
        if (user.room) {
            let success = user.room.createSubRoom(user, roomName);
            if (success){
                this.eventRes(user.socket, 'create_room', true);
            } else {
                this.eventRes(user.socket, 'create_room', false, "Unable to create room, Maybe user already in a subroom?");
            }
        } else {
            this.eventRes(user.socket, 'create_room', false, "User not in a room");
        }
    }

    private joinRoomCB(user : User, roomId : string){
        if(user.room){
            if(user.room.subRooms.has(roomId)){
                user.room.subRooms.get(roomId)?.addUser(user);
                this.eventRes(user.socket, 'join_room', true);
            } else {
                this.eventRes(user.socket, 'join_room', false, "Invalid RoomID (not a subroom of current room)");
            }
        } else if (this.rooms.has(roomId)) {
            this.rooms.get(roomId)?.addUser(user);
            this.eventRes(user.socket, 'join_room', true);
        } else {
            this.eventRes(user.socket, 'join_room', false, "Invalid RoomID (doesn't exist)");
        }
    }

    private leaveRoomCB(user : User){
        if (user.room && user.room.parent){
            user.room.removeUser(user);
            user.room.parent.addUser(user);
            this.eventRes(user.socket, 'leave_room', true);
        } else if (user.room && !user.room.parent) {
            user.room.removeUser(user);
            this.eventRes(user.socket, 'leave_room', true);
        } else {
            this.eventRes(user.socket, 'leave_room', false, "User not in a room");
        }
    }

    private chatMsgCB(user : User, message : string){
        if (message.length < 1){
            this.eventRes(user.socket, 'chat_msg', false, 'Messages cannot be empty.');
            return;
        }
        if (user.room){
            user.room.broadcastMsg(user.name, message);
            this.eventRes(user.socket, 'chat_msg', true);
        } else {
            this.eventRes(user.socket, 'chat_msg', false, 'User not in a room');
        }
    }

    // == Other Callbacks ============================================================== //
    // private logoutCB(user : User){
    //     // TODO: Maybe implement as POST request?
    // }
}

//TODO: type checking for socket request body