import mongoose, { Schema } from 'mongoose';

/**
 * User Schema
 */
const userSchema = new Schema({
    userId: String,
    name: String,
    surname: String,
    email: String,
    password: String,
    lastLogin: Number,
    session: String,
});

const UserModel = mongoose.model('UserModel', userSchema);

export default UserModel;
