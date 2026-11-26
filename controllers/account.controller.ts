import {
    createAccountService,
    updateAccountService,
    getAccountsService,
    deleteAccountService,
    getAccountStatsService
} from "../services/account.service.js"
import bcrypt from "bcrypt"

/**
 * createAccountController
 *
 * Handles the creation of a new user account.
 * 
 * Expects the following fields in the request body:
 * - fullname: string, required
 * - email: string, required, must be valid email format
 * - phone: string, required, must match Vietnamese phone format (0XXXXXXXXX or +84XXXXXXXXX)
 * - role: string, optional, one of ["user", "admin", "doctor", "moderator"], defaults to "user"
 * - datebirth: string or Date, required, must be a valid date, user must be at least 12 years old
 * - password: string, required, minimum 6 characters
 *
 * Steps performed:
 * 1. Validates required fields and formats.
 * 2. Validates age from date of birth.
 * 3. Hashes the password using bcrypt.
 * 4. Prepares sanitized account data.
 * 5. Calls the account service to create the account in the database.
 * 6. Returns a success message if account creation succeeds.
 *
 * Error Handling:
 * - Returns 400 Bad Request if validation fails.
 * - Returns 401 Unauthorized if account creation fails (service returns falsy value).
 * - Returns 500 Internal Server Error for unexpected errors.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success or error message
 */

export const createAccountController = async (req, res) => {
    try {
        const { fullname, email, phone, role, datebirth, password } = req.body

        if (!fullname || !email || !phone || !password || !datebirth) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" })
        }

        const phoneRegex = /^(0|\+84)(\d{9})$/
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Invalid phone number format" })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        const validRoles = ["user", "admin", "doctor", "moderator"]
        const userRole = role && validRoles.includes(role) ? role : "user"

        const birth = new Date(datebirth)
        if (isNaN(birth.getTime())) {
            return res.status(400).json({ message: "Invalid date of birth" })
        }
        const now = new Date()
        const age = now.getFullYear() - birth.getFullYear()
        if (age < 12) {
            return res.status(400).json({ message: "Age must be at least 12 years old" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const accountData = {
            fullname: fullname.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            role: userRole,
            datebirth: birth,
            hashedPassword
        }

        const account = await createAccountService(accountData)

        if (!account) {
            res.status(401).json({ message: "Create account failed" })
        }

        return res.status(201).json({
            message: "Account created successfully",
        })

    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * updateAccountController
 *
 * Handles updating an existing user account.
 * 
 * This controller accepts an account identifier (either _id or email) via route parameters
 * and optional fields in the request body to update the account.
 *
 * Expected route parameter:
 * @param {string} req.params.idOrEmail - The account _id or email to identify the account
 *
 * Optional fields in request body (`req.body`):
 * - fullname: string - New full name
 * - email: string - New email address (must be unique)
 * - phone: string - New phone number (must be unique)
 * - role: string - New user role ("user", "admin", "doctor", "moderator")
 * - datebirth: string | Date - New date of birth
 * - password: string - New password (will be hashed automatically)
 *
 * Steps performed:
 * 1. Extracts account identifier from `req.params`.
 * 2. Extracts optional update fields from `req.body`.
 * 3. Prepares an `updateData` object containing only the fields to update.
 * 4. Hashes password if provided.
 * 5. Calls `updateAccountService` to perform the update in the database.
 * 6. Returns a success message if update succeeds.
 *
 * Error Handling:
 * - Returns 500 Internal Server Error if service throws an error.
 * - Duplicate email or phone errors are handled in the service layer and propagated here.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error
 *
 * Example usage:
 * PUT /accounts/:idOrEmail
 * Body: { "fullname": "New Name", "email": "new@example.com" }
 * Response: { message: "Account updated successfully" }
 */
export const updateAccountController = async (req, res) => {
    try {
        const { idOrEmail } = req.params
        const { fullname, email, phone, role, datebirth, password } = req.body

        const updateData = {}

        if (fullname) updateData.fullname = fullname.trim()
        if (email) updateData.email = email.trim()
        if (phone) updateData.phone = phone.trim()
        if (role) updateData.role = role
        if (datebirth) updateData.datebirth = datebirth
        if (password) updateData.hashedPassword = await bcrypt.hash(password, 10)

        const result = await updateAccountService(idOrEmail, updateData)

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * getAccountsController
 *
 * Controller function to handle fetching user accounts with pagination.
 *
 * Responsibilities:
 * 1. Parse query parameters `page` and `limit` from the request.
 * 2. Call the `getAccountsService` to retrieve accounts from the database.
 * 3. Return a JSON response containing the accounts and pagination info.
 *
 * Query Parameters:
 * @param {string} req.query.page - Optional. Page number (1-based). Default is 1.
 * @param {string} req.query.limit - Optional. Number of accounts per page. Default is 10.
 *
 * Response JSON:
 * @returns {Object} {
 *   accounts: Array of account objects,
 *   total: Total number of accounts in the database,
 *   page: Current page number,
 *   totalPages: Total number of pages
 * }
 *
 * Error Handling:
 * - Returns status 500 with { message: error.message } if any unexpected error occurs.
 *
 * Example Usage:
 * GET /accounts?page=2&limit=5
 * Response:
 * {
 *   "accounts": [
 *     { "_id": "abc123", "fullname": "John Doe", "email": "john@example.com", ... },
 *     ...
 *   ],
 *   "total": 42,
 *   "page": 2,
 *   "totalPages": 9
 * }
 */

export const getAccountsController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10

        const result = await getAccountsService(page, limit)

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * deleteAccountController
 *
 * Handles HTTP DELETE requests to remove an existing account.
 * 
 * This controller receives the `accountId` from the request body,
 * validates its presence, and delegates the actual deletion logic
 * to the `deleteAccountService`. It then returns a success message
 * if the account is deleted successfully, or an appropriate error
 * response if something goes wrong.
 *
 * @async
 * @function deleteAccountController
 * @param {import("express").Request} req - Express request object
 *   @param {string} req.body.accountId - The MongoDB _id of the account to delete
 * @param {import("express").Response} res - Express response object
 *
 * @returns {Promise<void>} Sends a JSON response:
 *   - 200: `{ message: "Account deleted successfully" }`
 *   - 400: `{ message: "accountId is required" }`
 *   - 404: `{ message: "Account not found" }`
 *   - 500: `{ message: "Failed to delete account" }`
 *
 * @example
 * // Example request:
 * DELETE /accounts
 * {
 *   "accountId": "670f2a8c1b9c5f0012345678"
 * }
 *
 * // Example success response:
 * {
 *   "message": "Account deleted successfully"
 * }
 */

export const deleteAccountController = async (req, res) => {
    try {
        const { accountId } = req.body
        if (!accountId) {
            return res.status(400).json({ message: "accountId is required" })
        }

        const result = await deleteAccountService(accountId)
        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * getAccountStatsController
 *
 * Controller for retrieving account statistics grouped by role.
 *
 * GET /api/v1/accounts/stats
 *
 * Access: Admin only
 */
export const getAccountStatsController = async (req, res) => {
    try {
        const stats = await getAccountStatsService();
        return res.status(200).json({
            message: "Account statistics retrieved successfully",
            data: stats
        });
    } catch (error) {
        console.error("getAccountStatsController error:", error);
        return res.status(500).json({ message: error.message });
    }
};