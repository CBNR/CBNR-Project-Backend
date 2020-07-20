
// class ChatServer{
    
//     private readonly ROOM_LIMIT : number = 10;

//     private app     : express.Application = express();
//     private port    : number;
//     private server  : http.Server;
//     private io      : socketIO.Server;

//     private rooms   : Map<string, ChatRoom> = new Map<string, ChatRoom>();
//     private users   : Map<string, User> = new Map<string, User>();

//     constructor(port : number){
//         // Start http server
//         this.port = port;
//         this.server = this.app.listen(this.port, ()=>{
//             console.log('Server listening on port ' + this.port);
//         })
//         // Bind socket server to http server
//         this.io = socketIO(this.server);
//         this.initCallbacks();

//         // returns list of room IDs
//         this.app.get('/roomlist', (req,res) => {
//             let roomlist = Array.from(this.rooms.keys());
//             res.type('json');
//             res.json(roomlist);
//         })

//         // Backend debug only
//         // this.app.get('/', (req,res) => {
//         //     res.sendFile(path.join(__dirname, '..', 'debug', 'index.html')) //TODO: change to be compatible with front end.
//         // })
//     }

//     private initCallbacks(){
//         this.io.on('connection', (socket) => {
//             console.log('[New Connection] SID : ' + socket.id);
//             // TODO: Implement authentication. Replace this bit
            
//             this.users.set(socket.id, {
//                 id : 'U' + socket.id,
//                 name : 'Name#' + socket.id,
//                 socket : socket
//             });
//             let user = this.users.get(socket.id) as User;

//             // Declare default event callbacks
//             socket.on('disconnect', ()=>            {this.disconnectCB(socket.id)});

//             // Declare chatroom event callbacks
//             socket.on('chat_msg',   (chatMessage)=> {this.chatMsgCB(user, chatMessage);});
//             socket.on('join_room',  (chatRoom)=>    {this.joinRoomCB(user, chatRoom);});
//             socket.on('create_room',()=>            {this.createRoomCB(user);});
//             socket.on('leave_room', ()=>            {this.leaveRoomCB(user);});
//         });
//     }

//     private disconnectCB(socketid : string){
//         let user = this.users.get(socketid);
//         if (user != undefined){
//             if (user.room != undefined){
//                 this.leaveRoomCB(user);
//             }
//             this.users.delete(socketid);
//             console.log(user.id + ' disconnected');
//         } else {
//             // TODO : error handler here
//         }
//     }

//     private chatMsgCB(user : User, chatMessage : ChatMessage){
//         if (user.room != undefined){
//             user.room.broadcastMessage(chatMessage);
//             user.socket.emit('chat_msg_c', true);
//         } else {
//             user.socket.emit('chat_msg_c', false);
//         }
//     }

//     private joinRoomCB(user : User, roomId : string){
//         let room = this.rooms.get(roomId);
//         if (room != undefined){
//             // Check if user is in another room. remove from room if true.
//             if (user.room != undefined){
//                 this.leaveRoomCB(user);
//             }
//             // Join Room
//             user.socket.emit('join_room', true);
//             // TODO : implement room population limit.
//             room.addUser(user);
//             console.log(user.id +' user joined room ' + roomId);
//         } else {
//             user.socket.emit('join_room', false);
//             // TODO: error handler here
//             console.log(user.id +' attemped to join an empty room #' + roomId);
//         }
//     }
    
//     private createRoomCB(user : User){
//         if (this.rooms.size < this.ROOM_LIMIT){
//             let roomId = md5(user.socket.id).substr(0,10);
//             this.rooms.set(roomId, new ChatRoom(roomId));
//             this.joinRoomCB(user, roomId);
//             user.socket.emit('create_room', true);
//             this.broadcastRoomListUpdate();
//         } else {
//             user.socket.emit('create_room', false);
//             // TODO: error handler here
//         }
//     }

//     private leaveRoomCB(user : User){
//         let room : ChatRoom | undefined = user.room;
//         if (room != undefined){
//             room.removeUser(user);
//             user.socket.emit('leave_room', true);
//             if (room.population == 0) {
//                 this.rooms.delete(room.id);
//                 this.broadcastRoomListUpdate();
//             }
//         } else {
//             user.socket.emit('leave_room', false);
//             //TODO: error handler here
//         }
//     }

//     private broadcastRoomListUpdate(){
//         this.io.sockets.emit('roomlist_update');
//     }
// }

// let chatServer = new ChatServer(3001);
 