import express from 'express';
import http from 'http';
import socketIO from 'socket.io';

import redis from 'redis';
import connectRedis from 'connect-redis';
import session from 'express-session';

import bodyParser from 'body-parser';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { RoomType } from "./model/RoomType";
import { ChatServer } from "./ChatServer";
import { ChatRoom } from "./ChatRoom";

// Environment variables
const {
    PORT = 3001,
    REDIS_DOMAIN = 'localhost',
    REDIS_PORT = '6379',
    SECRET = 'YEETUS DA GITUS',
    NODE_ENV = 'dev'
} = process.env;

const SESSION_SECURE = process.env.NODE_ENV === 'production';

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
                if (req.body.username != undefined && req.body.avatarId != undefined){
                    req.session.username = req.body.username;
                    req.session.avatarId = req.body.avatarId;
                    req.session.userId = uuidv4();
                    res.status(200);
                    res.send(req.session.userId);
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