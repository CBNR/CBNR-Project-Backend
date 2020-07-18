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

    /**
     * Constructor
     * @param port connection port number. usually 3001.
     */
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

    /**
     * Declare initial connection callback
     */
    private initCallbacks(){
        this.io.on('connection', (socket) => {
            this.connectionCB(socket);
        });
    }

    /**
     * Connection callback. This method initialises all socket callbacks.
     * @param socket 
     */
    private connectionCB(socket : socketIO.Socket){
        console.log('[New Connection] ' + socket.id);
        socket.on('chat_msg', (ChatMessage) => {
            this.rcvChatCB(ChatMessage);
        })
    }

    /**
     * Chat receive callback. When a chat is received, emit the same signal
     * all other sockets.
     * @param chatMessage 
     */
    private rcvChatCB(chatMessage : ChatMessage) : void{
        this.io.sockets.emit('chat_msg', chatMessage);
    }
}

let chatServer = new ChatServer(3001);
