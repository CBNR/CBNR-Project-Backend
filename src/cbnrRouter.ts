import express from 'express';
import path from 'path';
import csrf from 'csurf';
import bodyParser from 'body-parser'
import session from 'express-session';

export const cbnrRouter = express.Router();

// TODO: figure out csrf protection

// cbnrRouter.use((req,res,next)=>{
//     next();
// });

// const csrfProtection = csrf();

// cbnrRouter.use(csrfProtection);

cbnrRouter.get('/', (req,res)=>{
    if (req.session){
        req.session.tomato = 'tomato';
        console.log(req.session.id);
    }
    res.sendFile(path.join(__dirname,'..','debug', 'test.html'));
});

cbnrRouter.get('/chat', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'debug', 'chat.html'));
});

cbnrRouter.post('/login',(req, res, next)=>{
    let email;
    let password;
    if ('username' in req.body && 'email' in req.body){
        console.log('yeet');
    }
    res.send();
});

cbnrRouter.post('/register',(req, res, next)=>{
    let username;
    let email;
    let password;    
    if ('username' in req.body && 'password' in req.body && 'email' in req.body){
        console.log('yeet');
    }
    res.redirect('/');
    res.send();
});

cbnrRouter.get('*', (req, res)=>{
    res.send('404 - Page not found');
});