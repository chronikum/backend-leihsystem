import express from 'express';
import passport from 'passport';

import DatabaseManager from './core/databaseManager';
import UserModel from './models/mongodb-models/UserModel';

const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const router = require('./core/routes');

/**
 * Serves endpoints which can be called.
 * Handles authentication
 * {@link Server}
 */
export default class Server {
    app = express();

    port = 8080; // default port to listen

    db = DatabaseManager.instance;

    /**
     * Constructs a new instance of {@link Server}
     */
    constructor() {
        this.configureExpress();
    }

    /**
     * Setup authentication
     */
    setupAuth() {
        passport.serializeUser((user: any, done) => {
            done(null, user['_id']);
        });

        passport.deserializeUser((id, done) => {
            UserModel.findOne({ _id: id })
                .then((user) => {
                    done(null, user);
                })
                .catch((err) => {
                    done(err, null);
                });
        });
    }

    /**
     * Configure express with json, session, flash and passport
     */
    private configureExpress() {
        this.app.use(express.json({ type: '*/*' }));
        this.app.use(cors({ credentials: true, origin: 'http://localhost' }));
        this.app.use(
            session({
                secret: 'oaiulhsrkfjbdhsg67iegurkzh78owgaukzrs',
                resave: false,
                saveUninitialized: false,
            }),
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use('/', router);

        this.db.statusObservable.subscribe((x) => console.log(x));

        // When server is starting, setup atuh
        this.app.listen(this.port, () => {
            console.log(`server started at http://localhost:${this.port}`);
            this.setupAuth();
        });
    }
}


// Start server
const server = new Server();
