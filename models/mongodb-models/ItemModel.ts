import mongoose, { Schema } from 'mongoose';

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
    model: String,
    notes: String,
    available: Boolean,
    startDate: Number,
    plannedEndDate: Number,
    itemId: Number,
});

const ItemModel = mongoose.model('ItemModel', itemSchema);

export default ItemModel;
