import SetupStatusModel from '../models/mongodb-models/SetupStatusModel';
import { SetupStatus } from '../models/SetupStatus';

/**
 * The service used to setup the system at the first start
 */
export default class SetupService {
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
}
