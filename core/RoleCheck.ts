import { UserRoles } from '../enums/UserRoles';
import { User } from '../models/User';
import DBClient from './dbclient';

/**
 * Checks role of the user
 */
export default class RoleCheck {
    // Shared instance
    static instance = RoleCheck.getInstance();

    public static getInstance(): RoleCheck {
        if (!RoleCheck.instance) {
            RoleCheck.instance = new RoleCheck();
        }

        return RoleCheck.instance;
    }

    /**
     * Db Client
     */
    dbClient = DBClient.instance;

    /**
     * Checks if the given user has the role required
     * - admin has always access
     * @param required role
     * @param user given user - do NOT trust
     */
    async checkRole(required: UserRoles, givenUser: User): Promise<boolean> {
        const userSearched = await this.dbClient.getUserForId(givenUser.userId);
        return ((userSearched.role === required) || (userSearched.role === UserRoles.ADMIN));
    }
}
