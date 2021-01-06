import mongoose, { Schema } from 'mongoose';

/**
 * Group Schema
 */
const groupSchema = new Schema({
    groupId: Number,
    displayName: String,
    description: String,
    role: [String],
});

const GroupModel = mongoose.model('GroupModel', groupSchema);

export default GroupModel;
