import express from 'express';
import http from 'http';
import https from 'https';

import redis from 'redis';
import connectRedis from 'connect-redis';
import session from 'express-session';

import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { ChatServer } from "./ChatServer";
import * as dotenv from 'dotenv';

// Environment variables
dotenv.config({path:path.join(__dirname, '..', '..', '.env')});
const DOMAIN = process.env.DOMAIN || "localhost";
const NODE_ENV = process.env.NODE_ENV || "dev";
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3001;
const REDIS_DOMAIN = process.env.REDIS_DOMAIN || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const SECRET = process.env.SECRET || "8972q3hxn78tgb*bgr65F967";
const SESSION_SECURE = process.env.NODE_ENV === 'production';

class CbnrServer{
    private socketServer : ChatServer;
    private httpServer : http.Server;
    private httpsServer : https.Server;

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

        // Init httpServer
        this.httpsServer = https.createServer(
            {
            key: fs.readFileSync(path.join(__dirname, '..', '..', 'private.key')),
            cert: fs.readFileSync(path.join(__dirname, '..', '..', 'certificate.crt'))
            },
            this.app
        );
        
        // For production, always use the https server
        if (NODE_ENV === 'production'){
            this.httpServer = http.createServer((req,res)=>{
                res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
                res.end();
            });
            this.socketServer = new ChatServer(this.httpsServer, this.sessionMiddleware);
        } else {
            this.httpServer = http.createServer(this.app);
            this.socketServer = new ChatServer(this.httpServer, this.sessionMiddleware);
        }

        // Init middlewares
        this.app.use(this.sessionMiddleware);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended:true}));

        // deploy with react
        this.app.use(express.static(path.join(__dirname, 'public')));
        // Declare routes
        this.initRoutes();
    }

    private initRoutes(){
        this.app.get('/', function(req, res) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

    public listen(){
        this.httpsServer.listen(HTTPS_PORT, ()=>{
            console.log("HTTPS server listening to port " + HTTPS_PORT);
        });
        this.httpServer.listen(HTTP_PORT, ()=>{
            console.log("HTTP server listening to port " + HTTP_PORT);
        });
    }
}

let cbnr = new CbnrServer();
cbnr.listen();