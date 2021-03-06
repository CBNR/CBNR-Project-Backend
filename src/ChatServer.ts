import socketIO from 'socket.io';
import http from 'http';
import express from 'express';
import uuid from 'uuid';

import {ChatRoom} from './ChatRoom';
import {ChatUser} from './User';
import {RoomType} from './model/RoomType';

interface EventResponse{
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
        this.initBuildings();
    }

    // == Private functions ================================================================ //

    private initBuildings(){
        this.rooms.set("BLDG_1", new ChatRoom("BLDG_1", "New Horizons", this.sio, RoomType.building));
        this.rooms.set("BLDG_2", new ChatRoom("BLDG_2", "Engineering", this.sio, RoomType.building));
        this.rooms.set("BLDG_3", new ChatRoom("BLDG_3", "Hargrave Andrew Library", this.sio, RoomType.building));
        this.rooms.set("BLDG_4", new ChatRoom("BLDG_4", "Lemon Scented Lawns", this.sio, RoomType.building));
        this.rooms.set("BLDG_5", new ChatRoom("BLDG_5", "Campus Centre", this.sio, RoomType.building));
        this.rooms.set("BLDG_6", new ChatRoom("BLDG_6", "Menzies", this.sio, RoomType.building));
        this.rooms.set("BLDG_7", new ChatRoom("BLDG_7", "Law Building", this.sio, RoomType.building));
        this.rooms.set("BLDG_8", new ChatRoom("BLDG_8", "Learning Teaching Building", this.sio, RoomType.building));
        this.rooms.set("BLDG_9", new ChatRoom("BLDG_9", "Matheson Library", this.sio, RoomType.building));
        this.rooms.set("BLDG_10", new ChatRoom("BLDG_10", "Monash Sports", this.sio, RoomType.building));
    }

    private eventRes(socket : socketIO.Socket, event : string, success : boolean, msg : string = 'OK', obj? : any){
        let response : EventResponse = {
            success : success,
            msg : msg,
            obj : obj
        }
        socket.emit(event, response);
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
            socket.on('chat_msg',       (message? : string)=>this.sendMsgCB(user, message));
            socket.on('leave_room',     ()=>this.leaveRoomCB(user));
            socket.on('room_list',      ()=>this.roomlistCB(user));
            socket.on('room_details',   ()=>this.roomDetailsCB(user));
            socket.on('disconnect',     ()=>this.disconnectCB(user));
            socket.on('timeout',        ()=>this.timeoutCB(user));

            console.log("new connection, UID" + userId);
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
            let roomDetails = {
                id : user.room.id,
                name : user.room.name,
                type : user.room.type,
                children : user.room.getChildrenIds(),
                connectedUsers : user.room.getUsers()
            }
            this.eventRes(user.socket, 'room_details', true, 'OK', roomDetails);
        } else {
            this.eventRes(user.socket, 'room_details', false, "User not in room");
        }
        console.log("room_details : " + user.id);
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
        console.log("room_list : " + user.id);
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

        console.log("create_room : " + user.id);
    }

    private joinRoomCB(user : ChatUser, roomId? : string){

        if (!roomId){
            this.eventRes(user.socket, 'create_room', false, 'Missing roomId parameter');
            return;
        }

        if(user.room){
            if(user.room.subRooms.has(roomId)){
                user.room.subRooms.get(roomId)?.addUser(user);
                let roomDetails = {
                    id : user.room.id,
                    name : user.room.name,
                    type : user.room.type,
                    children : user.room.getChildrenIds(),
                    connectedUsers : user.room.getUsers()
                }
                this.eventRes(user.socket, 'join_room', true, "OK", roomDetails);
            } else {
                this.eventRes(user.socket, 'join_room', false, "Invalid RoomID (not a subroom of current room)");
            }
        } else if (this.rooms.has(roomId)) {
            this.rooms.get(roomId)?.addUser(user);
            let room = this.rooms.get(roomId);
            let roomDetails = {
                id : room?.id,
                name : room?.name,
                type : room?.type,
                children : room?.getChildrenIds(),
                connectedUsers : room?.getUsers()
            }
            this.eventRes(user.socket, 'join_room', true, "OK", roomDetails);
        } else {
            this.eventRes(user.socket, 'join_room', false, "Invalid RoomID (doesn't exist)");
        }

        console.log("join_room : " + roomId + " : " + user.id);
    }

    private leaveRoomCB(user : ChatUser){
        // Send room id of room you leave.
        if (user.room && user.room.parent){
            user.room.removeUser(user);
            this.eventRes(user.socket, 'leave_room', true);
            // Join parent room if in a subroom
            this.joinRoomCB(user);
        } else if (user.room && !user.room.parent) {
            user.room.removeUser(user);
            this.eventRes(user.socket, 'leave_room', true,);
        } else {
            this.eventRes(user.socket, 'leave_room', false, "User not in a room");
        }

        console.log("leave_room : " + user.id);
    }

    private sendMsgCB(user : ChatUser, message?: string){
        if (!message || message.length < 1){
            return;
        }
        if (user.room){
            user.room.broadcastMsg(user.id, message);
        }

        console.log("chat_msg : " + user.id);
    }

    // == Other Callbacks ============================================================== //
    // private logoutCB(user : User){
    //     // TODO: Maybe implement as POST request?
    // }
}

//TODO: type checking for socket request body