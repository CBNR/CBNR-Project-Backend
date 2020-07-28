import express, { RequestHandler } from 'express';
import http from 'http';
import socketIO from 'socket.io';

import redis from 'redis';
import connectRedis from 'connect-redis';
import session from 'express-session';

import {cbnrRouter} from './cbnrRouter';
import bodyParser from 'body-parser';

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
            if(this.authenticate(socket)){
                this.eventRes(socket, 'connection', true);
            } else {
                this.eventRes(socket, 'connection', false, 'User not logged in');
                socket.disconnect();
            }
            
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

    // == Chat Room Callbacks ============================================================== //
    private joinBuildingCB(){}
    private createRoomCB(){}
    private joinRoomCB(){}
    private leaveRoomCB(){}
    private textChatCB(){}

    // == Default Callbacks ================================================================ //
    private disconnectCB(){}
    private timeoutCB(){}
    // TODO: add more handlers

}

class CbnrServer{

    private socketServer : ChatServer;
    private httpServer : http.Server;
    
    private redisStore : connectRedis.RedisStore;
    private redisClient : redis.RedisClient;

    private expressApp : express.Application;
    private sessionMiddleware = session({
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
    });;

    constructor(){
        // Init express
        this.expressApp = express();

        // Init redis
        this.redisStore = connectRedis(session);
        this.redisClient = redis.createClient();

        // Init middlewares
        this.expressApp.use(this.sessionMiddleware);
        this.expressApp.use(bodyParser.json());
        this.expressApp.use(bodyParser.urlencoded({extended:true}));

        // Init servers
        this.httpServer = http.createServer(this.expressApp);
        this.socketServer = new ChatServer(this.httpServer, this.sessionMiddleware);

        // Declare routes
        this.initRoutes();
    }

    private initRoutes(){

    }

    public listen(port : number){
        this.httpServer.listen(port, ()=>{
            console.log("server listening to port " + port);
        });
    }
}
