import mongoose, { Schema } from 'mongoose';

/**
 * System Log Schema
 */
const requestModelSchema = new Schema({
    requestId: Number, // Unique
    itemIds: [Number], // items which were requested
    responsibleUserId: Number, // the user responsible for the requested reservation
    assignedUserId: Number, // this user could be assigned to a request operation
    startDate: Number, // start date of the reservation reqeust
    plannedEndDate: Number, // end date of the reservation request
    note: String, // notes provided by the user making the request
    created: Number,
    modified: Number,
    priority: Number,
});

const RequestModel = mongoose.model('requestModel', requestModelSchema);

export default RequestModel;
