import UserModel from "../models/mongodb-models/UserModel";
import { User } from "../models/User";

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

    constructor() {

    }

    /**
     * Creates a new user in the database
     * @param User to create
     */
    async createUser(user: User) {
        // How many users do already exist?
        let userCount = await UserModel.countDocuments({});
        var highestUser: number =
            userCount === 0 ? 0 : ((((await UserModel.find()
                .sort({ userId: -1 })
                .limit(1)) as unknown as User[])[0].userId || 0) as number);

        const hashedPW = crypto.createHmac("sha256", user.password).digest("hex");
        user.userId = (highestUser + 1).toString();

        var newUser = new UserModel({
            username: user.surname,
            userId: user.userId,
            password: hashedPW,
            email: user.email,
            firstName: user.firstname,
            surname: user.surname,
            role: user.role,
        });

        var existingUser = await UserModel.findOne({ userId: user.userId });
        if (existingUser) {
            console.log("User does already exist!");
            return false;
        } else {
            console.log("User will be created!");
            newUser.save(function (err, message) {
                console.log("Created user");
                if (err) return false;
            });
            return true;
        }

    }
}