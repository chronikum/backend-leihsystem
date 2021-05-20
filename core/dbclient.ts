import { concat, Observable } from 'rxjs';
import { PrimaryExpression } from 'typescript';
import * as dayjs from 'dayjs';
import { UserRoles } from '../enums/UserRoles';
import { Item } from '../models/Item';
import ItemModel from '../models/mongodb-models/ItemModel';
import ReservationModel from '../models/mongodb-models/ReservationModel';
import SystemLogModel from '../models/mongodb-models/SystemLogModel';
import UserModel from '../models/mongodb-models/UserModel';
import { Reservation } from '../models/Reservation';
import { User } from '../models/User';
import RoleCheck from './RoleCheck';
import RequestModel from '../models/mongodb-models/RequestModel';
import { Request } from '../models/Request';
import GroupModel from '../models/mongodb-models/GroupModel';
import { Group } from '../models/Group';
import { DeviceModel } from '../models/DeviceModel';
import DeviceModelModel from '../models/mongodb-models/DeviceModelModel';
import { SystemLog } from '../models/SystemLog';
import UserManager from './database/UserManager';
import ItemManager from './database/ItemManager';
import ReservationManager from './database/ReservationManager';
import AvailabilityManager from './database/AvailabilityManager';

const crypto = require('crypto');

/**
 * Describes dbclient
 */
export default class DBClient {
    /**
     * Managers
     */
    userManager = UserManager.instance;

    itemManager = ItemManager.instance;

    reservationManager = ReservationManager.instance;

    availabilityManager = AvailabilityManager.instance;

    // Shared instance
    static instance = DBClient.getInstance();

    public static getInstance(): DBClient {
        if (!DBClient.instance) {
            DBClient.instance = new DBClient();
        }

        return DBClient.instance;
    }

    /**
     * The Endpoint the api is running on
     */
    endpoint: string = '';

    /**
     * Checks if this start is the first system start
     * @returns Promise<boolean>
     */
    async isFirstStart(): Promise<boolean> {
        const setupMessage = await SystemLogModel.findOne({ message: 'SETUP COMPLETED' });
        return Promise.resolve(!setupMessage);
    }

    /**
     * User Handling
     */

    /**
     * Creates a new user in the database
     * @param User to create
     * @param isLDAP if provided, no password is required
     * @TODO possible attack vector: a ldap user could be used to login to the admin account if username is the same.
     * This can be resolved by findOne({isLDAP: true}) but has to be handled correctly at failure.
     */
    async createUser(user: User, isLDAP?: boolean): Promise<boolean> {
        return this.userManager.createUser(user, isLDAP);
    }

    /**
     * Delete users provided
     *
     * @param User[]
     */
    async deleteUsers(users: User[]): Promise<boolean> {
        return this.userManager.deleteUsers(users);
    }

    /**
     *  Updates a user
     *
     * @param user to be updated
     *
     * @returns true, if successful
     */
    async updateUser(user: User): Promise<User> {
        return this.userManager.updateUser(user);
    }

    /**
     *  Updates a user, but only certain values
     *
     * TODO: Check that an email is not used yet
     * @param user to be updated
     *
     * @returns true, if successful
     */
    async updateUserInformation(user: User): Promise<User> {
        return this.userManager.updateUserInformation(user);
    }

    /**
     * Change a users password
     *
     * @param user which passwords should be changed
     * @param newPassword to set
     *
     * @returns true, if successful
     */
    changePasswordForUser(user: User, newPassword: string): Promise<boolean> {
        return this.userManager.changePasswordForUser(user, newPassword);
    }

    /**
     * Get user with the id
     *
     * @param id user id
     * @returns Promise<User> with id
     */
    async getUserForId(userId: string): Promise<User> {
        return this.userManager.getUserForId(userId);
    }

    /**
     * Get user for the username
     *
     * @param id user id
     * @returns Promise<User> with id
     */
    async getUserforUsername(username: string): Promise<User> {
        return this.userManager.getUserforUsername(username);
    }

    /**
     * Get user with the email  provided
     *
     * @param email for user
     * @returns Promise<User> with email
     */
    async getUserForEmail(email: string): Promise<User> {
        return this.userManager.getUserForEmail(email);
    }

    /**
     * Item Handlers
     */

    /**
     * Get inventory
     * @returns Item[] Items available
     */
    async getInventoryList(): Promise<Item[]> {
        return this.itemManager.getInventoryList();
    }

    /**
     * Get item by id
     *
     * @param number id
     */
    async getItemById(id: number): Promise<Item> {
        return this.itemManager.getItemById(id);
    }

    /**
     * Get items by ids
     *
     * @param number[] ids
     */
    async getItemsByIds(ids: number[]): Promise<Item[]> {
        return this.itemManager.getItemsByIds(ids);
    }

    /**
     * Get item by unique generated string
     *
     * @param number generatedUniqueIdentifier
     */
    async getItemByUnique(unique: string): Promise<Item> {
        return this.itemManager.getItemByUnique(unique);
    }

    /**
     * Create item with given values
     *
     * @param item
     *
     * @returns Created Item
     */
    async createItem(item: Item): Promise<Item> {
        return this.itemManager.createItem(item);
    }

    /**
     * Update an item with new properties
     *
     * @param item item which should be updated
     * @returns updatedItem
     */
    async updateItem(item: Item): Promise<Item> {
        return this.itemManager.updateItem(item);
    }

    /**
     * Delete items (if permission exists)
     *
     * @TODO Currently only admins can modify items data
     */
    async deleteItems(items: Item[]): Promise<boolean> {
        return this.itemManager.deleteItems(items);
    }

    /**
     * Check availability of items
     *
     * @TODO MAYBE USE MONGOOSE RANGE SELECTOR INSTEAD!
     */
    async updateAvailabilityOfItems(items: Item[]): Promise<Item[]> {
        return this.itemManager.updateAvailabilityOfItems(items);
    }

    /**
     * Reserve items with a reservation
     */
    // eslint-disable-next-line max-len
    async reserveItemsWithReservation(reservation: Reservation, items: Item[], user: User): Promise<any> {
        return this.availabilityManager.reserveItemsWithReservation(reservation, items, user);
    }

    /**
     * Check if a reservation is appliable
     * - Checks if the items which the users want and the which the can access are the same
     * - Checks if the reservation collides with another reservation which has been applied
     */
    // eslint-disable-next-line max-len
    async canReservationBeApplied(reservation: Reservation, items: Item[], user: User): Promise<boolean> {
        return this.availabilityManager.canReservationBeApplied(reservation, items, user);
    }

    /**
     * Checks if a item should be available right now (a reservation is currently active within the selected item ids)
     *
     * Also sets the current reservationId if necessary
     *
     *
     */
    async itemsAvailableinCollection(items: Item[]): Promise<Item[]> {
        return this.availabilityManager.itemsAvailableinCollection(items);
    }

    /**
     * Returns items which are available during the given timespan
     */
    async itemsAvailableinCollectionDuringTimespan(items: Item[], startDate: number, endDate: number): Promise<Item[]> {
        return this.availabilityManager.itemsAvailableinCollectionDuringTimespan(items, startDate, endDate);
    }

    /**
     * Returns all items which are available in the given time frame
     *
     * - gets all reservations overlapping with the new one
     * - gets the items in those reservations
     * - checks which items won't be available
     */
    async itemsAvailableInTimespan(startDate: number, endDate: number): Promise<Item[]> {
        return this.availabilityManager.itemsAvailableInTimespan(startDate, endDate);
    }

    /**
     * Reservation Handlers
     */

    /**
     * Finish Reservation
     *
     * @param request provided by user
     * @returns updated Request
     */
    async finishReservation(reservation: Reservation): Promise<Reservation> {
        return this.reservationManager.finishReservation(reservation);
    }

    /**
     * Returns all the reservations an item holds
     *
     * @param items
     *
     * @returns Reservations
     */
    async reservationsInItemCollection(items: Item[]): Promise<Reservation[]> {
        return this.reservationManager.reservationsInItemCollection(items);
    }

    /**
     * Update the items with the applied reservation
     * - Updates the items in the database
     */
    applyReservationToItems(items: Item[], reservation: Reservation) {
        return this.reservationManager.applyReservationToItems(items, reservation);
    }

    /**
     * Returns all the reservations available and relevant
     *
     * @param items
     *
     * @returns Reservations
     */
    async getReservations(): Promise<Reservation[]> {
        return this.reservationManager.getReservations();
    }

    /**
     * get details about an existing reservation
     * @param reservationId id of the reservation
     */
    async getReservationById(reservationId: number): Promise<Reservation> {
        return this.reservationManager.getReservationById(reservationId);
    }

    /**
     * Create a new request
     * @param request to create
     *
     * @returns created request or failure
     */
    async createNewRequest(request: Request): Promise<Request> {
        const requestCount = await RequestModel.countDocuments({});
        const highestId: number = requestCount === 0 ? 0 : ((((await RequestModel.find()
            .sort({ requestId: -1 })
            .limit(1)) as unknown as Request[])[0].requestId || 0) as number);

        const creationDate = Date.now();
        // Create new RequestModel from mongoose Schema
        const newRequest = new RequestModel({
            requestId: (highestId + 1),
            userCreated: request.userCreated, // this user could be assigned to a request operation
            startDate: request.startDate, // start date of the reservation reqeust
            plannedEndDate: request.plannedEndDate, // end date of the reservation request
            note: request.note, // notes provided by the user making the request
            subRequest: request.subRequest, // Submitted subrequests - can be undefined
            deviceCount: request.deviceCount, // Device count if request is simple request
            created: creationDate,
            modified: 0, // TODO: Implement in request update
            priority: 0,
            requestAccepted: false,
        });
        // Save model
        await newRequest.save().catch((err) => {
            console.log(`Catched error: ${err}`);
        });
        // Verify model was saved
        const requestCreated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        // Return the Request
        return Promise.resolve(requestCreated);
    }

    /**
     * Update request
     *
     * @param request provided by user
     * @returns updated Request
     */
    async updateRequest(request: Request) {
        RequestModel.updateOne({ requestId: request.requestId }, { request }).exec();
        const requestUpdated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        // Return the updated Request
        return Promise.resolve(requestUpdated);
    }

    /**
     * Cancels request
     *
     * @param request provided by user
     * @returns updated Request
     */
    async cancelRequest(request: Request) {
        await RequestModel.findOneAndDelete({ requestId: request.requestId }).exec();
    }

    /**
     * Will accept a request and set a property which will block it from be displayed under allRequests endpoint
     *
     * @param request provided by the user
     */
    async acceptRequest(request: Request) {
        const requestUpdateCompletion = await RequestModel.updateOne({ requestId: request.requestId }, { requestAccepted: true }).exec();
        console.log(requestUpdateCompletion);
        const requestUpdated = await RequestModel.findOne({ requestId: request.requestId }) as unknown as Request;
        console.log(requestUpdated);
        return Promise.resolve(requestUpdated);
    }

    /**
     * Gets all pending requests
     */
    async getAllRequests(): Promise<Request[]> {
        const requests = await RequestModel.find({ requestAccepted: false }) as unknown as Request[];
        return Promise.resolve(requests);
    }

    /**
     * Gets all users in an array
     */
    async getAllUsers(): Promise<User[]> {
        const users = await UserModel.find() as unknown as User[];
        return Promise.resolve(users);
    }

    /**
     * Group Management
     */

    /**
     * Create group
     */
    async createGroup(group: Group): Promise<Group> {
        const groupCount = await GroupModel.countDocuments({});
        console.log(groupCount);
        const highestId: number = groupCount === 0 ? 0 : ((((await GroupModel.find()
            .sort({ groupId: -1 })
            .limit(1)) as unknown as Group[])[0].groupId || 0) as number);

        const groupToCreate = new GroupModel({
            groupId: (highestId + 1),
            displayName: group.displayName,
            description: group.description,
            role: group.role,
        });

        await groupToCreate.save({});

        return GroupModel.findOne({ groupId: (highestId + 1) }) as unknown as Group;
    }

    /**
     * Get all groups
     *
     * @returns Group[]
     */
    async getAllGroups(): Promise<Group[]> {
        return GroupModel.find() as unknown as Group[];
    }

    /**
     * Get group for group id
     *
     * @returns Group
     */
    async getGroup(id: number): Promise<Group> {
        return GroupModel.findOne({ groupId: id }) as unknown as Group;
    }

    /**
     * Get all roles for user
     * @param user
     *
     * @returns all the roles the user has
     */
    async getGroupRolesForUser(user: User): Promise<UserRoles[]> {
        const userSearched = await this.getUserForId(user.userId);
        const userGroups: Group[] = await this.getGroups(userSearched.groupId);
        let groupsMapped: UserRoles[] = [];
        concat(userGroups.map((group) => group.role)).subscribe((x) => {
            groupsMapped = x;
        });
        return groupsMapped;
    }

    /**
     * Get groups for group ids
     *
     * @returns Group
     */
    async getGroups(ids: number[]): Promise<Group[]> {
        return GroupModel.find({ groupId: { $in: ids } }) as unknown as Group[];
    }

    /**
     * Update Group
     *
     * @param group
     * @returns updated group
     */
    async updateGroup(group: Group): Promise<Group> {
        GroupModel.updateOne({ groupId: group.groupId }, { group }).exec();

        return GroupModel.findOne({ groupId: group.groupId }) as unknown as Group;
    }

    /**
     * Deletes the given group
     *
     * @param group Delete the group given
     */
    async deleteGroup(group: Group) {
        GroupModel.deleteOne({ groupId: group.groupId }).exec();
    }

    /**
     * Get all group members
     *
     * @param groupId for group
     * @returns all users for the group
     */
    async getGroupMembers(group: Group): Promise<User[]> {
        return UserModel.find({ groupId: { $in: [group.groupId] } }) as unknown as User[];
    }

    /**
     * Get suggested users
     *
     * @param string to look for
     * @returns all users for the group
     */
    async getSuggestedUsers(query: string): Promise<User[]> {
        const users = await UserModel.find({
            $or: [
                {
                    firstname: { $regex: query, $options: 'i' },
                },
                {
                    surname: { $regex: query, $options: 'i' },
                },
                {
                    username: { $regex: query, $options: 'i' },
                },
            ],
        }).limit(7) as unknown as User[];
        return users;
    }

    /**
     * Adds a group to a user
     * @param Group to be added
     * @param User to be added
     *
     * @returns Group[]
     */
    async addUserToGroup(user: User, group: Group): Promise<User> {
        // Add group id to user
        UserModel.updateOne({ userId: user.userId }, { $push: { groupId: group.groupId } }).exec();
        return UserModel.findOne({ userId: user.userId }) as unknown as User;
    }

    /**
     * A users logs in - sets last login time
     */
    newLogin(user: User) {
        const dateNow = Date.now();
        console.log(user);
        UserModel.updateOne({ userId: user.userId }, { lastLogin: dateNow }).exec();
    }

    /**
     * Create new device model
     * @param Model device model
     */
    async createNewModel(model: DeviceModel): Promise<DeviceModel> {
        const modelCount = await DeviceModelModel.count() || 0;
        const highestId: number = modelCount === 0 ? 0 : ((((await DeviceModelModel.find()
            .sort({ deviceModelId: -1 })
            .limit(1)) as unknown as DeviceModel[])[0].deviceModelId || 0) as number);
        const checkIfExisting = await this.getDeviceModelByDeviceId(model);
        if (!checkIfExisting) {
            model.deviceModelId = (highestId + 1);
            const deviceModel = new DeviceModelModel(model);
            deviceModel.save();
            return Promise.resolve(model);
        }
        console.log('Device model already exists.');
        return Promise.resolve(null);
    }

    /**
     * Update existing model with new values
     * @param Model device model
     */
    async updateModel(model: DeviceModel) {
        const checkIfModelExists = await this.getDeviceModelByDeviceId(model);
        if (checkIfModelExists) {
            if (model.deviceModelId) {
                await DeviceModelModel.updateOne({ deviceModelId: model.deviceModelId }, model).exec();
                console.log('Model updated.');
                const check2 = await this.getDeviceModelByDeviceId(model);
                console.log(check2.displayName);
            }
        } else {
            console.log('Could not update model - model does not exist.');
        }
    }

    /**
     * Get all available device models
     */
    async getAllDeviceModels(): Promise<DeviceModel[]> {
        const deviceModels = await DeviceModelModel.find({}) as unknown as DeviceModel[] || [];
        return Promise.resolve(deviceModels);
    }

    /**
     * Gets device model by deviceModelId
     * @param model model to get
     */
    async getDeviceModelByDeviceId(model: DeviceModel): Promise<DeviceModel> {
        const detailedModel: DeviceModel = await DeviceModelModel.findOne({ deviceModelId: model.deviceModelId }) as unknown as DeviceModel;
        if (detailedModel) {
            return Promise.resolve(detailedModel);
        }
        return Promise.resolve(null);
    }

    /**
     * Get automatic suggestion for reservation request
     */
    async autoSuggestionForRequest(request: Request): Promise<Reservation[]> {
        // const hasSubRequests = request?.subRequest[0];
        // The item ids which are available
        const itemIds: Item[] = await this.itemsAvailableInTimespan((request.startDate / 10000), (request.plannedEndDate / 10000));
        // console.log('!AVAILABLE');
        console.log(itemIds);
        // console.log('AVAILABLE');
        return null as any;
    }

    /**
     * Log system logging message which can be seen in admin interface
     */
    systemLog(message: string) {
        const timestamp = Date.now();
        const systemlog = new SystemLogModel({
            message,
            timestamp,
        });
        systemlog.save();
    }

    /**
     * Get all system logs
     */
    async getAllLogs(): Promise<SystemLog[]> {
        const systemLogs = SystemLogModel.find().sort({ timestamp: -1 }) as unknown as SystemLog[];
        return Promise.resolve(systemLogs);
    }
}
