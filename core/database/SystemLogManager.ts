import SystemLogModel from '../../models/mongodb-models/SystemLogModel';
import { SystemLog } from '../../models/SystemLog';

export default class SystemLogManager {
    /**
     * Instance logic
     */
    static instance = SystemLogManager.getInstance();

    public static getInstance(): SystemLogManager {
        if (!SystemLogManager.instance) {
            SystemLogManager.instance = new SystemLogManager();
        }

        return SystemLogManager.instance;
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

    /**
     * Get all system logs
     */
    async getAllLogs(): Promise<SystemLog[]> {
        const systemLogs = SystemLogModel.find().sort({ timestamp: -1 }) as unknown as SystemLog[];
        return Promise.resolve(systemLogs);
    }
}
