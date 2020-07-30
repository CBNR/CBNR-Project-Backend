import socketIO from 'socket.io';
import http from 'http';
import express from 'express';
import uuid from 'uuid';

import {ChatRoom} from './ChatRoom';
import {User} from './User';
import {RoomType} from './model/RoomType';

interface EventResponse{
    event : string,
    success : boolean,
    msg : string
}

export class ChatServer{
    
    private httpServer : http.Server;
    private sio : socketIO.Server;

    private buildings : Map<string, ChatRoom> = new Map<string, ChatRoom>();

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
            socket.on('join_room',      ()=>this.joinRoomCB(user));
            socket.on('leave_room',     ()=>this.leaveRoomCB(user));
            socket.on('create_room',    (roomName : string)=>this.createRoomCB(user, roomName));
            socket.on('chat_msg',       ()=>this.textChatCB(user));
        });
    }

    // == Default Callbacks ================================================================ //
    private disconnectCB(user : User){
        // TODO: Implement
    }

    private timeoutCB(user : User){
        // TODO: Implement
    }

    // == Chat Room Callbacks ============================================================== //
    private createRoomCB(user : User, roomName : string){
        if (user.room) {
            let success = user.room.createSubRoom(user, roomName);
            if (success){
                this.eventRes(user.socket, 'create_room', true);
            } else {
                this.eventRes(user.socket, 'create_room', false, "Unable to create room");
            }
        } else {
            this.eventRes(user.socket, 'create_room', false, "User not in a room");
        }
    }

    private joinRoomCB(user : User){
        if (user.room){
            user.room.removeUser(user);
        }
        // TODO : search for room and enter
    }

    private leaveRoomCB(user : User){
        // TODO: implement
        // remove socket/session/user from room
        // Announce to others that this guy has left the room (chat_msg)
    }

    private textChatCB(user : User){
        // TODO: implement
        // Send message to everyone in chat
    }

    // == Other Callbacks ============================================================== //
    private logoutCB(user : User){
        // TODO: Maybe implement as POST request?
    }
}