import express from 'express';
import path from 'path';
import http from 'http';
import socketIO from 'socket.io';

interface ChatMessage{
    handle : string,
    message: string,
    target?: string // TODO: private chat targets to be implemented
}

class ChatServer{
    
    private port : number;
    private app : express.Application;
    private server : http.Server;
    private io : socketIO.Server;

    constructor (port : number){
        this.port = port;
        this.app = express();
        this.server = this.app.listen(port, () => {
            console.log('Server listening on port ' + this.port);
        })
        this.io = socketIO(this.server);

        this.initCallbacks();

        // For backend debug only
        this.app.get('/', (req,res) => {
            res.sendFile(path.join(__dirname, '..', 'debug', 'index.html')) //TODO: change to be compatible with front end.
        })
    }

    private initCallbacks(){
        this.io.on('connection', (socket) => {
            console.log('[New Connection] ' + socket.id);
            socket.on('chat_msg', (chatMessage : ChatMessage) => {
                this.io.sockets.emit('chat_msg', chatMessage);
            });
        });
    }
    
    // private initCallbacks(){
    //     this.io.on('connection', (socket) => {
    //         console.log('new connection');
    //     });
    // }

    // private connectionCB(socket : socketIO.Socket){
    // }

    // private rcvChatCB(chatMessage : ChatMessage) : void{
    // }

}

let chatServer = new ChatServer(3001);
