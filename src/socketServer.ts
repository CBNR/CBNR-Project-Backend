import express, { response } from 'express';
import path from 'path';
import http from 'http';
import socketIO, { Socket, listen, Room } from 'socket.io';
import {ChatRoom} from './chatRoom';
import md5 from 'md5';

// ============================================================================================ //
// = Interfaces =============================================================================== //
// ============================================================================================ //

// interface ChatMessage{
//     handle : string,
//     message: string,
//     target?: string, // TODO: private chat targets to be implemented
//     auth? : Object
// };

// interface User{
//     id : string,
//     name : string,
//     loginType? : string
// };

export interface EventResponse{
    event : string,
    success: boolean,
    errMsg: string
}

export interface ChatMessage{
    roomId : string;
    message : string;
}

// ============================================================================================ //
// = Start Server ============================================================================= //
// ============================================================================================ //
const APPROVED_ROOM_SUFFIX = ['CHRM', 'BLDG', 'MAIN'];
const DEFAULT_ROOMS = ['BLDG21CHN'];
const PORT : number = 3001;

const app : express.Application = express();
const server : http.Server = app.listen(PORT, ()=>{console.log('Server listening on port' + PORT);});
const io : socketIO.Server = socketIO(server);

io.on('connection', onConnect);

// ============================================================================================ //
// = DEBUG ONLY ============================================================================ //
// ============================================================================================ //
app.get('/chat', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'debug', 'chat.html'))
})

app.get('/login', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'debug', 'chat.html'))
})

app.get('*', (req, res)=>{
    res.status(404).send('404 - Page not found');
});

// ============================================================================================ //
// = Init non-system variables ================================================================ //
// ============================================================================================ //
const rooms : Set<string> = new Set<string>();

// ============================================================================================ //
// = Initialise Callbacks ===================================================================== //
// ============================================================================================ //

/**
 * Connection callback. Initialises callback functions when a new client connects.
 * @param socket 
 */
function onConnect(socket : socketIO.Socket){
    socket.on('login', ()=>{})
    socket.on('disconnect', ()=>disconnectCB(socket));
    socket.on('timeout', ()=>timeoutCB(socket));
    socket.on('create_room', (roomId : string)=>createRoomCB(socket, roomId));
    socket.on('join_room', (roomId : string)=>joinRoomCB(socket, roomId));
    socket.on('leave_room', (roomId : string)=>leaveRoomCB(socket, roomId));
    socket.on('chat_msg', (chatMessage)=>chatMsgCB(socket, chatMessage));
    
    // Confirm a connection and establish a session with that user.
    // We're assuming every new window is a new session, for now.
    console.log("New connection | SID: " + socket.id);
    console.log(Object.values(socket.client.sockets).length);
}

/**
 * Disconnect callback. Runs when a client socket disconnects.
 * @param socket 
 */
function disconnectCB(socket : socketIO.Socket){
    // TODO Implement
};

/**
 * Timeout callback. Runs when a client socket times out.
 * @param socket 
 */
function timeoutCB(socket : socketIO.Socket){
    //TODO Implement
};

/**
 * Callback function when a 'join_room' event is received from a client.
 * Adds client socket to a room if it exists.
 * 
 * @param roomId string - roomId to join
 * @param socket 
 */
function joinRoomCB(socket : socketIO.Socket, roomId : string){

    // Check if room exists
    if (!rooms.has(roomId)){
        eventRes(socket, 'create_room', false, 'Invalid room');
        return;
    }

    // Attempt to join room
    socket.join(roomId, (err) => {
        if (!err){
            eventRes(socket, 'create_room', true, 'OK');
        } else {
            eventRes(socket, 'join_room', false, 'Server error, cannot join room.');
            // TODO: Add more room security
        }
    });
};

/**
 * Callback function when a 'create_room' event is received from a client.
 * Creates a socket room if name is valid. (For now)
 * 
 * @param roomId string - roomId to create
 * @param socket 
 */
function createRoomCB(socket : socketIO.Socket, roomId : string){
    // Check if room ID has a valid name
    if(!(APPROVED_ROOM_SUFFIX.includes(roomId.substr(0,4)) && roomId.length > 4) ){
        eventRes(socket, 'create_room', false, "Invalid room ID. Refer to naming convention");
        return;
    }
    
    // Attempt to create room.
    // TODO: Implement room amount limit
    // TODO: Implement room permissions
    socket.join(roomId, (err) => {
        if (!err){
            rooms.add(roomId);
            eventRes(socket, 'create_room', true, 'OK');
        } else {
            eventRes(socket, 'create_room', false, 'Server error, cannot create room.');
        }
    });
};

/**
 * Callback function when a 'leave_room' event is received from a client.
 * Removes the client from a room.
 * 
 * @param roomId string - roomId to leave
 * @param socket 
 */
function leaveRoomCB(socket : socketIO.Socket, roomId : string){
    // Check if client is in room
    if (!Object.keys(socket.rooms).includes(roomId)){
        eventRes(socket, 'leave_room', false, 'User not in specified room');
        return;
    }
    // If client is in the room, attempt to leave room
    socket.leave(roomId, (err: any)=>{
        if (!err){
            eventRes(socket, 'leave_room', true, 'OK');
        } else {
            eventRes(socket, 'leave_room', false, 'Server error, failed to leave room');
        }
    });
};

/**
 * Callback function when a 'chat_msg' event is received from a client.
 * Broadcasts a ChatMessage object to everyone in the room.
 * 
 * @param roomId string - roomId to leave
 * @param socket 
 */
function chatMsgCB(socket : socketIO.Socket, chatMessage : ChatMessage){
    let roomId = chatMessage.roomId;
    let message = chatMessage.message;

    // Check if room exists
    if (rooms.has(roomId)){
        // Check if user is in said room
        if (Object.keys(socket.rooms).includes(roomId)){
            socket.to(roomId).emit('chat_msg', message);
            eventRes(socket, 'chat_msg', true, 'OK');
            return;
        } else {
            eventRes(socket, 'chat_msg', false, 'Client must be in room to send message');
        }
    } else {
        eventRes(socket, 'chat_msg', false, 'Room does not exist');
    }    

};

/**
 * Send the client an event response through socket onnection.
 * 
 * @param socket client socket.
 * @param event name of event (e.g. join_room)
 * @param success boolean
 * @param errMsg Error message to send to client ('OK' if no error)
 */
function eventRes(socket : socketIO.Socket, event : string, success : boolean, errMsg : string){
    let response : EventResponse = {
        event: event,
        success : success,
        errMsg : errMsg
    }
    socket.emit(event, response);
}