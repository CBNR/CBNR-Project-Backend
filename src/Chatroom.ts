import socketIO from 'socket.io';

export interface User{
    name : string,
    socket : socketIO.Socket,
    chatRoom? : ChatRoom
}

export class ChatRoom{
    
    private users : Set<User> = new Set<User>();
    private name : string;
    // private id : string;
    private socketRoom? : socketIO.Room;

    constructor(name: string) {
        this.name = name;
        
    }

    public getName() : string {
        return this.name;
        
    }

    public addUser(user : User){
        this.users.add(user);
        user.chatRoom = this;
        user.socket.rooms
    }

}