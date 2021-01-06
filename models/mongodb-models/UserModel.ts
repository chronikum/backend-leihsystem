import mongoose, { Schema } from 'mongoose';

/**
 * User Schema
 */
const userSchema = new Schema({
    userId: String,
    username: String,
    firstname: String,
    surname: String,
    email: String,
    password: String,
    lastLogin: Number,
    session: String,
    role: String,
    groupId: [Number],
});

const UserModel = mongoose.model('UserModel', userSchema);

export default UserModel;
