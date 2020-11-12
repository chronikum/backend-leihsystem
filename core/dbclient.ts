import SystemLogModel from '../models/mongodb-models/SystemLogModel';
import UserModel from '../models/mongodb-models/UserModel';
import { User } from '../models/User';

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

        const existingUser = await UserModel.findOne({ userId: user.userId });
        if (existingUser) {
            console.log('User does already exist!');
            return false;
        }
        await newUser.save();
        const createdUser = await UserModel.findOne({ userId: user.userId });
        console.log(`The initial admin password is: ${user.password}`);
        return Promise.resolve(!!createdUser);
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
