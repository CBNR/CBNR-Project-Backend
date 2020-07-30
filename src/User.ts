import socketIO from 'socket.io';
import { ChatRoom } from './ChatRoom';


export class User{
    public name : string;
    public room? : ChatRoom;
    public socket : socketIO.Socket;

    constructor(username:string, socket : socketIO.Socket){
        this.name = username;
        this.socket = socket;
    }
}