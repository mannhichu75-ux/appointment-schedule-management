import Account from "../schemas/account.schema.js"

/**
 * createAccountService
 *
 * Service function to create a new user account in the database.
 * 
 * Responsibilities:
 * 1. Check if the provided email already exists in the database.
 * 2. Check if the provided phone number already exists.
 * 3. Create and save a new account document if no duplicates are found.
 * 4. Return a success message upon successful creation.
 *
 * Input:
 * @param {Object} data - Account data object
 * @param {string} data.fullname - Full name of the user
 * @param {string} data.email - Email of the user (should be already normalized/lowercased)
 * @param {string} data.phone - Phone number of the user (digits only, validated in controller)
 * @param {string} data.role - User role (e.g., "user", "admin")
 * @param {Date} data.datebirth - Date of birth of the user
 * @param {string} data.hashedPassword - Hashed password of the user
 *
 * Output:
 * @returns {Object} - JSON object with success message
 * @throws {Error} - Throws an error if email or phone already exists, or if saving fails
 *
 * Example usage:
 * const result = await createAccountService(accountData)
 * // result => { message: "Account created successfully" }
 */

export const createAccountService = async (data) => {
    try {
        const { email, phone } = data

        const existingEmail = await Account.findOne({ email })
        if (existingEmail) {
            throw new Error("Email already exists")
        }

        const existingPhone = await Account.findOne({ phone })
        if (existingPhone) {
            throw new Error("Phone number already exists")
        }

        const newAccount = new Account(data)
        await newAccount.save()

        return { message: "Account created successfully" }

    } catch (error) {
        throw new Error(error.message || "Failed to create account")
    }
}


/**
 * updateAccountService
 *
 * Service function to update an existing user account in the database.
 * 
 * Responsibilities:
 * 1. Identify the account by either MongoDB _id or email.
 * 2. Prevent updating email or phone number to a value that already exists in the database.
 * 3. Update only the provided fields in the account document.
 * 4. Save the updated account.
 *
 * Input:
 * @param {string} idOrEmail - Account identifier. Can be either:
 *                              - MongoDB _id (string)
 *                              - Email address (string)
 * @param {Object} updateData - Object containing fields to update. Optional keys:
 *                              - fullname {string} - New full name
 *                              - email {string} - New email (must be unique)
 *                              - phone {string} - New phone number (must be unique)
 *                              - role {string} - New role ("user", "admin", "doctor", "moderator")
 *                              - datebirth {string|Date} - New date of birth
 *                              - hashedPassword {string} - New hashed password (already hashed)
 *
 * Output:
 * @returns {Object} - JSON object containing success message: { message: "Account updated successfully" }
 *
 * Error Handling:
 * - Throws an Error if the account is not found.
 * - Throws an Error if email or phone already exists for another account.
 * - Throws an Error if saving the account fails.
 *
 * Example usage:
 * const result = await updateAccountService("user@example.com", {
 *   fullname: "New Name",
 *   phone: "0912345678"
 * })
 * // result => { message: "Account updated successfully" }
 */

export const updateAccountService = async (idOrEmail, updateData) => {
    try {
        const query = idOrEmail.includes("@") ? { email: idOrEmail.toLowerCase() } : { _id: idOrEmail }

        const account = await Account.findOne(query)
        if (!account) throw new Error("Account not found")

        // Prevent updating email or phone to existing duplicates
        if (updateData.email && updateData.email !== account.email) {
            const existingEmail = await Account.findOne({ email: updateData.email.toLowerCase() })
            if (existingEmail) throw new Error("Email already exists")
            account.email = updateData.email.toLowerCase()
        }

        if (updateData.phone && updateData.phone !== account.phone) {
            const existingPhone = await Account.findOne({ phone: updateData.phone })
            if (existingPhone) throw new Error("Phone number already exists")
            account.phone = updateData.phone
        }

        // Update other fields
        if (updateData.fullname) account.fullname = updateData.fullname
        if (updateData.role) account.role = updateData.role
        if (updateData.datebirth) account.datebirth = new Date(updateData.datebirth)
        if (updateData.hashedPassword) account.hashedPassword = updateData.hashedPassword

        await account.save()
        return { message: "Account updated successfully" }
    } catch (error) {
        throw new Error(error.message || "Failed to update account")
    }
}

/**
 * getAccountsService
 *
 * Service function to fetch user accounts from the database with pagination.
 *
 * Responsibilities:
 * 1. Calculate the number of documents to skip based on the current page and limit.
 * 2. Retrieve accounts sorted by creation date (newest first), applying skip and limit for pagination.
 * 3. Count the total number of accounts in the database.
 * 4. Calculate the total number of pages based on total accounts and limit.
 * 5. Return accounts and pagination metadata.
 *
 * Parameters:
 * @param {number} page - Optional. Current page number (1-based). Default is 1.
 * @param {number} limit - Optional. Number of accounts per page. Default is 10.
 *
 * Returns:
 * @returns {Object} {
 *   accounts: Array of account objects,
 *   total: Total number of accounts in the database,
 *   page: Current page number,
 *   totalPages: Total number of pages
 * }
 *
 * Throws:
 * - Throws an Error if fetching accounts fails.
 *
 * Example Usage:
 * const result = await getAccountsService(2, 5)
 * console.log(result)
 * // {
 * //   accounts: [ { _id: "...", fullname: "...", email: "..." }, ... ],
 * //   total: 42,
 * //   page: 2,
 * //   totalPages: 9
 * // }
 */

export const getAccountsService = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit

        const [accounts, total] = await Promise.all([
            Account.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Account.countDocuments()
        ])

        const totalPages = Math.ceil(total / limit)

        return { accounts, total, page, totalPages }
    } catch (error) {
        throw new Error(error.message || "Failed to fetch accounts")
    }
}

/**
 * deleteAccountService
 *
 * Deletes an existing account from the database by its MongoDB `_id`.
 * 
 * This service performs the following steps:
 * 1. Checks if the account exists in the database.
 * 2. If the account exists, it deletes the corresponding record.
 * 3. Returns a confirmation message upon successful deletion.
 *
 * @async
 * @function deleteAccountService
 * @param {string} accountId - The unique MongoDB `_id` of the account to be deleted.
 *
 * @returns {Promise<Object>} A JSON object containing a success message:
 * ```json
 * { "message": "Account deleted successfully" }
 * ```
 *
 * @throws {Error} Throws an error if:
 * - The account does not exist (`"Account not found"`).
 * - The deletion operation fails (`"Failed to delete account"`).
 *
 * @example
 * // Example usage:
 * const result = await deleteAccountService("670f2a8c1b9c5f0012345678");
 * console.log(result);
 * // → { message: "Account deleted successfully" }
 */

export const deleteAccountService = async (accountId) => {
    try {
        const account = await Account.findById(accountId)
        if (!account) {
            throw new Error("Account not found")
        }

        await Account.deleteOne({ _id: accountId })

        return { message: "Account deleted successfully" }
    } catch (error) {
        throw new Error(error.message || "Failed to delete account")
    }
}

/**
 * getAccountStatsService
 *
 * Aggregates and returns the count of accounts by role.
 *
 * @returns {Promise<Object>} - { user: number, admin: number, doctor: number, moderator: number }
 * @throws {Error} - Throws if database aggregation fails
 */
export const getAccountStatsService = async () => {
    try {
        const results = await Account.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            user: 0,
            admin: 0,
            doctor: 0,
            moderator: 0
        };

        results.forEach(r => {
            stats[r._id] = r.count;
        });

        return stats;
    } catch (error) {
        throw new Error(error.message || "Failed to retrieve account statistics");
    }
};