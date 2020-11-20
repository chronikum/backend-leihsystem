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
        // eslint-disable-next-line no-param-reassign
        user.userId = (highestUser + 1).toString();

        const newUser = new UserModel({
            username: user.username,
            userId: user.userId,
            password: hashedPW,
            email: user.email,
            firstName: user.firstname,
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
     * Create item with given values
     */
    async createItem(item: Item): Promise<Item> {
        const itemCount = await ItemModel.countDocuments({});
        const highestId: number = itemCount === 0 ? 0 : ((((await ItemModel.find()
            .sort({ itemId: -1 })
            .limit(1)) as unknown as Item[])[0].itemId || 0) as number);

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
        });

        await itemtoCreate.save({});

        return ItemModel.findOne({ itemId: (highestId + 1) }) as unknown as Item;
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

            // eslint-disable-next-line no-param-reassign
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
        const reservationRequestAllowed = results.filter(
            (item) => item.requiredRolesToReserve.includes(user.role),
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
     * Checks if any reservations collisions occure
     * @param reservationIds
     * @param newReservation
     *
     * @returns true if no collision exists
     */
    // eslint-disable-next-line max-len
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
