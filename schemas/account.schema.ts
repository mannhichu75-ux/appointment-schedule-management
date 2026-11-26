import mongoose from "mongoose"

/**
 * Account Schema
 *
 * Defines the structure of a user account in the database using Mongoose.
 * 
 * Fields:
 * @property {String} fullname - Full name of the user (required)
 * @property {String} email - Email address of the user (required, unique)
 * @property {String} phone - Phone number of the user (required)
 * @property {String} role - User role. Must be one of "user", "admin", "doctor", "moderator". Default is "user".
 * @property {Date} datebirth - Date of birth of the user (required)
 * @property {String} hashedPassword - Hashed password for authentication (required)
 * 
 * Options:
 * @option timestamps - Automatically adds `createdAt` and `updatedAt` fields
 * 
 * Usage:
 * import Account from './account.schema.js';
 * 
 * // Create a new account
 * const newAccount = new Account({
 *   fullname: "John Doe",
 *   email: "john@example.com",
 *   phone: "0912345678",
 *   role: "user",
 *   datebirth: new Date("2000-01-01"),
 *   hashedPassword: "<hashed_password_here>"
 * });
 * await newAccount.save();
 */

const accountSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "doctor", "moderator"], default: "user" },
    datebirth: { type: Date, required: true },
    hashedPassword: { type: String, required: true }
}, { timestamps: true })

export default mongoose.model("Account", accountSchema)
