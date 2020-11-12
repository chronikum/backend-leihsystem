import mongoose, { Schema } from 'mongoose';

/**
 * System Log Schema
 */
const systemLogModelSchema = new Schema({
    message: String,
    timestamp: String
});

const SystemLogModel = mongoose.model('systemLogModel', systemLogModelSchema);

export default SystemLogModel;
