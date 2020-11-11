import express from 'express';
import passport from 'passport';

import DatabaseManager from './core/databaseManager';

const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');

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

        this.app.listen(this.port, () => {
            console.log(`server started at http://localhost:${this.port}`);
        });
    }
}

// Start server
const server = new Server();
