import express, { response } from 'express';
import path from 'path';
import http from 'http';
import socketIO, { Socket, listen, Room } from 'socket.io';
import md5 from 'md5';

interface ChatMessage{
    handle : string,
    message: string,
    target?: string, // TODO: private chat targets to be implemented
    auth? : Object
};

interface User{
    id : string,
    name : string,
    loginType? : string
};

const APPROVED_ROOM_SUFFIX = ['CHRM', 'BLDG', 'MAIN'];
const DEFAULT_ROOMS = ['BLDG21CHN']
const PORT : number = 3001;

const app : express.Application = express();
const server : http.Server = app.listen(PORT, ()=>{console.log('Server listening on port' + PORT);});
const io : socketIO.Server = socketIO(server);

io.on('connection', onConnect);

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'debug', 'index.html'))
})

const rooms : Set<string> = new Set<string>();

function onConnect(socket : socketIO.Socket){
    socket.on('disconnect', ()=>disconnectCB(socket));
    socket.on('timeout', ()=>timeoutCB(socket));
    socket.on('create_room', (roomId : string)=>createRoomCB(roomId, socket));
    socket.on('join_room', (roomId : string)=>joinRoomCB(roomId, socket));
    socket.on('leave_room', ()=>leaveRoomCB(socket));
    socket.on('chat_msg', ()=>chatMsgCB(socket));
    
    // Confirm a connection and establish a session with that user.
    // We're assuming every new window is a new session, for now.
    console.log("New connection | SID: " + socket.id);
    console.log(Object.keys(socket.rooms));
}

function disconnectCB(socket : socketIO.Socket){

};

function timeoutCB(socket : socketIO.Socket){
    
};

interface EventResponse{
    success: boolean,
    errMsg: string
}

/**
 * Callback function when a 'join_room' event is received from a client.
 * 
 * @param roomId room to join
 * @param socket 
 */
function joinRoomCB(roomId : string, socket : socketIO.Socket){

    // Check if room exists
    if (!rooms.has(roomId)){
        socket.emit('join_room', genEventRes(false, 'Invalid room'));
        return;
    }

    // Attempt to join room
    socket.join(roomId, (err) => {
        if (!err){
            socket.emit('join_room', genEventRes(true, 'OK'));
        } else {
            socket.emit('join_room', genEventRes(true, 'Server error'));
            // TODO: Add more room security
        }
    });
};

/**
 * Generates an EventResponse object for socket events.
 * 
 * @param success boolean.
 * @param errMsg Error message to send to client
 */
function genEventRes(success : boolean, errMsg : string) : EventResponse {
    let response : EventResponse = {
        success : success,
        errMsg : errMsg
    }
    return response;
}

function createRoomCB(roomId : string, socket : socketIO.Socket){
    
    // Check if room ID has a valid name
    if(!(APPROVED_ROOM_SUFFIX.includes(roomId.substr(0,4)) && roomId.length > 4) ){
        socket.emit('join_room', genEventRes(false, "Invalid room ID. Refer to naming convention"));
        return;
    }
    
    // Attempt to create room.
    // TODO: Implement room amount
    socket.join(roomId, (err) => {
        if (!err){
            rooms.add(roomId);
            socket.emit('create_room', genEventRes(true, 'OK'));
        } else {
            socket.emit('create_room', genEventRes(false, 'Server error'));
        }
    });
    
    
};

function leaveRoomCB(socket : socketIO.Socket){

};

function chatMsgCB(socket : socketIO.Socket){  

};