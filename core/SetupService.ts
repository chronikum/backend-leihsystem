import { UserRoles } from '../enums/UserRoles';
import SetupStatusModel from '../models/mongodb-models/SetupStatusModel';
import { SetupStatus } from '../models/SetupStatus';
import { User } from '../models/User';
import DBClient from './dbclient';

/**
 * The service used to setup the system at the first start
 */
export default class SetupService {
    /**
     * DBclient
     */
    dbClient = DBClient.instance;

    // Shared instance
    static instance = SetupService.getInstance();

    public static getInstance(): SetupService {
        if (!SetupService.instance) {
            SetupService.instance = new SetupService();
        }

        return SetupService.instance;
    }

    /**
     * Will check if there is a SetupStatus true in the mongo database
     * - will return the setup status if one is available
     * - will return false if non is available
     *
     * @returns SetupStatus
     */
    async checkSetupStatus(): Promise<SetupStatus> {
        const setupStatus = await SetupStatusModel.findOne({}) as unknown as SetupStatus;
        if (setupStatus) {
            return setupStatus;
        }
        return null;
    }

    /**
     * Creates initial administrative user
     * - will create user
     * - necessary for setup
     * - can be executed one time during lifetime
     */
    async createAdministrativeUser(user: User): Promise<User> {
        console.log('Creating user');
        const adminUser: User = {
            firstname: user.firstname,
            surname: user.surname,
            password: user.password,
            email: user.email,
            role: UserRoles.ADMIN,
            username: 'Administrator',
            groupId: [1], // 1 will always be the administrative group id
        };
        const success = await this.dbClient.createUser(adminUser, false);
        if (success) {
            const createdUser = await this.dbClient.getUserforUsername('Administrator');
            if (createdUser) {
                console.log(createdUser);
                await this.setupCompleted();
                return Promise.resolve(createdUser);
            }
        }
        console.log('FATAL ERROR DURING CREATION OF ADMINISTRATIVE USER');
        return null;
    }

    /**
     * Will be called after creating the administrative user
     * - This will trigger the system to switch to running state (not setup)
     * - creates a setup configuration
     */
    async setupCompleted(): Promise<boolean> {
        const setup: SetupStatus = {
            setup: true,
            created: Date.now(),
            step: 1,
        };
        const setupModel = new SetupStatusModel(setup);
        const saved = await setupModel.save();
        return Promise.resolve(true);
    }
}
