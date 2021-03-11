import mongoose, { Schema } from 'mongoose';

const subRequestModelSchema = new Schema({
    _id: String,
    count: Number, // This is the amount of devices requested
    deviceModelIdentifier: Number, // This is the device model which references the DeviceModel
});

/**
 * ReservationRequest Schema
 */
const requestModelSchema = new Schema({
    requestId: Number, // Unique
    userCreated: String, // the user responsible for the requested reservation
    startDate: Number, // start date of the reservation reqeust
    plannedEndDate: Number, // end date of the reservation request
    note: String, // notes provided by the user making the request
    subRequest: [subRequestModelSchema],
    deviceCount: Number,
    created: Number,
    modified: Number,
    priority: Number,
});

const RequestModel = mongoose.model('requestModel', requestModelSchema);

export default RequestModel;
