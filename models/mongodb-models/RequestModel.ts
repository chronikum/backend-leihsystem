import mongoose, { Schema } from 'mongoose';
import SubRequestModel from './SubRequestModel';

/**
 * System Log Schema
 */
const requestModelSchema = new Schema({
    requestId: Number, // Unique
    userCreated: String, // the user responsible for the requested reservation
    startDate: Number, // start date of the reservation reqeust
    plannedEndDate: Number, // end date of the reservation request
    note: String, // notes provided by the user making the request
    subRequests: [SubRequestModel],
    deviceCount: Number,
    created: Number,
    modified: Number,
    priority: Number,
});

const RequestModel = mongoose.model('requestModel', requestModelSchema);

export default RequestModel;
