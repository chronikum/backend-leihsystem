import mongoose, { Schema } from 'mongoose';

/**
 * System Log Schema
 */
const subRequestModelSchema = new Schema({
    count: Number, // This is the amount of devices requested
    deviceModelIdentifier: Number, // This is the device model which references the DeviceModel
});

const SubRequestModel = mongoose.model('subRequestModel', subRequestModelSchema);

export default SubRequestModel;
