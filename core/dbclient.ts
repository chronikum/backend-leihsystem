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
     * Returns all items which are available
     */
    async getAvailableItems(): Promise<Item[]> {
        const items = ((await ItemModel.find({ available: true }))) as unknown as Item[] || [];

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
            startDate: item.startDate || undefined,
            plannedEndDate: item.plannedEndDate || undefined,
            itemId: highestId + 1,
            requiredRolesToReserve: item.requiredRolesToReserve || [],
        });

        await itemtoCreate.save({});

        return ItemModel.findOne({ itemId: (highestId + 1) }) as unknown as Item;
    }

    /**
     * Reserve items with a reservation
     */
    async reserveItemsWithReservation(reservation: Reservation, items: Item[], user: User): Promise<Item[]> {
        if (this.canReservationBeApplied(reservation, items, user)) {
            // Create reservation with user ID
            const reservationtoCreate = new ReservationModel({
                reservationName: reservation.reservationName,
                description: reservation.description,
                approvalRequired: reservation.approvalRequired,
                approved: reservation.approved || undefined,
                responsible: user.userId,
                itemIds: reservation.itemIds,
                startDate: reservation.startDate,
                plannedEndDate: reservation.plannedEndDate,
                completed: reservation.completed || undefined,
            });

            reservationtoCreate.save();
        } else {
            return Promise.resolve(null);
        }
        return Promise.resolve(null);
    }

    /**
     * Check if a reservation is appliable
     */
    // eslint-disable-next-line max-len
    async canReservationBeApplied(reservation: Reservation, items: Item[], user: User): Promise<boolean> {
        const permission = items.map(async (item) => {
            // Get item details as we only know the item id and details can be modified (never trust the user)
            const dbItem = await this.getItemById(item.itemId);
            console.log(dbItem);
            return dbItem.requiredRolesToReserve.includes(user.role);
        });

        console.log(permission);

        return Promise.resolve(false);
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
