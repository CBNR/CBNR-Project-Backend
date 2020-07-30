import socketIO from 'socket.io';
import {RoomType} from './model/RoomType';
import {ChatUser, User} from './User';

import uuid from 'uuid';

interface ChatMessage{
    time : number,
    sender : string,
    message : string
}

export class ChatRoom{
    
    public readonly id : string;
    public readonly name : string;
    public readonly type : RoomType = RoomType.room;
    
    private users : Map<ChatUser, User> = new Map<ChatUser, User>();

    protected sio : socketIO.Server;
    private date : Date = new Date();
    public subRooms : Map<string, ChatRoom> = new Map<string, ChatRoom>();
    public readonly parent? : ChatRoom;

    constructor(id : string, name : string, sio : socketIO.Server, type : RoomType, parent? : ChatRoom){
        this.id = id;
        this.name = name;
        this.sio = sio;
        this.type = type;
        this.parent = parent;
    }
    
    public broadcastMsg(sender : string, message : string){
        this.sio.to(this.id).emit('chat_msg', {
            time : this.date.getTime(),
            message : message,
            sender : sender
        });
    }

    public addUser(user : ChatUser){ // TODO: replace with user
        user.socket.join(this.id, ()=>{
            this.users.set(user, user.getPublicUser());
        });
        this.broadcastMsg("Server", user.name + " joined the room.");
        user.room = this;
    }

    public removeUser(user : ChatUser){
        user.socket.leave(this.id, ()=>{
            this.users.delete(user);
        });
        this.broadcastMsg("Server", user.name + " left the room.");
        user.room = undefined;
    }

    /**
     * Returns true if a new room is created, false otherwise
     */
    public createSubRoom(user : ChatUser, roomName : string) : boolean{
        if (this.type == RoomType.building){
            let newRoom = new ChatRoom('ROOM'+uuid.v4().substr(23,12), roomName, this.sio, RoomType.room, this);
            this.subRooms.set(newRoom.id, newRoom);
            return true;
        } else {
            return false;
        }
    }

    public getUsers() : User[]{
        return Array.from(this.users.values());
    }

    public getChildrenIds() : string[] {
        return Array.from(this.subRooms.keys())
    }

    public totalUsers() : number{
        return this.users.size;
    }
}

class Building extends ChatRoom{
    
    public type : RoomType = RoomType.building;
    private rooms : Set<ChatRoom> = new Set<ChatRoom>();

    public addRoom(room : ChatRoom){
        this.rooms.add(room);
    }

    public getRooms(){
        // TODO: Implement
    }
}