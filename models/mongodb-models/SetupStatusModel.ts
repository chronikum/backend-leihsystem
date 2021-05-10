import mongoose, { Schema } from 'mongoose';

/**
 * setup status schema
 */
const setupStatusSchema = new Schema({
    setup: Boolean, // True, if setup completed
    created: Number, // timestamp system created
    step: Number, // the setup step finished
});

const SetupStatusModel = mongoose.model('setupSchema', setupStatusSchema);

export default SetupStatusModel;
