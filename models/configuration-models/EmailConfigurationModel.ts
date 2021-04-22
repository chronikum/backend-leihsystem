import mongoose, { Schema } from 'mongoose';

/**
 * Device Model Schema
 */
const emailConfigurationSchema = new Schema({
    host: String,
    port: Number,
    secure: Boolean,
    username: String,
    password: String,
});

const EmailConfigurationModel = mongoose.model('EmailConfiguration', emailConfigurationSchema);

export default EmailConfigurationModel;
