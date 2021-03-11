import mongoose, { Schema } from 'mongoose';

/**
 * Subrequest model schema
 */
const subRequestModelSchema = new Schema({
    _id: String,
    count: Number, // This is the amount of devices requested
    deviceModelIdentifier: Number, // This is the device model which references the DeviceModel
});

const SubRequestModel = mongoose.model('subRequestModel', subRequestModelSchema);

export default SubRequestModel;
