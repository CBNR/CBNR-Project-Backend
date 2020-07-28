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

// For now, login only contains a username.
cbnrRouter.use((req,res,next)=>{
    console.log(req.session);
    next();
})

cbnrRouter.post('/login',(req, res)=>{
    if (req.session){
        if ('username' in req.body){
            res.status(201);
            req.session.username = req.body.username;
            res.redirect('/');
        } else {
            res.status(400);
        }
    } else {
        // if session does not exist. return server error.
        res.status(500);
    }
    res.send();
});


cbnrRouter.get('/login', (req,res)=>{
    res.sendFile(path.join(__dirname,'..','debug', 'login.html'));
});

cbnrRouter.get('/', (req,res)=>{
    if (!req.session?.username){
        res.redirect('/login');
    } else {
        res.sendFile(path.join(__dirname,'..','debug', 'test.html'));
    }
});

cbnrRouter.get('*', (req, res)=>{
    res.send('404');
});