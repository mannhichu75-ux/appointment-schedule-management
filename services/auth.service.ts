import Account from "../schemas/account.schema.js"
import bcrypt from "bcrypt"
import { generateAccessToken, generateRefreshToken } from "../helpers/token.helper.js"

/**
 * signInService
 *
 * Authenticates a user using their email and password, and generates JWT tokens.
 *
 * This service performs the following steps:
 * 1. Validates that email and password are provided.
 * 2. Validates the email format.
 * 3. Looks up the account in the database by email.
 * 4. Compares the provided password with the stored hashed password.
 * 5. Generates an access token and a refresh token for successful authentication.
 *
 * @param {string} email - The user's email address (used for login)
 * @param {string} password - The user's plain-text password
 * @returns {Object} - Contains:
 *   - accessToken: JWT access token for API requests
 *   - refreshToken: JWT refresh token for renewing access tokens
 *   - role: The role of the authenticated account (e.g., 'user', 'admin')
 *
 * @throws {Error} - Throws an error if:
 *   - Email or password is missing
 *   - Email format is invalid
 *   - Email does not exist in the database
 *   - Password does not match
 *   - Any unexpected database or hashing errors occur
 *
 * Example usage:
 * const { accessToken, refreshToken, role } = await signInService("user@example.com", "password123")
 */

export const signInService = async (email, password) => {
    try {
        // Check required fields
        if (!email || !password) {
            throw new Error("Email and password are required")
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            throw new Error("Invalid email format")
        }

        // Find account
        const account = await Account.findOne({ email: email.toLowerCase().trim() })
        if (!account) {
            throw new Error("Invalid email or password")
        }

        // Verify password
        const match = await bcrypt.compare(password, account.hashedPassword)
        if (!match) {
            throw new Error("Invalid email or password")
        }

        // Prepare JWT payload
        const payload = { id: account._id, role: account.role, email: account.email }

        // Generate tokens
        const accessToken = generateAccessToken(payload)
        const refreshToken = generateRefreshToken(payload)

        return { accessToken, refreshToken, role: account.role }

    } catch (error) {
        // Wrap unknown errors
        throw new Error(error.message || "Failed to sign in")
    }
}

/**
 * signupService
 *
 * Handles the creation of a new user account in the database.
 * Performs the following steps:
 * 1. Checks if the provided email already exists.
 * 2. Checks if the provided phone number already exists.
 * 3. Hashes the plain-text password using bcrypt.
 * 4. Creates a new Account document in MongoDB with the provided data.
 * 5. Returns a success message if the account is created successfully.
 *
 * @param {Object} data - User signup data
 * @param {string} data.fullname - Full name of the user
 * @param {string} data.email - Email address of the user
 * @param {string} data.phone - Phone number of the user
 * @param {string|Date} data.datebirth - Date of birth of the user
 * @param {string} data.password - Plain text password
 *
 * @returns {Object} JSON object containing a success message
 * @throws {Error} Throws error if email or phone already exists, password hashing fails, 
 *                 or account creation fails
 *
 * @example
 * const result = await signupService({
 *   fullname: "John Doe",
 *   email: "john@example.com",
 *   phone: "0912345678",
 *   datebirth: "2000-01-01",
 *   password: "securePass123"
 * })
 * 
 * console.log(result)
 * // Output: { message: "Account created successfully" }
 */

export const signupService = async (data) => {
    try {
        const { email, phone, password } = data

        // Check for existing email
        if (await Account.findOne({ email: email.toLowerCase() })) {
            throw new Error("Email already exists")
        }

        // Check for existing phone
        if (await Account.findOne({ phone })) {
            throw new Error("Phone number already exists")
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        const newAccount = new Account({
            fullname: data.fullname.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            datebirth: new Date(data.datebirth),
            hashedPassword
        })

        await newAccount.save()

        return { message: "Account created successfully" }
    } catch (error) {
        throw new Error(error.message || "Failed to create account")
    }
}