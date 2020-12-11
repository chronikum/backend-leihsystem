import { Observable } from 'rxjs';
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
            ownershipIdentifier: item.ownershipIdentifier || undefined,
            creationDate: item.creationDate || undefined,
            modificationDate: item.modificationDate || undefined,
            description: item.description || undefined,
            model: item.model || undefined,
            notes: item.notes || undefined,
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

        // An array with all currently inactive reservations
        const inactiveReservation = [];

        // Returns an array with all valid reservations
        const updatedReservations = allReservations.map((reservation) => {
            if (reservation.startDate && reservation.plannedEndDate) {
                const startDatePlanned = dayjs.unix(reservation.startDate);
                const endDatePlanned = dayjs.unix(reservation.plannedEndDate);
                const newReservationStartDate = dayjs.unix(Date.now());
                const newReservationEndDate = dayjs.unix(Date.now());

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
        const itemsAvailable = existingItems.filter((item) => item.available);

        const totalActiveReservations = updatedReservations.filter((reservation: Reservation) => reservation.active);

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
     * Gets all users in an array
     */
    async getAllUsers(): Promise<User[]> {
        const users = await UserModel.find() as unknown as User[];
        return Promise.resolve(users);
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
