import express from 'express';
import passport from 'passport';

import DatabaseManager from './core/databaseManager';
import DBClient from './core/dbclient';
import SetupService from './core/SetupService';
import { UserRoles } from './enums/UserRoles';
import LDAPConfigurationModel from './models/configuration-models/LDAPConfigurationModel';
import ConfigurationClient from './models/ConfigurationClient';
import { Group } from './models/Group';
import { LDAPConfiguration } from './models/LDAPConfiguration';
import GroupModel from './models/mongodb-models/GroupModel';
import UserModel from './models/mongodb-models/UserModel';
import { User } from './models/User';

const helmet = require('helmet');

const crypto = require('crypto');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const fileUpload = require('express-fileupload');
const LdapStrategy = require('passport-ldapauth');
const router = require('./core/routes');
const chartRoutes = require('./core/ChartRoutes');
const configurationRouter = require('./core/ConfigurationRoutes');
const setupRouter = require('./core/SetupRoutes');

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

    // The endpoint of the api
    endpoint = '';

    /**
     * Database connection manager Instance
     */
    db = DatabaseManager.instance;

    /**
     * Setup service
     */
    setupService = SetupService.instance;

    /**
     * Database Client Instance
     */
    dbClient = DBClient.instance;

    /**
     * This is the configuration cliet
     */
    configurationClient = ConfigurationClient.instance;

    /**
     * Constructs a new instance of {@link Server}
     */
    constructor() {
        this.configure();
    }

    /**
     * Checks the current setup state
     */
    async checkSetupStatus(req: any, res: any, next: any) {
        const setupStatus = await SetupService.instance.checkSetupStatus();
        if ((setupStatus?.setup)) { // System is setup and ready for use
            next();
        } else {
            res.send({ success: false, message: 'The system was not setten up yet.' });
        }
    }

    /**
     * There are a few constants configuration client will provide us.
     * So we need it to initalize it earlier.
     */
    preInitConfigurationClient() {
        ConfigurationClient.instance.getLDAPConfiguration();
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

        // Cors origin
        let corsOrigin = '';

        // CORS
        const developingOrigin = 'http://localhost:4200';
        const productionOrigin = process.env.HOST || 'https://irrturm.de';

        // Uri of the API
        const developingUri = 'http://localhost:8080';
        const productionUri = process.env.HOST_API || 'https://irrturm.de/api';

        // Generate a session secret for express
        const sessionSecret = crypto.randomBytes(10).toString('hex');

        corsOrigin = developingOrigin;
        this.endpoint = developingUri;
        if (production[0] === 'prod') {
            console.log('Detected production setting.');
            corsOrigin = productionOrigin;
            this.endpoint = productionUri;
        }
        // We have to serve the core public folder so we can access user images etc
        this.app.use('/static', express.static(`${__dirname}/core/public`));
        // Helmet security
        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(cors({ credentials: true, origin: corsOrigin })); // CORS configuration
        this.app.use(fileUpload({
            createParentPath: true, // Creates specified directory
            limits: { fileSize: 10 * 1024 * 1024 },
        })); // File upload
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Cache-Control, Key, Access-Control-Allow-Origin');
            next();
        });
        this.app.use(
            session({
                secret: sessionSecret,
                resave: false,
                saveUninitialized: true,
            }),
        );
        this.app.use(passport.initialize());
        this.app.use(passport.session());
        this.app.use(flash());
        this.app.use('/basic', this.checkSetupStatus, router); // General API Router
        this.app.use('/charts', this.checkSetupStatus, chartRoutes); // Chart Router
        this.app.use('/configuration', this.checkSetupStatus, configurationRouter); // Configuration Router
        this.app.use('/setup', setupRouter); // Setup routes

        /**
         * Error handling when there is an unexpected error.
         */
        this.app.use((err, req, res, next) => {
            res.status(500);
            console.log('Request failed:');
            // console.log(req);
            console.log('500 | Internal error');
            res.send({ success: false, message: 'Sorry, we ran into an critically error.' });
        });

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
            console.log(`backend online at ${this.endpoint}`);
        });
    }

    /**
     * Creates LDAP user if not existing
     * - will return the user when created or when found
     * - currently, LDAP users won't have many permissions when they are being created, they have to be promoted manually by hand
     * - Also we are checking for following fields in the LDAP:
     *      displayName
     *      mail
     *  If those are not provided we will use fallback values. Please make sure that you are configuring your ausleihsystem accordingly
     *  In a later state it will be possible to define the fields via the .env file
     */
    async createLDAPUserIfNotExisting(user: any): Promise<User> {
        const doesUserExist = await UserModel.findOne({ username: user.uid });
        if (doesUserExist) { // User does already exist
            console.log(`User ${user?.displayName} does already exist!`);
            const userExisting = await this.dbClient.getUserforUsername(user.uid);
            return Promise.resolve(userExisting);
        } // User does not exist. We have to create the user!

        const firstname = user.displayName?.split(' ')[0] || 'Platzhalter';
        const surname = user.displayName?.split(' ')[1] || 'Platzhalter';
        const username = user.mail;
        // eslint-disable-next-line no-nested-ternary
        // const mail = user.mail ? (user.mail[0] ? user.mail[0] : user.mail) : 'platzhalter';
        const mail = user?.mail;

        const newLdapUser: User = {
            firstname,
            surname,
            email: mail,
            role: UserRoles.USER,
            username,
            groupId: [2],
        };
        console.log('I am going to create the user:');
        console.log(newLdapUser);
        await this.dbClient.createUser(newLdapUser, true);
        const newUser = await this.dbClient.getUserforUsername(newLdapUser.username);
        console.log('USER CREATED');
        return Promise.resolve(newUser);
    }

    /**
     * Will check if user can login and also handle if a new ldap user is logging in which hasn't been created yet.
     * @param username
     * @param password
     * @param done
     * @param isLDAP determines if user is a ldap user
     */
    // eslint-disable-next-line consistent-return
    private async checkUser(username?: string, password?: string, done?: any, ldapUser?: any): Promise<any> {
        // LDAP user

        if (ldapUser) {
            console.log('USER WHICH IS LOGGING IN IS A LDAP USER!');
            console.log('THE LDAP USER IS:');
            console.log(ldapUser);
            const user = await this.createLDAPUserIfNotExisting(ldapUser);
            if (user) {
                console.log('Created a new user!');
                console.log(user);
                done(null, user);
            } else {
                console.log('User WAS NOT CREATED!');
            }
            return done('ERROR');
        }
        if (username && password) {
            // Local user
            UserModel.findOne({ username }, (
                err: any,
                user: any,
            ) => {
                console.log('Authenticating...');
                if (err) {
                    console.log(err);
                    return done(null, false, null);
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
        }
    }

    /**
     * Setup authentication
     */
    private async setupAuth() {
        // Only will run if ldap is availanle
        const isLDAPavailable = await this.configurationClient.getLDAPConfiguration();
        if (isLDAPavailable) {
            const ldapConfigurationModel = await LDAPConfigurationModel.findOne({});
            console.log(ldapConfigurationModel);
            if (ldapConfigurationModel) {
                const ldapConfiguration = ldapConfigurationModel as unknown as LDAPConfiguration;
                const opts = {
                    server: {
                        url: ldapConfiguration.host,
                        bindDN: ldapConfiguration.bindDN,
                        bindCredentials: ldapConfiguration.bindCredentials,
                        searchBase: ldapConfiguration.searchBase,
                        searchFilter: ldapConfiguration.searchFilter,
                    },
                    failureErrorCallback() {
                        console.log('Something went wring!');
                    },
                };
                passport.use(new LdapStrategy(opts,
                    ((user, done) => {
                        console.log('CHECKING USER LDAP');
                        this.checkUser(null, null, done, user);
                    })));
                console.log('Passport now using ldap');
            }
        }

        passport.use(
            new LocalStrategy((
                username: string,
                password: string,
                done: any,
            ) => this.checkUser(username, password, done)),
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
            const ldapGroup = await this.createLDAPGroup();
            console.log('Created administrative group');
            console.log('Created default ldap group');
            this.dbClient.systemLog('Initiale Admingruppe erstellt.');
            this.dbClient.systemLog('SETUP COMPLETED');
        } else {
            console.log('System was started before. System is ready');
            this.dbClient.systemLog('System wurde gestartet');
        }
        this.dbClient.endpoint = this.endpoint;
        return false;
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
        await this.dbClient.createGroup(adminGroup);
        return GroupModel.findOne({ description: 'Administrative Gruppe' }) as unknown as Group;
    }

    /**
     * Creates initial ldap group
     */
    private async createLDAPGroup(): Promise<Group> {
        const ldapGroup: Group = {
            displayName: 'LDAP Group',
            description: 'Diese Gruppe wird allen LDAP-Usern zugewiesen',
            role: [UserRoles.USER],
        };
        await this.dbClient.createGroup(ldapGroup);
        return GroupModel.findOne({ description: 'Diese Gruppe wird allen LDAP-Usern zugewiesen' }) as unknown as Group;
    }
}

/**
 * Start server
 */
const server = new Server();
