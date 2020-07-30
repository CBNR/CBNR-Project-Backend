import socketIO from 'socket.io';
import { ChatRoom } from './ChatRoom';
import { v4 as uuidv4 } from 'uuid';

export interface User{
    id: string,
    name: string
    avatarId: string
}

export class ChatUser{
    public readonly name : string;
    public room? : ChatRoom;
    public readonly socket : socketIO.Socket;
    public readonly id : string;
    public readonly avatarId : string;

    constructor(username:string, socket : socketIO.Socket, avatarId : string){
        this.name = username;
        this.avatarId = avatarId;
        this.socket = socket;
        this.id = uuidv4();
    }

    public getPublicUser() : User{
        return {
            id : this.id,
            name : this.name,
            avatarId : this.avatarId
        }
    }
}