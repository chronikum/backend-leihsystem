import mongoose, { Schema } from 'mongoose';

/**
 * Device Model Schema
 */
const devicemodelSchema = new Schema({
    displayName: String,
    deviceModelId: Number,
    description: String,
    capabilities: String,
    defaultDeviceValue: Number,
});

const DeviceModelModel = mongoose.model('DeviceModel', devicemodelSchema);

export default DeviceModelModel;
