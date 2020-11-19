// eslint-disable-next-line import/extensions
import passport from 'passport';
import { UserRoles } from '../enums/UserRoles';
import { Item } from '../models/Item';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import DatabaseManager from './databaseManager';
import DBClient from './dbclient';
import RoleCheck from './RoleCheck';

const express = require('express');
// The database manager
const dbManager = DatabaseManager.instance;

/**
 * The database client
 */
const dbClient = DBClient.instance;

/**
 * RoleCheck Client
 */
const roleCheck = RoleCheck.instance;

const router = express.Router();

/**
 * Checks authentication state
 */
function checkAuthentication(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        console.log(req.user);
        next();
    } else {
        console.log(req);
        res.send({ success: false, message: 'You are not allowed to see this resource.' });
    }
}

/**
 * Checks if database is connected
 */
router.use((req, res, next) => {
    if (dbManager.ready) {
        next();
    } else {
        // eslint-disable-next-line max-len
        const response = `Could not connect to mongodb database. Please check if it is running. <br> <b>Error Message from DatabaseManager<b>:<br> <p style="color:red">${DatabaseManager.instance?.errorMessage || 'none'}</p>`;
        res.send(response);
    }
});

// Backend home page
router.get('/', (req, res) => {
    res.send('<meta charset="utf-8"><h4>iPad Ausleihsystem Backend</h4><br>Entwickelt im Auftrag der Pädagogischen Hochschule Schwäbisch Gmünd<br><br>Version 0.1');
});

/**
 * Routes requiring authentication
 */

/**
 * System Information
 */

// serves statistics
router.post('/stats', checkAuthentication, (req, res) => {
    res.send({});
});

// serves statistics
router.get('/systemlogs', checkAuthentication, (req, res) => {
    res.send({});
});

/**
  * User Routes
  */
// User Login
router.post('/login', passport.authenticate('local'), (req, res) => {
    res.send({ success: true });
});

// User Authentication Checkout
router.post('/checkAuth', checkAuthentication, (req, res) => {
    res.send({ success: true });
});

// User Logout
router.post('/logout', checkAuthentication, (req, res) => {
    req.logout();
    res.send({ success: true });
});

/**
 * Item Routes
 */

// Create a device item in inventory
router.post('/createItem', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
        const itemtoCreate: Item = req.body as Item;
        const itemCreated: Item = await dbClient.createItem(itemtoCreate);
        if (itemCreated) {
            res.send({ success: true, item: itemCreated });
        } else {
            res.send({ success: false, message: 'Item creation failed' });
        }
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

// Get all items
router.post('/getInventory', checkAuthentication, async (req, res) => {
    const items = await dbClient.getInventoryList();
    res.send(items);
});

// Get all items which are available
router.post('/getAvailableItems', checkAuthentication, async (req, res) => {
    const items = await dbClient.getAvailableItems();
    res.send(items);
});

// Book an item
router.post('/reserveItems', checkAuthentication, async (req, res) => {
    const reservation: Reservation = (req.body.reservation as Reservation);
    const items: Item[] = (req.body.items as Item[]);
    const { user } = req;
    const success = await dbClient.reserveItemsWithReservation(reservation, items, user);
    if (success) {
        res.send({ success: true, message: 'Items reserved' });
    } else {
        res.send({ success: false, message: 'A reservation in the given time range does already eexist.' });
    }
});

/**
 * Create user
 */
// Create a device item in inventory
router.post('/createUser', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
        const userToCreate: User = req.body as User;
        const userCreated = await dbClient.createUser(userToCreate);
        if (userCreated) {
            res.send({ success: true, item: userCreated });
        } else {
            res.send({ success: false, message: 'Item creation failed' });
        }
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

module.exports = router;
