import { concat, Observable } from 'rxjs';
import { PrimaryExpression } from 'typescript';
import * as dayjs from 'dayjs';
import { request } from 'express';
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

const crypto = require('crypto');

/**
 * Describes dbclient
 */
export default class DBClient {
    // Shared instance
    static instance = DBClient.getInstance();

    public static getInstance(): DBClient {
        if (!DBClient.instance) {
            DBClient.instance = new DBClient();
        }

        return DBClient.instance;
    }

    /**
     * Creates a new user in the database
     * @param User to create
     */
    async createUser(user: User): Promise<boolean> {
        // How many users do already exist?
        const userCount = await UserModel.countDocuments({});
        const highestUser: number = userCount === 0 ? 0 : ((((await UserModel.find()
            .sort({ userId: -1 })
            .limit(1)) as unknown as User[])[0].userId || 0) as number);

        const hashedPW = crypto.createHmac('sha256', user.password).digest('hex');
        // eslint-disable-next-line no-param-reassign, radix
        user.userId = (parseInt((highestUser as any)) + 1).toString();

        const newUser = new UserModel({
            username: user.username,
            userId: user.userId,
            password: hashedPW,
            email: user.email,
            firstname: user.firstname,
            surname: user.surname,
            role: user.role,
            groupId: user.groupId || -1,
        });

        const existingUser = await UserModel.findOne({ username: user.username });
        if (existingUser) {
            console.log('User does already exist!');
            return false;
        }
        await newUser.save();
        const createdUser = await UserModel.findOne({ userId: user.userId });
        return Promise.resolve(!!createdUser);
    }

    /**
     * Delete users provided
     *
     * @param User[]
     */
    async deleteUsers(users: User[]): Promise<boolean> {
        const userIds = users.map((item) => item.userId);
        return UserModel.deleteMany({ userId: { $in: userIds } }).exec().then((x) => (x.ok === 1));
    }

    /**
     *  Updates a user
     *
     * @param user to be updated
     *
     * @returns true, if successful
     */
    async updateUser(user: User): Promise<User> {
        console.log('Updating...');
        const before = await UserModel.findOne({ userId: user.userId }) as unknown as User;
        const x1 = await UserModel.updateOne({ userId: user.userId }, { $set: user }, { new: true }).exec().then((x) => x.ok === 1);
        console.log('START');
        const after = await UserModel.findOne({ userId: user.userId }) as unknown as User;
        console.log(before);
        console.log(after);
        console.log('END');

        return UserModel.findOne({ userId: user.userId }) as unknown as User;
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
        const hashedPW = crypto.createHmac('sha256', newPassword).digest('hex');
        return UserModel.updateOne({ userId: user.userId }, { password: hashedPW }).exec().then((x) => x.ok === 1);
    }

    /**
     * Get user with the id
     *
     * @param id user id
     * @returns Promise<User> with id
     */
    async getUserForId(userId: string): Promise<User> {
        return UserModel.findOne({ userId }) as unknown as Promise<User>;
    }

    /**
     * Checks if this start is the first system start
     * @returns Promise<boolean>
     */
    async isFirstStart(): Promise<boolean> {
        const setupMessage = await SystemLogModel.findOne({ message: 'SETUP COMPLETED' });
        return Promise.resolve(!setupMessage);
    }

    /**
     * Get inventory
     * @returns Item[] Items available
     */
    async getInventoryList(): Promise<Item[]> {
        const items = ((await ItemModel.find())) as unknown as Item[] || [];

        return Promise.resolve(items);
    }

    /**
     * Get item by id
     *
     * @param number id
     */
    async getItemById(id: number): Promise<Item> {
        const item = ((await ItemModel.findOne({ itemId: id }))) as unknown as Item;

        return item;
    }

    /**
     * Get item by unique generated string
     *
     * @param number generatedUniqueIdentifier
     */
    async getItemByUnique(unique: string): Promise<Item> {
        const item = ((await ItemModel.findOne({ generatedUniqueIdentifier: unique }))) as unknown as Item;
        const updatedAvailability = await this.updateAvailabilityOfItems([item]);
        console.log(updatedAvailability);
        return updatedAvailability[0];
    }

    /**
     * Create item with given values
     *
     * @param item
     *
     * @returns Created Item
     */
    async createItem(item: Item): Promise<Item> {
        const itemCount = await ItemModel.countDocuments({});
        const highestId: number = itemCount === 0 ? 0 : ((((await ItemModel.find()
            .sort({ itemId: -1 })
            .limit(1)) as unknown as Item[])[0].itemId || 0) as number);

        const initialAdminPassword = crypto.randomBytes(4).toString('hex');
        const generatedUniqueIdentifier = `${highestId}${initialAdminPassword}`;

        const itemtoCreate = new ItemModel({
            name: item.name || undefined,
            internalName: item.internalName || undefined,
            serialNumber: item.serialNumber || undefined,
            ownership: item.ownership || undefined,
            caIdentifier: item.caIdentifier || undefined,
            ownershipIdentifier: item.ownershipIdentifier || undefined,
            creationDate: item.creationDate || undefined,
            modificationDate: item.modificationDate || undefined,
            description: item.description || undefined,
            model: item.model || undefined,
            notes: item.notes || undefined,
            managed: item.managed || undefined,
            available: item.available || undefined,
            plannedReservationsIds: item.plannedReservationsIds || undefined,
            itemId: highestId + 1,
            requiredRolesToReserve: item.requiredRolesToReserve || [],
            generatedUniqueIdentifier,
        });

        await itemtoCreate.save({});

        return ItemModel.findOne({ itemId: (highestId + 1) }) as unknown as Item;
    }

    /**
     * Update an item with new properties
     *
     * @param item item which should be updated
     * @returns updatedItem
     */
    async updateItem(item: Item): Promise<Item> {
        const updatedItem = await ItemModel.updateOne({
            itemId: item.itemId,
        }, item, { upsert: false });

        return updatedItem;
    }

    /**
     * Check availability of items
     *
     * @TODO MAYBE USE MONGOOSE RANGE SELECTOR INSTEAD!
     */
    async updateAvailabilityOfItems(items: Item[]): Promise<Item[]> {
        const itemsWithAvailability = await this.itemsAvailableinCollection(items);
        return itemsWithAvailability;
    }

    /**
     * Reserve items with a reservation
     */
    // eslint-disable-next-line max-len
    async reserveItemsWithReservation(reservation: Reservation, items: Item[], user: User): Promise<any> {
        const canBeApplied = await this.canReservationBeApplied(reservation, items, user);
        if (canBeApplied) {
            const reservationCount = await ReservationModel.countDocuments({});
            const reservationId = reservationCount + 1;

            reservation.reservationId = reservationId;

            // Create reservation with user ID
            const reservationtoCreate = new ReservationModel({
                reservationName: reservation.reservationName,
                reservationId,
                description: reservation.description,
                approvalRequired: reservation.approvalRequired,
                approved: reservation.approved || undefined,
                responsible: user.userId,
                itemIds: reservation.itemIds,
                startDate: reservation.startDate,
                plannedEndDate: reservation.plannedEndDate,
                completed: reservation.completed || undefined,
            });

            console.log(`Created reservation id: ${reservationId}`);
            this.applyReservationToItems(items, reservation);

            await reservationtoCreate.save();
            return Promise.resolve({ sucess: true, message: 'Reservation created' });
        }
        return Promise.resolve(null);
    }

    /**
     * Check if a reservation is appliable
     * - Checks if the items which the users want and the which the can access are the same
     * - Checks if the reservation collides with another reservation which has been applied
     */
    // eslint-disable-next-line max-len
    async canReservationBeApplied(reservation: Reservation, items: Item[], user: User): Promise<boolean> {
        const itemIds = items.map((item) => item.itemId);

        // Load items from database
        const results = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];

        // Items which the user can lend
        // Always allows ADMIN role
        // TODO: Make roles dynamic
        const reservationRequestAllowed = results.filter(
            (item) => {
                const userRoleCheck = item.requiredRolesToReserve.includes(user.role);
                const isAdminCheck = user.role === UserRoles.ADMIN;
                return (userRoleCheck || isAdminCheck);
            },
        );

        const affectedReservationIds: Set<number> = new Set<number>();

        // All affected reservation ids
        results.forEach((item) => item.plannedReservationsIds.forEach((id) => affectedReservationIds.add(id)));
        // Load the affected reservations
        const affectedReservations = await ReservationModel.find().where('reservationId').in(Array.from(affectedReservationIds)) as unknown as Reservation[];
        // Check if reservation collides with any collisions
        const validReservationRequest = this.reservationHasNoCollisions(affectedReservations, reservation);

        return Promise.resolve(
            ((results.length === reservationRequestAllowed.length) && validReservationRequest),
        );
    }

    /**
     * Checks if a item should be available right now (a reservation is currently active)
     *
     * Also sets the current reservationId if necessary
     *
     * @TODO MAYBE USE MONGOOSE RANGE SELECTOR INSTEAD!
     *
     * @TODO This can be optimized for sure
     * @TODO Ask if items are surely being scanned before they are being lended
     * @TODO Maybe deprecated in prod
     */
    async itemsAvailableinCollection(items: Item[]): Promise<Item[]> {
        const itemIds = items.map((item) => item.itemId);
        const existingItems = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];

        // Get all reservations
        const allReservations = await this.reservationsInItemCollection(existingItems);
        const allReservationIds = allReservations.map((reservation: Reservation) => reservation.reservationId);

        const newReservationStartDate = dayjs.unix(Date.now());
        const newReservationEndDate = dayjs.unix(Date.now());

        const reservationsAvailable = await ReservationModel.find({
            $or: [
                { // BEFORE RESERVATION
                    $and: [
                        { plannedEndDate: { $lt: newReservationEndDate } },
                        { startDate: { $lt: newReservationStartDate } },
                        { reservationId: { $in: allReservationIds } },
                    ],
                },
                { // AFTER RESERVATION
                    $and: [
                        { plannedEndDate: { $gt: newReservationEndDate } },
                        { startDate: { $gt: newReservationStartDate } },
                        { reservationId: { $in: allReservationIds } },
                    ],
                },
            ],
        });
        console.log('ITEMS QUERIED:');
        console.log(reservationsAvailable);
        console.log('ITEMS QUERIED:');
        // An array with all currently inactive reservations
        const inactiveReservation = [];

        // Returns an array with all valid reservations
        const updatedReservations = allReservations.map((reservation) => {
            if (reservation.startDate && reservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);

                // Dates are both before the time span or after
                // eslint-disable-next-line max-len
                if ((newReservationStartDate.isBefore(startDatePlanned) && newReservationEndDate.isBefore(startDatePlanned)) || ((newReservationStartDate.isAfter(endDatePlanned) && newReservationEndDate.isAfter(endDatePlanned)))) {
                    reservation.active = false;
                    inactiveReservation.push(reservation);
                    return reservation;
                }
                reservation.active = true;
                return reservation;
            }
            return reservation;
        });

        const activeReservations = inactiveReservation.map((reservation) => reservation.reservationId);

        // eslint-disable-next-line no-return-assign
        existingItems.forEach((item) => item.available = ((item.plannedReservationsIds || []).every((id) => activeReservations.includes(id))));
        console.log(existingItems);
        const itemsAvailable = existingItems.filter((item) => item.available);

        const totalActiveReservations = updatedReservations.filter((reservation: Reservation) => reservation.active);
        console.log(totalActiveReservations.length);
        console.log(reservationsAvailable.length);

        return existingItems;
    }

    /**
     * Checks if any reservations collisions occure
     * @param reservationIds
     * @param newReservation
     *
     * @returns true if no collision exists
     */
    reservationHasNoCollisions(currentReservations: Reservation[], newReservation: Reservation): boolean {
        const validDates = currentReservations.filter((reservation) => {
            if (newReservation.startDate && newReservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);
                const newReservationStartDate = dayjs.unix(newReservation.startDate);
                const newReservationEndDate = dayjs.unix(newReservation.plannedEndDate);

                // Dates are both before the time span or after
                // eslint-disable-next-line max-len
                if ((newReservationStartDate.isBefore(startDatePlanned) && newReservationEndDate.isBefore(startDatePlanned)) || ((newReservationStartDate.isAfter(endDatePlanned) && newReservationEndDate.isAfter(endDatePlanned)))) {
                    return true;
                }
                return false;
            }
            return false;
        });
        const valid = (validDates.length === currentReservations.length);
        console.log(`Is valid: ${valid}`);
        return valid;
    }

    /**
     * Delete items (if permission exists)
     *
     * @TODO Currently only admins can modify items data
     */
    async deleteItems(items: Item[]): Promise<boolean> {
        // All the item ids
        const itemIds = items.map((item) => item.itemId);
        const res = await ItemModel.deleteMany({
            itemId: {
                $in: itemIds || [],
            },
        });

        return Promise.resolve(!!res);
    }

    /**
     * Update the items with the applied reservation
     * - Updates the items in the database
     */
    applyReservationToItems(items: Item[], reservation: Reservation) {
        const itemIds = items.map((item) => item.itemId);
        ItemModel.updateMany(
            { itemId: { $in: itemIds } },
            { $push: { plannedReservationsIds: reservation.reservationId } },
            { multi: true },
        ).exec();
    }

    /**
     * get details about an existing reservation
     * @param reservationId id of the reservation
     */
    async getReservationById(reservationId: number): Promise<Reservation> {
        return ReservationModel.find({ reservationId }) as unknown as Promise<Reservation>;
    }

    /**
     * Returns all the reservations an item holds
     *
     * @param items
     *
     * @returns Reservations
     */
    async reservationsInItemCollection(items: Item[]): Promise<Reservation[]> {
        const affectedReservationIds: Set<number> = new Set<number>();

        const itemIds = items.map((item) => item.itemId);
        const results = await ItemModel.find().where('itemId').in(itemIds) as unknown as Item[];
        results.forEach((item) => item.plannedReservationsIds.forEach((id) => affectedReservationIds.add(id)));
        return ReservationModel.find().where('reservationId').in(Array.from(affectedReservationIds)) as unknown as Reservation[];
    }

    /**
     * Returns all the reservations available and relevant
     *
     * @param items
     *
     * @returns Reservations
     */
    async getReservations(): Promise<Reservation[]> {
        const date = Date.now();
        const allReservations: Reservation[] = await ReservationModel.find({}) as unknown as Reservation[];

        return allReservations;
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
            .sort({ itemId: -1 })
            .limit(1)) as unknown as Request[])[0].requestId || 0) as number);

        const creationDate = Date.now();
        // Create new RequestModel from mongoose Schema
        const newRequest = new RequestModel({
            requestId: (highestId + 1), // Unique identifier - increment highestId by one
            itemIds: request.itemIds, // items which were requested
            responsibleUserId: request.responsibleUserId, // the user responsible for the requested reservation
            assignedUserId: request.assignedUserId, // this user could be assigned to a request operation
            startDate: request.startDate, // start date of the reservation reqeust
            plannedEndDate: request.plannedEndDate, // end date of the reservation request
            note: request.note, // notes provided by the user making the request
            created: creationDate,
            modified: creationDate,
            priority: request.priority,
        });
        // Save model
        await newRequest.save();
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
     * Gets all pending requests
     */
    async getAllRequests(): Promise<Request[]> {
        const requests = await RequestModel.find() as unknown as Request[];
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
    async createGroup(group: Group): Promise<Item> {
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

        return GroupModel.findOne({ groupId: (highestId + 1) }) as unknown as Item;
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
    async updateGroup(group: Group): Promise<Item> {
        GroupModel.updateOne({ groupId: group.groupId }, { group }).exec();

        return GroupModel.findOne({ groupId: group.groupId }) as unknown as Item;
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
        const querySplitted = query.split(' ');
        const users = await UserModel.find({
            $or: [
                {
                    firstname: { $in: querySplitted },
                },
                {
                    surname: { $in: querySplitted },
                },
                {
                    username: { $in: querySplitted },
                },
            ],
        }) as unknown as User[];
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
     */
    async createNewModel(model: DeviceModel) {
        const modelCount = DeviceModelModel.count();
        const highestId: number = modelCount === 0 ? 0 : ((((await DeviceModelModel.find()
            .sort({ deviceModelId: -1 })
            .limit(1)) as unknown as DeviceModel[])[0].deviceModelId || 0) as number);
        model.deviceModelId = (highestId + 1);
        const deviceModel = new DeviceModelModel(model);
        console.log(deviceModel);
    }

    /**
     * Update existing model with new values
     */
    updateModel(model: DeviceModel) {
        if (model.deviceModelId) {
            DeviceModelModel.updateOne({ deviceModelId: model.deviceModelId }, { model }).exec();
        }
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
}
