import { concat } from 'rxjs';
import { UserRoles } from '../enums/UserRoles';
import { Group } from '../models/Group';
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
    async checkRole(required: UserRoles[], givenUser: User): Promise<boolean> {
        if (givenUser) {
            const userSearched = await this.dbClient.getUserForId(givenUser.userId);
            const userGroups: Group[] = await this.dbClient.getGroups(givenUser.groupId);
            let groupsMapped = [];
            concat(userGroups.map((group) => group.role)).subscribe((x) => {
                groupsMapped = x;
            });
            console.log(groupsMapped);
            return ((required.includes(userSearched.role)) || (userSearched.role === UserRoles.ADMIN) || (groupsMapped.includes(userSearched.role))); // User Role
        }
        return false;
    }
}
