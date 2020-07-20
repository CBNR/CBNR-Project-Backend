
// import { User, ChatMessage } from './chatServer';

// export class ChatRoom {

//     private users : User[];
//     public id : string;
//     public population : number = 0;
//     // TODO: Implement human readable room name

//     constructor(roomId : string){
//         this.users = [];
//         this.id = roomId
//         console.log("New room created");
//     }

//     public addUser(user : User){
//         // Add user to room's user list
//         this.users.push(user);
//         // Announce to everyone in room
//         let msg : ChatMessage = {
//             handle : 'Server',
//             message : user.name + " has entered the room"
//         }
//         // Register room reference on user
//         user.room = this;
//         this.broadcastMessage(msg);
//         this.population++;
//     }

//     public removeUser(user : User){
//         // Remove user from room's user list
//         const index = this.users.indexOf(user, 0);
//         if (index > -1){
//             this.users.splice(index, 1);
//         }
//         // Announce to everyone in room
//         let msg : ChatMessage = {
//             handle : 'Server',
//             message : user.name + " has left the room"
//         }
//         this.broadcastMessage(msg);
//         user.room = undefined;
//         this.population--;
//     }

//     public broadcastMessage(msg : ChatMessage){
//         this.users.forEach(user => {
//             user.socket.emit('chat_msg', msg);
//         });
//     }

//     public broadcastJoin(user : User){
//         this.users.forEach(user => {
//             user.socket.emit('user_join');
//         });
//     }

// }


