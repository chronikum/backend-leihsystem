// eslint-disable-next-line import/extensions
import passport from 'passport';
import { UserRoles } from '../enums/UserRoles';
import { Item } from '../models/Item';
import ReservationModel from '../models/mongodb-models/ReservationModel';
import UserModel from '../models/mongodb-models/UserModel';
import { PublicUser } from '../models/PublicUser';
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
        next();
    } else {
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

/**
 * User Login
 *
 * Also sets last login time
 */
router.post('/login', passport.authenticate('local'), (req, res) => {
    // user which logged in
    const { user } = req;
    dbClient.newLogin(user);
    user.password = '';
    res.send({ success: true, user });
});

/**
 * User Authentication Checkout
 */
router.post('/checkAuth', checkAuthentication, (req, res) => {
    const { user } = req;
    res.send({ success: true, user });
});

/**
 * Gets all users
 *
 */
router.post('/getAllUsers', checkAuthentication, async (req, res) => {
    const users = await dbClient.getAllUsers() as User[];
    // REMOVE SENSITIVE INFORMATION
    const unsensitiveUser = users.map((user) => {
        user.password = '';
        return user;
    });
    res.send(unsensitiveUser);
});

/**
 * User authentication log out
 */
router.post('/logout', checkAuthentication, (req, res) => {
    req.logout();
    res.send({ success: true });
});

/**
 * Item Routes
 */

/**
 * Create an item in the device inventory
 */
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

/**
 * Get available ownerships
 *
 * @TODO make dynamic
 */
router.post('/availableOwnerships', checkAuthentication, async (req, res) => {
    res.send(['USER', 'ADMIN', 'UNKNOWN']);
});

/**
 * Get all inventory items
 *
 */
router.post('/getInventory', checkAuthentication, async (req, res) => {
    const items = await dbClient.getInventoryList();
    res.send(items);
});

/**
 * Delete items (admin only currently!)
 *
 * @param items
 */
router.post('/deleteItems', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    console.log('Deletion requested');
    if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
        const itemIdsToDelete: Item[] = req.body.items as Item[];
        const deleted = await dbClient.deleteItems(itemIdsToDelete);
        console.log(`DELETED: ${deleted}`);
        res.send({ success: true });
    } else {
        res.send({ success: false, message: 'You are not allowed to delete those items.' });
    }
});

/**
 * Get all items which are available
 */
router.post('/getAvailableItems', checkAuthentication, async (req, res) => {
    const items = await dbClient.getInventoryList();
    const availableItems = await dbClient.updateAvailabilityOfItems(items || []);
    res.send(availableItems);
});

/**
 *  Get all items which are available from the items parameter
 * param: items[]
 * This can be handled client side, too – but server has more detailed information
 */
router.post('/getAvailableItemsForItems', checkAuthentication, async (req, res) => {
    const items: Item[] = req.body?.items as Item[] || [];
    const availableItems = await dbClient.updateAvailabilityOfItems(items || []);
    res.send(availableItems);
});

/**
 * Reserve several items
 */
router.post('/reserveItems', checkAuthentication, async (req, res) => {
    const reservation: Reservation = (req.body.reservation as Reservation);
    const items: Item[] = (req.body.items as Item[]);
    const { user } = req;
    const success = await dbClient.reserveItemsWithReservation(reservation, items, user);
    console.log(success);
    if (success) {
        res.send({ success: true, message: 'Items reserved' });
    } else {
        res.send({ success: false, message: 'A reservation in the given time range does already eexist.' });
    }
});

/**
 * Get item by unique generated code
 */
router.post('/getItemByUnique', checkAuthentication, async (req, res) => {
    const { uniqueGeneratedString } = req.body;
    const item = await dbClient.getItemByUnique(uniqueGeneratedString);
    console.log(`ITEM: ${item}`);
    if (item) {
        res.send({ success: true, items: [item] });
    } else {
        res.send({ success: false, message: 'A reservation in the given time range does already eexist.' });
    }
});

/**
 * Get all reservations on the system
 */
router.post('/allReservations', checkAuthentication, async (req, res) => {
    const reservations = await ReservationModel.find() as unknown as Reservation[];
    res.send(reservations);
});

/**
 * Get user Count of the system
 */
router.post('/getUserCount', checkAuthentication, async (req, res) => {
    const userCount = await UserModel.find() as unknown as User[] || [];
    res.send({
        success: true,
        userCount: userCount.length,
    });
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

/**
 * Delete users provided
 *
 * - Attention: Will delete users, one-way operation
 */
router.post('/deleteUsers', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
        const usersToDelete: User[] = req.body as User[];
        const deletionSuccess = await dbClient.deleteUsers(usersToDelete);

        if (deletionSuccess) {
            res.send({ success: true, message: 'Deletion successful' });
        } else {
            res.send({ success: false, message: 'Item deleten failed' });
        }
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

/**
 * Changes password for a user
 *
 * - needs admin privilege
 */
router.post('/changePasswordForUser', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
        const userToModify: User = req.body.user as User;
        const newPassword: string = req.body.newPassword as string;

        const passwordChangeSuccess = await dbClient.changePasswordForUser(userToModify, newPassword);
        if (passwordChangeSuccess) {
            res.send({ success: true, item: 'Changes password successfully!' });
        } else {
            res.send({ success: false, message: 'Could not change users password' });
        }
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

/**
 * Get user information
 *
 * @TODO SENSITIVE DATA - MASK!
 */
router.post('/getUserProfile', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    res.send(user);
});

module.exports = router;
