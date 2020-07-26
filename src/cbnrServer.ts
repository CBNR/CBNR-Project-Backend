import express from 'express';
import http from 'http';
import socketIO from 'socket.io';

import redis from 'redis';
import connectRedis from 'connect-redis';
import session from 'express-session';

import {cbnrRouter} from './cbnrRouter';
import bodyParser from 'body-parser'

// Environment variables

const {
    PORT = 3001,
    REDIS_DOMAIN = 'localhost',
    REDIS_PORT = '6379',
    SECRET = 'YEETUS DA GITUS',
    NODE_ENV = 'dev'
} = process.env;

const SESSION_SECURE = process.env.NODE_ENV === 'production';

class CBNRServer{
    private app : express.Application;
    private server : http.Server; // Replace with https in production
    private sio : socketIO.Server;

    private redisStore : connectRedis.RedisStore;
    private redisClient : redis.RedisClient;

    constructor(){
        // Init servers
        this.app = express();
        this.server = http.createServer(this.app);
        this.sio = socketIO(this.server);
        
        // Init redis stuff for session control
        this.redisStore = connectRedis(session);
        this.redisClient = redis.createClient();

        // Other settings + middleware
        this.initMiddleware();

        // Define routes
        this.app.use('/', cbnrRouter);

        // Start listening
        this.server.listen(PORT, ()=>{
            console.log('http server listening to port ' + PORT);
        });
    }

    private initMiddleware(){
        // Session management
        let sessionMiddleware = session({
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

        this.sio.use((socket, next) => {
            sessionMiddleware(socket.request, socket.request.res || {}, next);
        });
        
        this.app.use(sessionMiddleware);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended:true}));
    }

}

// TODO: declare someplace else
let tomato = new CBNRServer();