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
        // DEBUG
        // this.app.get('/', (req,res) => {
        //     res.sendFile(path.join(__dirname, '..', 'debug', 'index.html')) //TODO: change to be compatible with front end.
        // })
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
        
        // Handle custom events
        socket.on('chat_msg', (chatMessage) => {
            this.rcvChatCB(chatMessage);
        });
        
        // Handle builtin events
        socket.on('disconnect', () => {
            this.disconnectCB(socket);
        });
        socket.on('connect_timeout', () => {
            this.timeoutCB(socket);
        });
    }

    /**
     * Chat receive callback. When a chat is received, emit the same signal
     * all other sockets.
     * @param chatMessage 
     */
    private rcvChatCB(chatMessage : ChatMessage) : void{
        this.io.sockets.emit('chat_msg', chatMessage);
    }

    /**
     * Disconnect callback
     * @param socket 
     */
    private disconnectCB(socket : socketIO.Socket){
        console.log('[Connection closed] ' + socket.id);
    }

    /**
     * Connection timeout callback.
     * @param socket 
     */
    private timeoutCB(socket : socketIO.Socket){
        console.log('[Timeout] ' + socket.id);
    }

}

let chatServer = new ChatServer(3001);
