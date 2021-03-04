import mongoose, { Schema } from 'mongoose';
import { UserRoles } from '../../enums/UserRoles';
import ReservationModel from './ReservationModel';

/**
 * Item Schema
 */
const itemSchema = new Schema({
    name: String,
    internalName: String,
    serialNumber: String,
    ownership: String,
    ownershipIdentifier: String,
    creationDate: Number,
    modificationDate: Number,
    description: String,
    caIdentifier: String, // ZfM asset tag
    managed: Boolean,
    model: String,
    notes: String,
    available: Boolean,
    plannedReservationsIds: [Number],
    itemId: Number,
    requiredRolesToReserve: [String],
    currentReservationId: String,
    generatedUniqueIdentifier: String,
    modelIdentifier: Number, // the associated device model id
});

const ItemModel = mongoose.model('ItemModel', itemSchema);

export default ItemModel;
