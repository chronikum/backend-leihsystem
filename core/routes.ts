// eslint-disable-next-line import/extensions
import passport from 'passport';
import { setOriginalNode } from 'typescript';
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
import { Request } from '../models/Request';
import { Group } from '../models/Group';
import { DeviceModel } from '../models/DeviceModel';

/**
 * GENERAL TODO:
 */

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
 * Will check if user is explicit declared as admin user
 */
function checkAdminPrivilege(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        const { user } = req;
        if (roleCheck.checkRole([UserRoles.ADMIN], user)) {
            next();
        }
    } else {
        res.send({ success: false, message: 'You are not allowed to see this resource.' });
    }
}

/**
 * Checks if database is connected
 */
router.use((req, res, next) => {
    if (dbManager.ready && !dbManager.error) {
        next();
    } else {
        if (dbManager.error) {
            res.send({ success: false, message: 'Failed to connect to database.', errorCode: -1 });
        }
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
router.post('/stats', checkAuthentication, checkAdminPrivilege, (req, res) => {
    res.send({});
});

// Checks if backend is currently available
router.post('/available', checkAuthentication, (req, res) => {
    res.send({ success: true });
});

// serves statistics
router.get('/systemlogs', checkAuthentication, checkAdminPrivilege, (req, res) => {
    res.send({});
});

/**
 * Remove password hash from user model
 */
function removePasswordHashFromUser(user: User): User {
    const { password, ...updatedUser } = user;
    return updatedUser;
}

/**
  * User Routes
  */
/**
 * User Login
 *
 * Also sets last login time
 */
router.post('/login', passport.authenticate('local'), async (req, res) => {
    // eslint-disable-next-line prefer-const
    let { user } = req;
    dbClient.newLogin(user);
    user.password = '';
    res.send({ success: true, user });
});

/**
 * User Authentication Checkout
 */
router.post('/checkAuth', checkAuthentication, async (req, res) => {
    // eslint-disable-next-line prefer-const
    let { user } = req;
    user.password = '';
    user.groupRoles = res.send({ success: true, user });
});

/**
 * Gets all users
 *
 */
router.post('/getAllUsers', checkAuthentication, checkAdminPrivilege, async (req, res) => {
    const users = await dbClient.getAllUsers() as User[];
    // REMOVE SENSITIVE INFORMATION
    const unsensitiveUser = users.map((user) => {
        user.password = '';
        return user;
    });
    res.send(unsensitiveUser);
});

/**
 * Get group roles of the current user
 */
router.post('/currentUserRoles', checkAuthentication, async (req, res) => {
    const { user } = req;
    const userRoles = await dbClient.getGroupRolesForUser(user);
    if (userRoles) {
        res.send({ userRoles });
    } else {
        res.send({ success: false });
    }
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
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE], user)) {
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
 * Update an item with new properties
 */
router.post('/updateItem', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE], user)) {
        const itemToUpdate: Item = req.body as Item;
        const updatedItem: Item = await dbClient.updateItem(itemToUpdate);
        if (updatedItem) {
            res.send({ success: true, item: updatedItem });
        } else {
            res.send({ success: false, message: 'Item update failed' });
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
 *  Get items for itemIds
 */
router.post('/getItemsforIds', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const { itemIds } = req.body; // the item ids requested as numbers
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE, UserRoles.MANAGE_MODELS], user)) {
        const items = await dbClient.getItemsByIds(itemIds);
        res.send({ success: true, items });
    } else {
        res.send({ success: false });
    }
});

/**
 * Delete items (admin only currently!)
 *
 * @param items
 */
router.post('/deleteItems', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    console.log('Deletion requested');
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE], user)) {
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
 *  Get a reservation which fits the reservation request
 */
router.post('/suggestReservationForRequest', checkAuthentication, async (req, res) => {
    const { request } = req.body;
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE], user)) {
        const reservationSuggestion = await dbClient.autoSuggestionForRequest(request);
        // const availableItems = await dbClient.updateAvailabilityOfItems(reservationSuggestion || []);
        res.send({ success: true, reservation: reservationSuggestion });
    } else {
        res.send({ success: false });
    }
});

/**
 *  Get all items which are available in the timespan
 */
router.post('/getItemsForTimespan', checkAuthentication, async (req, res) => {
    const { request } = req.body;
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE], user)) {
        const reservationSuggestion = await dbClient.itemsAvailableInTimespan(request.startDate, request.plannedEndDate);
        const availableItems = await dbClient.updateAvailabilityOfItems(reservationSuggestion || []);
        res.send({ success: true, items: availableItems });
    } else {
        res.send({ success: false });
    }
});

/**
 * Reserve several items
 */
router.post('/reserveItems', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE, UserRoles.MANAGE_REQUESTS], user)) {
        const reservation: Reservation = (req.body.reservation as Reservation);
        const items: Item[] = (req.body.items as Item[]);
        console.log('Reserving items');
        const success = await dbClient.reserveItemsWithReservation(reservation, items, user);
        console.log('Reservation status:');
        console.log(success);
        if (success) {
            res.send({ success: true, message: 'Items reserved' });
        } else {
            res.send({ success: false, message: 'A reservation in the given time range does already eexist.' });
        }
    }
});

/**
 * Reserve several items
 */
router.post('/finishReservation', checkAuthentication, async (req, res) => {
    const { user } = req;
    const { reservation } = req.body;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_DEVICE, UserRoles.MANAGE_REQUESTS], user)) {
        if (reservation) {
            const updatedReservation = await dbClient.finishReservation(reservation);
            res.send({ success: true, reservation: updatedReservation });
        } else {
            res.send({ success: false });
        }
    } else {
        res.send({ success: false });
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
        res.send({ success: false, message: 'Not found.' });
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
 * Requests Management
 */

/**
  * Create a new request
  */
router.post('/createRequest', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const request: Request = (req.body.request as Request); // User request
    // Create a new request
    if (request) {
        request.userCreated = user.userId;
        request.requestingUser = user.userId;
        const requestCreated: Request = await dbClient.createNewRequest(request);
        res.send({ success: true, request: requestCreated });
    } else {
        res.send({ success: false });
    }
});

/**
  * Update an existing request
  */
router.post('/updateRequest', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const request: Request = (req.body.request as Request); // User request
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_REQUESTS], user)) {
        const requestUpdated: Request = await dbClient.updateRequest(request);
        res.send({ success: true, request: requestUpdated });
    } else {
        res.send({ success: false });
    }
    res.send(user);
});

/**
 * Cancels a request
 *
 * - destructive action
 */
router.post('/cancelRequest', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const request: Request = (req.body.request as Request); // User request
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_REQUESTS], user)) {
        const requestUpdated: Request = await dbClient.cancelRequest(request);
        res.send({ success: true });
    } else {
        res.send({ success: false });
    }
    res.send(user);
});

/**
  * Accept request
  *
  * This will turn a request in a valid reservation
  */
router.post('/acceptRequest', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const request: Request = (req.body.request as Request); // User request
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_REQUESTS], user)) {
        const requestUpdated: Request = await dbClient.acceptRequest(request);
        res.send({ success: true, request: requestUpdated });
    } else {
        res.send({ success: false });
    }
});

/**
  * Get all requests existing
  * TODO: Implement in database client
  */
router.post('/getAllRequests', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_REQUESTS], user)) {
        const requests: Request[] = await dbClient.getAllRequests();
        res.send({ success: true, requests });
    } else {
        res.send({ success: false, message: 'No permission' });
    }
});

/**
 * Group Management
 */
/**
  * Update an existing request
  */
router.post('/createUserGroup', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const group: Group = (req.body.group as Group); // User request
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
        res.send({ success: true, group });
    } else {
        res.send({ success: false });
    }
    res.send(user);
});

/**
  * Get all groups
  */
router.post('/getAllGroups', checkAuthentication, async (req, res) => {
    const groups = await dbClient.getAllGroups();
    if (groups) {
        res.send({ success: true, groups });
    } else {
        res.send({ success: false, message: 'Error' });
    }
});

/**
 * Get all members for group
 */
router.post('/getGroupMembers', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
        const group = req.body.group as Group;
        console.log('GET GROUP');
        console.log(group);
        const users = await dbClient.getGroupMembers(group);
        res.send({ success: true, users });
    } else {
        res.send({ success: false });
    }
});

/**
 * Create user
 */
// Create a device item in inventory
router.post('/createUser', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
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
 * Updates an user
 */
router.post('/updateUser', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
        const userToUpdate: User = req.body.user as User;
        const updatedUser = await dbClient.updateUser(userToUpdate);
        console.log('D');
        console.log(updatedUser);
        if (updatedUser) {
            res.send({ success: true, user: updatedUser });
        } else {
            res.send({ success: false, message: 'User update failed' });
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
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.CAN_DELETE_USERS], user)) {
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
 * TODO: Users should be able to change their own password
 */
router.post('/changePasswordForUser', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
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
 * Get user profile
 */
router.post('/getUserProfile', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS, UserRoles.MANAGE_REQUESTS], user)) {
        const { userId } = req.body;
        const users = [];
        res.send({ success: true, users });
    }
});

/**
 * Get user information for userId
 * - userId
 * - user information
 *
 */
router.post('/getUserInformationForId', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS, UserRoles.MANAGE_REQUESTS], user)) {
        const { userId } = req.body;
        if (userId) {
            // eslint-disable-next-line prefer-const
            let requestingUser = await dbClient.getUserForId(userId);
            requestingUser.password = '';
            res.send({ success: true, user: requestingUser });
        } else {
            console.log('Could not read body');
            res.send({ success: false });
        }
    } else {
        res.send({ success: false, message: 'No permission. This incident was logged.' });
    }
});

/**
 * Get user name suggestions (User[])
 *
 * @TODO SENSITIVE DATA - MASK!
 */
router.post('/suggestUserNames', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS, UserRoles.MANAGE_GROUPS], user)) {
        const { query } = req.body;
        const users = await dbClient.getSuggestedUsers(query);
        res.send({ success: true, users });
    }
});

/**
 * Get all reservation information
 *
 */
router.post('/getReservations', checkAuthentication, async (req, res) => {
    const { user } = req; // The real user
    const reservations = await dbClient.getReservations();

    res.send(reservations);
});

/**
 * Group
 */

/**
 * Create an new group
 */
router.post('/createGroup', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
        const groupToCreate: Group = req.body as Group;
        const groupCreated = await dbClient.createGroup(groupToCreate);
        res.send({ success: true, group: groupCreated });
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

/**
 * Add user to group
 */
router.post('/addUserToGroup', checkAuthentication, async (req, res) => {
    const realUser = req.user;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], realUser)) {
        const { user } = req.body; // User to add
        const { group } = req.body; // to this group
        if (user && group) {
            const updatedUser = await dbClient.addUserToGroup(user, group); // Updated user
            updatedUser.password = '';
            res.send({ success: true, user: updatedUser });
        } else {
            res.send({ success: false });
        }
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

/**
 * Models (eg. device models)
 */

/**
 * Create a new device model
 */
router.post('/createModel', checkAuthentication, async (req, res) => {
    const { user } = req;
    console.log('Requesting creation');
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_MODELS], user)) {
        const { deviceModel } = req.body; // Model to add
        console.log('MODEL');
        if (deviceModel) {
            dbClient.createNewModel(deviceModel);
            res.send(deviceModel);
        } else {
            res.send({ success: false });
        }
    } else {
        res.send({ success: false });
    }
});

/**
 * Edit existing device model
 */
router.post('/editModel', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_MODELS], user)) {
        const { deviceModel } = req.body; // User to add
        if (deviceModel) {
            dbClient.updateModel(deviceModel);
            res.send({ success: true });
        } else {
            res.send({ success: false });
        }
    } else {
        res.send({ success: false });
    }
});

router.post('/getAllModels', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_MODELS], user)) {
        const models: DeviceModel[] = await dbClient.getAllDeviceModels() || [];
        res.send({ success: true, deviceModels: models });
    } else {
        res.send({ success: false });
    }
});

/**
 * Roles
 */
/**
 * Create an new group
 */
router.post('/rolesAvailable', checkAuthentication, async (req, res) => {
    const { user } = req;
    if (roleCheck.checkRole([UserRoles.ADMIN, UserRoles.MANAGE_USERS], user)) {
        res.send({
            success: true,
            roles: [
                UserRoles.ADMIN,
                UserRoles.USER,
                UserRoles.MANAGE_DEVICE,
                UserRoles.MANAGE_USERS,
                UserRoles.MANAGE_REQUESTS,
                UserRoles.RESET_ANY_PASSWORD,
                UserRoles.MANAGE_GROUPS,
                UserRoles.SUPERADMIN,
                UserRoles.MANAGE_MODELS,
                UserRoles.CAN_DELETE_USERS,
            ],
        });
    } else {
        res.send({ success: false, message: 'You do not have sufficient permission' });
    }
});

module.exports = router;
