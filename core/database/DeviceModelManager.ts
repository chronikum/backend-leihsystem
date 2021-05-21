import { DeviceModel } from '../../models/DeviceModel';
import DeviceModelModel from '../../models/mongodb-models/DeviceModelModel';

export default class DeviceModelManager {
    /**
     * Instance logic
     */
    static instance = DeviceModelManager.getInstance();

    public static getInstance(): DeviceModelManager {
        if (!DeviceModelManager.instance) {
            DeviceModelManager.instance = new DeviceModelManager();
        }

        return DeviceModelManager.instance;
    }

    /**
     * Create new device model
     * @param Model device model
     */
    async createNewModel(model: DeviceModel): Promise<DeviceModel> {
        const modelCount = await DeviceModelModel.count() || 0;
        const highestId: number = modelCount === 0 ? 0 : ((((await DeviceModelModel.find()
            .sort({ deviceModelId: -1 })
            .limit(1)) as unknown as DeviceModel[])[0].deviceModelId || 0) as number);
        const checkIfExisting = await this.getDeviceModelByDeviceId(model);
        if (!checkIfExisting) {
            model.deviceModelId = (highestId + 1);
            const deviceModel = new DeviceModelModel(model);
            deviceModel.save();
            return Promise.resolve(model);
        }
        console.log('Device model already exists.');
        return Promise.resolve(null);
    }

    /**
     * Update existing model with new values
     * @param Model device model
     */
    async updateModel(model: DeviceModel) {
        const checkIfModelExists = await this.getDeviceModelByDeviceId(model);
        if (checkIfModelExists) {
            if (model.deviceModelId) {
                await DeviceModelModel.updateOne({ deviceModelId: model.deviceModelId }, model).exec();
                console.log('Model updated.');
                const check2 = await this.getDeviceModelByDeviceId(model);
                console.log(check2.displayName);
            }
        } else {
            console.log('Could not update model - model does not exist.');
        }
    }

    /**
     * Get all available device models
     */
    async getAllDeviceModels(): Promise<DeviceModel[]> {
        const deviceModels = await DeviceModelModel.find({}) as unknown as DeviceModel[] || [];
        return Promise.resolve(deviceModels);
    }

    /**
     * Gets device model by deviceModelId
     * @param model model to get
     */
    async getDeviceModelByDeviceId(model: DeviceModel): Promise<DeviceModel> {
        const detailedModel: DeviceModel = await DeviceModelModel.findOne({ deviceModelId: model.deviceModelId }) as unknown as DeviceModel;
        if (detailedModel) {
            return Promise.resolve(detailedModel);
        }
        return Promise.resolve(null);
    }
}
