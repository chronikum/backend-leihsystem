import { concat } from 'rxjs';
import { UserRoles } from '../../enums/UserRoles';
import { Group } from '../../models/Group';
import GroupModel from '../../models/mongodb-models/GroupModel';
import UserModel from '../../models/mongodb-models/UserModel';
import { User } from '../../models/User';
import UserManager from './UserManager';

export class GroupManager {
    /**
     * Instance logic
     */
    static instance = GroupManager.getInstance();

    public static getInstance(): GroupManager {
        if (!GroupManager.instance) {
            GroupManager.instance = new GroupManager();
        }

        return GroupManager.instance;
    }

    /**
     * Create group
     */
    async createGroup(group: Group): Promise<Group> {
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

        return GroupModel.findOne({ groupId: (highestId + 1) }) as unknown as Group;
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
        const userSearched = await UserManager.instance.getUserForId(user.userId);
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
    async updateGroup(group: Group): Promise<Group> {
        GroupModel.updateOne({ groupId: group.groupId }, { group }).exec();

        return GroupModel.findOne({ groupId: group.groupId }) as unknown as Group;
    }

    /**
     * Deletes the given group
     *
     * @param group Delete the group given
     */
    async deleteGroup(group: Group) {
        GroupModel.deleteOne({ groupId: group.groupId }).exec();
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
        const users = await UserModel.find({
            $or: [
                {
                    firstname: { $regex: query, $options: 'i' },
                },
                {
                    surname: { $regex: query, $options: 'i' },
                },
                {
                    username: { $regex: query, $options: 'i' },
                },
            ],
        }).limit(7) as unknown as User[];
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
}
