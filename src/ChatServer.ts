import socketIO from 'socket.io';
import http from 'http';
import express from 'express';
import uuid from 'uuid';

import {ChatRoom} from './ChatRoom';
import {ChatUser} from './User';
import {RoomType} from './model/RoomType';

interface EventResponse{
    event : string,
    success : boolean,
    msg : string,
    obj? : any
}

interface RoomListing{
    id : string,
    name : string,
    type : RoomType,
    userCount : number
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
        this.initBuildings(); // TODO: Remove for production DEBUG ONLY
    }

    // == Private functions ================================================================ //

    private initBuildings(){ // TODO: Remove for production DEBUG ONLY
        this.rooms.set("TESTBLDG1", new ChatRoom("TESTBLDG1", "BLDG1", this.sio, RoomType.building));
        this.rooms.set("TESTBLDG2", new ChatRoom("TESTBLDG2", "BLDG2", this.sio, RoomType.building));
        this.rooms.set("TESTBLDG3", new ChatRoom("TESTBLDG3", "BLDG3", this.sio, RoomType.building));
        this.rooms.set("TESTBLDG4", new ChatRoom("TESTBLDG4", "BLDG4", this.sio, RoomType.building));
        this.rooms.set("TESTBLDG5", new ChatRoom("TESTBLDG5", "BLDG5", this.sio, RoomType.building));
    }

    private eventRes(socket : socketIO.Socket, event : string, success : boolean, msg : string = 'OK', obj? : any){
        let response : EventResponse = {
            event: event,
            success : success,
            msg : msg,
            obj : obj
        }
        socket.emit('res', response);
    }

    private initSocketEvents(){
        this.sio.on('connection', (socket) => {
            // Authenticate user
            let userId = socket.request.session.userId;
            let username = socket.request.session.username;
            let avatarId = socket.request.session.avatarId;
            if(!socket.request.session || !username || !avatarId || !userId){
                this.eventRes(socket, 'connection', false, 'User not logged in');
                socket.disconnect();
                return;
            }

            // Create new user
            socket.request.session.user = new ChatUser(userId, username, socket, avatarId);
            let user : ChatUser = socket.request.session.user;

            // Register event handlers
            socket.on('join_room',      (roomId? : string)=>this.joinRoomCB(user, roomId));
            socket.on('create_room',    (roomName? : string)=>this.createRoomCB(user, roomName));
            socket.on('chat_msg',       (message? : string)=>this.chatMsgCB(user, message));
            socket.on('leave_room',     ()=>this.leaveRoomCB(user));
            socket.on('room_list',      ()=>this.roomlistCB(user));
            socket.on('room_details',   ()=>this.roomDetailsCB(user));
            socket.on('disconnect',     ()=>this.disconnectCB(user));
            socket.on('timeout',        ()=>this.timeoutCB(user));
        });
    }

    // == Default Callbacks ================================================================ //
    private disconnectCB(user : ChatUser){
        if(user.room){
            user.room.removeUser(user);
        }
    }

    private timeoutCB(user : ChatUser){
        this.disconnectCB(user);
    }

    // == Chat Room Callbacks ============================================================== //
    private roomDetailsCB(user : ChatUser){
        if (user.room){
            let room_details = {
                id : user.room.id,
                name : user.room.name,
                type : user.room.type,
                children : user.room.getChildrenIds(),
                connectedUsers : user.room.getUsers()
            }
            this.eventRes(user.socket, 'room_details', true, 'OK', room_details);
        } else {
            this.eventRes(user.socket, 'room_details', false, "User not in room");
        }
    }

    private roomlistCB(user:ChatUser){
        let roomList = []
        if (user.room){
            roomList = Array.from(user.room.subRooms.values());
        } else {
            roomList = Array.from(this.rooms.values());
        }

        let listToSend = new Array<RoomListing>(roomList.length);
        for (let i = 0; i < roomList.length; i++){
            let room = roomList[i];
            listToSend[i] = {
                id : room.id,
                name : room.name,
                type : room.type,
                userCount : room.totalUsers()
            }
        }
        this.eventRes(user.socket, 'room_list', true, 'OK', listToSend);
    }

    private createRoomCB(user : ChatUser, roomName? : string){
        // Limit room name size
        if (!roomName){
            this.eventRes(user.socket, 'create_room', false, 'Missing roomName parameter');
            return;
        }

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

    private joinRoomCB(user : ChatUser, roomId? : string){

        if (!roomId){
            this.eventRes(user.socket, 'create_room', false, 'Missing roomId parameter');
            return;
        }

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

    private leaveRoomCB(user : ChatUser){
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

    private chatMsgCB(user : ChatUser, message?: string){
        if (!message){
            this.eventRes(user.socket, 'create_room', false, 'Missing message parameter');
            return;
        }
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