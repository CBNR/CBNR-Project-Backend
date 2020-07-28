import express, { RequestHandler } from 'express';
import http from 'http';
import socketIO, { Room } from 'socket.io';

import redis from 'redis';
import connectRedis from 'connect-redis';
import session from 'express-session';

import {cbnrRouter} from './cbnrRouter';
import bodyParser from 'body-parser';
import path from 'path';

// Environment variables

const {
    PORT = 3001,
    REDIS_DOMAIN = 'localhost',
    REDIS_PORT = '6379',
    SECRET = 'YEETUS DA GITUS',
    NODE_ENV = 'dev'
} = process.env;

const SESSION_SECURE = process.env.NODE_ENV === 'production';

interface EventResponse{
    event : string,
    success : boolean,
    errMsg : string
}

class User{
    public name : string;
    private room? : ChatRoom;
    private socket : socketIO.Socket;

    constructor(username:string, socket : socketIO.Socket){
        this.name = username;
        this.socket = socket;
    }
}

interface ChatMessage{
    time : number,
    sender : string,
    message : string
}

class ChatRoom{
    public id : string;
    protected users = new Set<socketIO.Socket>();
    protected sio : socketIO.Server;
    private date : Date = new Date();

    // TODO : Add chat filter

    constructor(id : string, sio : socketIO.Server){
        this.id = id;
        this.sio = sio;
    }
    
    public broadcastMsg(sender : string, message : string){
        this.sio.to(this.id).emit('chat_msg', {
            time : this.date.getTime(),
            message : message,
            sender : sender
        });
    }

    public addUser(socket : socketIO.Socket){
        socket.join(this.id, ()=>{
            this.broadcastMsg("Server", socket.request.session.username + " joined the room.");
        });
    }

    public removeUser(socket : socketIO.Socket){
        socket.leave(this.id, ()=>{
            this.broadcastMsg("Server", socket.request.session.username + " left the room.");
        });
    }
}

class ChatServer{
    
    private httpServer : http.Server;
    private sio : socketIO.Server;

    constructor(server : http.Server, sessionMiddleware : express.RequestHandler){
        this.httpServer = server;
        this.sio = socketIO(this.httpServer);

        // connect sockets to sessions
        this.sio.use((socket, next) => {
            sessionMiddleware(socket.request, socket.request.res || {}, next);
        });
    
        this.initSocketEvents();
    }

    // == Public Functions ================================================================= //

    // No public functions

    // == Private functions ================================================================ //

    private initSocketEvents(){
        this.sio.on('connection', (socket) => {

            // Authenticate user
            if(this.authenticate(socket)){
                this.eventRes(socket, 'connection', true);
            } else {
                this.eventRes(socket, 'connection', false, 'User not logged in');
                socket.disconnect();
            }

            // TODO: Generate new user instance or something here

            // == Register event handlers ==//
            // Default callbacks
            socket.on('disconnect', ()=>this.disconnectCB(socket) );
            socket.on('timeout',    ()=>this.timeoutCB(socket));

            // Chatroom callbacks
            socket.on('join_building',  ()=>this.joinBuildingCB(socket));
            socket.on('join_room',      ()=>this.joinRoomCB(socket));
            socket.on('leave_building', ()=>this.leaveBuildingCB(socket));
            socket.on('leave_room',     ()=>this.leaveRoomCB(socket));
            socket.on('create_room',    ()=>this.createRoomCB(socket));
            socket.on('chat_msg',       ()=>this.textChatCB(socket));
        });
    }

    private authenticate(socket: socketIO.Socket) : boolean{
        if (socket.request.session && socket.request.session.username){
            return true;
        } else {
            return false;
        }
    }

    private eventRes(socket : socketIO.Socket, event : string, success : boolean, errMsg : string = 'OK'){
        let response : EventResponse = {
            event: event,
            success : success,
            errMsg : errMsg
        }
        socket.emit('res', response);
    }

    // == Default Callbacks ================================================================ //
    private disconnectCB(socket : socketIO.Socket){
        // leave existing rooms
        // leave building
        // Basically define user as blank
        // If in room, announce to others that this guy has disconnected
    }

    private timeoutCB(socket : socketIO.Socket){
        this.disconnectCB(socket);
    }

    // == Chat Room Callbacks ============================================================== //
    private joinBuildingCB(socket : socketIO.Socket){
        // TODO: implement
        // DO NOT Announce to others that this guy has connected
        // Just register the guy into a building class
    }

    private leaveBuildingCB(socket : socketIO.Socket){
        // TODO: implement
        // DO NOT Announce to others that this guy has disconnected
        // Deregister the guy from the building
    }

    private createRoomCB(socket : socketIO.Socket){
        // TODO: implement
        // Create new room instance or whatever
    }

    private joinRoomCB(socket : socketIO.Socket){
        // TODO: implement
        // Add socket/session/user to room
        // Announce to others that this guy has joined the room (chat_msg)
    }

    private leaveRoomCB(socket : socketIO.Socket){
        // TODO: implement
        // remove socket/session/user from room
        // Announce to others that this guy has left the room (chat_msg)
    }

    private textChatCB(socket : socketIO.Socket){
        // TODO: implement
        // Send message to everyone in chat
    }

    // == Other Callbacks ============================================================== //
    private logoutCB(){
         // TODO: Maybe implement as POST request?
    }
}

class CbnrServer{

    private socketServer : ChatServer;
    private httpServer : http.Server;
    
    private redisStore : connectRedis.RedisStore;
    private redisClient : redis.RedisClient;

    private app : express.Application;
    private sessionMiddleware : express.RequestHandler;

    constructor(){
        // Init express
        this.app = express();

        // Init redis and sessions
        this.redisStore = connectRedis(session);
        this.redisClient = redis.createClient();
        this.sessionMiddleware = session({
            store : new this.redisStore({
                host: REDIS_DOMAIN,
                port: parseInt(REDIS_PORT),
                client: this.redisClient
            }),
            saveUninitialized : false,
            secret  : SECRET, // TODO: replace with a better key
            resave  : false,
            rolling : false,
            cookie  : {
                maxAge  : 7200000, // cookie expiry in miliseconds
                sameSite: true,
                secure: SESSION_SECURE // set node_env to production in real server.
            }
        });

        // Init middlewares
        this.app.use(this.sessionMiddleware);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended:true}));

        // Init servers
        this.httpServer = http.createServer(this.app);
        this.socketServer = new ChatServer(this.httpServer, this.sessionMiddleware);

        // Declare routes
        this.initRoutes();
    }

    private initRoutes(){
        this.app.get('/', (req,res)=>{
            res.sendFile(path.join(__dirname,'..','debug', 'test.html'));
        });

        this.app.post('/login', (req,res)=>{
            // Return status 500 if server fails to create a session.
            if (!req.session){
                res.status(500);
                res.send();
            } else {
                if (req.body.username){
                    req.session.username = req.body.username;
                    res.status(200);
                    res.redirect('/');
                } else {
                    res.status(400);
                    res.send();
                }
            }
        });
    }

    public listen(port : number){
        this.httpServer.listen(port, ()=>{
            console.log("server listening to port " + port);
        });
    }
}

let tomato = new CbnrServer();
tomato.listen(3001);