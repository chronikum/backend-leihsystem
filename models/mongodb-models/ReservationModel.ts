import mongoose, { Schema } from 'mongoose';

/**
 * Reservation Schema
 */
const reservationSchema = new Schema({
    reservationName: String,
    reservationId: Number,
    description: String,
    approvalRequired: Boolean,
    approved: Boolean,
    responsible: Boolean,
    itemIds: [String],
    startDate: Number,
    plannedEndDate: Number,
    completed: Boolean,
});

const ReservationModel = mongoose.model('ReservationModel', reservationSchema);

export default ReservationModel;
