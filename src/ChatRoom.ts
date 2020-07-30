import socketIO from 'socket.io';
import {RoomType} from './model/RoomType';
import {User} from './User';

import uuid from 'uuid';

interface ChatMessage{
    time : number,
    sender : string,
    message : string
}

export class ChatRoom{
    
    public id : string;
    public type : RoomType = RoomType.room;
    protected users = new Set<socketIO.Socket>();
    protected sio : socketIO.Server;
    private date : Date = new Date();
    public subRooms : Map<string, ChatRoom> = new Map<string, ChatRoom>();
    public parent? : ChatRoom;

    constructor(id : string, sio : socketIO.Server, type : RoomType, parent? : ChatRoom){
        this.id = id;
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

    public addUser(user : User){ // TODO: replace with user
        user.socket.join(this.id, ()=>{
            this.broadcastMsg("Server", user.name + " joined the room.");
        });
    }

    public removeUser(user : User){
        user.socket.leave(this.id, ()=>{
            this.broadcastMsg("Server", user.name + " left the room.");
        });
    }

    /**
     * Returns true if a new room is created, false otherwise
     */
    public createSubRoom(user : User, roomName : string) : boolean{
        if (this.type = RoomType.building){
            let newRoom = new ChatRoom('ROOM'+uuid.v4().substr(23,12), this.sio, RoomType.room);
            this.subRooms.set(newRoom.id, newRoom);
            return true;
        } else {
        return false;
        }
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