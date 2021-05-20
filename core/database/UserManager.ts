import UserModel from '../../models/mongodb-models/UserModel';
import { User } from '../../models/User';

const crypto = require('crypto');

/**
 * Manages User Models
 */
export default class UserManager {
    /**
     * Instance Logic
     */
    static instance = UserManager.getInstance();

    public static getInstance(): UserManager {
        if (!UserManager.instance) {
            UserManager.instance = new UserManager();
        }

        return UserManager.instance;
    }

    /**
     * Creates a new user in the database
     * @param User to create
     * @param isLDAP if provided, no password is required
     * @TODO possible attack vector: a ldap user could be used to login to the admin account if username is the same.
     * This can be resolved by findOne({isLDAP: true}) but has to be handled correctly at failure.
     */
    async createUser(user: User, isLDAP?: boolean): Promise<boolean> {
        // How many users do already exist?
        const userCount = await UserModel.countDocuments({});
        const highestUser: number = userCount === 0 ? 0 : ((((await UserModel.find()
            .sort({ userId: -1 })
            .limit(1)) as unknown as User[])[0].userId || 0) as number);

        if (!isLDAP) { // Create user without ldap
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
                isLDAP: false,
            });

            const existingUser = await UserModel.findOne({ username: user.username });
            if (existingUser) {
                console.log('User does already exist!');
                return false;
            }
            await newUser.save();
            const createdUser = await UserModel.findOne({ userId: user.userId });
            return Promise.resolve(!!createdUser);
        } // Is an ldap user
        if (isLDAP) {
            // eslint-disable-next-line no-param-reassign, radix
            user.userId = (parseInt((highestUser as any)) + 1).toString();

            const newUser = new UserModel({
                username: user.username,
                userId: user.userId,
                email: user.email,
                firstname: user.firstname,
                surname: user.surname,
                role: user.role,
                groupId: user.groupId || -1,
                isLDAP: true,
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

        return Promise.resolve(false);
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
     *  Updates a user, but only certain values
     *
     * TODO: Check that an email is not used yet
     * @param user to be updated
     *
     * @returns true, if successful
     */
    async updateUserInformation(user: User): Promise<User> {
        console.log('Updating...');
        const before = await UserModel.findOne({ userId: user.userId }) as unknown as User;
        const x1 = await UserModel.updateOne({ userId: user.userId }, {
            email: user.email,
            matrikelnumber: user.matrikelnumber || '',
            phone: user.phone || '',
        }, { new: false }).exec().then((x) => x.ok === 1);
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
        const user = UserModel.findOne({ userId }) as unknown as User;
        if (user) {
            user.password = '';
            return Promise.resolve(user);
        }
        return null;
    }

    /**
     * Get user for the username
     *
     * @param id user id
     * @returns Promise<User> with id
     */
    async getUserforUsername(username: string): Promise<User> {
        const user = UserModel.findOne({ username }) as unknown as User;
        if (user) {
            if (user.password) {
                user.password = '';
            }
            console.log('USER FOUND:');
            console.log(user);
            return Promise.resolve(user);
        }
        return null;
    }

    /**
     * Get user with the email  provided
     *
     * @param email for user
     * @returns Promise<User> with email
     */
    async getUserForEmail(email: string): Promise<User> {
        console.log(`LOOKING FOR USER WITH MAIL: ${email}`);
        const user = await UserModel.findOne({ email }) as unknown as User;
        if (user) {
            user.password = '';
            return Promise.resolve(user);
        }
        return null;
    }
}
