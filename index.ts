import express from 'express';
import passport from 'passport';

import DatabaseManager from './core/databaseManager';
import DBClient from './core/dbclient';
import { UserRoles } from './enums/UserRoles';
import { Group } from './models/Group';
import GroupModel from './models/mongodb-models/GroupModel';
import UserModel from './models/mongodb-models/UserModel';
import { User } from './models/User';

const helmet = require('helmet');

const crypto = require('crypto');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const router = require('./core/routes');
require('dotenv').config();

/**
 * Determines if the server is running in production
 */
const production = process.argv.slice(2);

/**
 * Serves endpoints which can be called.
 * - Handles authentication
 * - Manages database
 * {@link Server}
 */
export default class Server {
    app = express();

    port = 8080; // default port to listen

    /**
     * Database connection manager Instance
     */
    db = DatabaseManager.instance;

    /**
     * Database Client Instance
     */
    dbClient = DBClient.instance;

    /**
     * Constructs a new instance of {@link Server}
     */
    constructor() {
        this.configure();
    }

    /**
     * Configure System with production or development environment
     * - express with json, session, flash and passport
     * - calls setupAuth() when ready
     * - Creates initial admin users if necessary
     */
    private configure() {
        /**
         * ENV VARIABLES
         */

        let corsOrigin = '';

        // CORS
        const developingOrigin = 'http://localhost:4200';
        const productionOrigin = 'https://irrturm.de';

        // Uri of the API
        const productionUri = 'http://localhost:8080';
        const developingUri = 'https://irrturm.de/api';

        corsOrigin = developingOrigin;
        if (production[0] === 'prod') {
            console.log('Detected production setting.');
            corsOrigin = productionOrigin;
        }
        // Helmet security
        this.app.use(helmet());

        this.app.use(express.json({ type: '*/*' }));
        this.app.use(cors({ credentials: true, origin: corsOrigin }));
        this.app.use(
            session({
                secret: 'oaiulhsrkfjbdhsg67iegurkzh78owgaukzrs',
                resave: false,
                saveUninitialized: true,
            }),
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use('/', router);

        // Fires when database is available
        this.db.databaseReady.subscribe(async (connectionSuccess) => {
            if (connectionSuccess) {
                // Setup auth
                this.setupAuth();
                // Run initial configuration setup if necessary
                await this.runInitialConfigurationIfNecessary();
                console.log('System ready');
            } else {
                console.log('ERROR: Connection to database failed. Detailed information are in the logs.');
            }
        });

        // When server is starting, setup auth
        this.app.listen(this.port, async () => {
            console.log(`backend online at http://localhost:${this.port}`);
        });
    }

    /**
     * Setup authentication
     */
    private setupAuth() {
        passport.use(
            new LocalStrategy((
                username: string,
                password: string,
                done: any,
            ) => {
                UserModel.findOne({ username }, (
                    err: any,
                    user: any,
                ) => {
                    console.log('Authenticating...');
                    if (err) {
                        console.log(err);
                        return done(err);
                    }
                    if (!user) {
                        console.log('User not found!');
                        return done(null, false, { message: 'Incorrect username.' });
                    }
                    const hashedPW = crypto.createHmac('sha256', password).digest('hex');
                    if (user.password !== hashedPW) {
                        console.log('Password incorrect');
                        return done(null, false, { message: 'Incorrect password.' });
                    }
                    return done(null, user);
                });
            }),
        );

        passport.serializeUser((user: any, done) => {
            done(null, user._id);
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
     * Runs initial cofniguration if required
     * - Creates administrative users
     * - Checks enviroment
     *
     * @returns boolean if completed
     */
    async runInitialConfigurationIfNecessary(): Promise<boolean> {
        if (await this.dbClient.isFirstStart()) {
            console.log('Is first start. Configuring system...');
            const group = await this.createAdministrativeGroup();
            console.log('Created administrative group');
            console.log(group);
            if (this.createInitialUser()) {
                console.log('Admin user created.');
                console.log('System setup completed');
                this.dbClient.systemLog('SETUP COMPLETED');
            }
        } else {
            console.log('System was started before. System is ready');
        }
        return false;
    }

    /**
     * Create initial administrative users
     * @TODO Remove hardcoded e-mail and hardcoded first and surname
     * @TODO Implement a frontend installation procedure
     *
     * @returns boolean success
     */
    private async createInitialUser(): Promise<boolean> {
        // TODO: Create Admin group with identifier 0
        const initialAdminPassword = crypto.randomBytes(4).toString('hex');
        const adminUser: User = {
            firstname: 'Admin',
            surname: 'user',
            password: initialAdminPassword,
            email: 'fritz@nosc.io',
            role: UserRoles.ADMIN,
            username: 'systemadmin',
            groupId: [1],
        };
        console.log(`The initial admin password will be: ${adminUser.password}`);
        return this.dbClient.createUser(adminUser);
    }

    /**
     * Creates initial administrative group
     */
    private async createAdministrativeGroup(): Promise<Group> {
        const adminGroup: Group = {
            displayName: 'Admin',
            description: 'Administrative Gruppe',
            role: [UserRoles.ADMIN],
        };
        this.dbClient.createGroup(adminGroup);
        return GroupModel.findOne({ description: 'Administrative Gruppe' }) as unknown as Group;
    }
}

/**
 * Start server
 */
const server = new Server();
