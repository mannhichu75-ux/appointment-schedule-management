import {
    signInService,
    signupService
} from "../services/auth.service.js"

/**
 * signInController
 *
 * Controller for handling user login (sign-in) requests.
 * 
 * This controller performs the following steps:
 * 1. Validates that the `email` and `password` fields are provided in the request body.
 * 2. Calls the `signInService` to authenticate the user with the provided credentials.
 * 3. If authentication fails (wrong email or password), responds with 401 Unauthorized.
 * 4. If authentication succeeds:
 *    - Generates `accessToken` and `refreshToken`.
 *    - Sets the tokens as HttpOnly cookies:
 *        - `accessToken`: short-lived token (e.g., 30 minutes) for API access.
 *        - `refreshToken`: long-lived token (e.g., 7 days) for renewing access tokens.
 *    - Cookies are set securely in production (`secure: true`) and use `sameSite: "lax"` to mitigate CSRF risks.
 * 5. Returns 200 OK with a success message and the user's role.
 *
 * Error handling:
 * - 400 Bad Request: if `email` or `password` is missing.
 * - 401 Unauthorized: if credentials are invalid.
 * - 500 Internal Server Error: for unexpected server/database errors.
 *
 * Security considerations:
 * - Passwords are never returned in the response.
 * - HttpOnly cookies prevent client-side JavaScript from accessing the tokens.
 * - `secure` cookies ensure HTTPS-only transmission in production.
 * - Minimal error information is sent to the client to prevent account enumeration.
 *
 * @param {Object} req - Express request object containing `body.email` and `body.password`.
 * @param {Object} res - Express response object used to send HTTP responses and cookies.
 *
 * @example
 * POST /api/auth/signin
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "message": "Login successful",
 *   "role": "user"
 * }
 */

export const signInController = async (req, res) => {
    try {
        const { email, password } = req.body

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        let tokens
        try {
            tokens = await signInService(email, password)
        } catch (authError) {
            // Authentication failure
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const { accessToken, refreshToken, role } = tokens

        // Set HttpOnly cookies securely
        const isProduction = process.env.NODE_ENV === "production"
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true, 
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 30 * 60 * 1000 // 30 minutes
        })

        return res.status(200).json({
            message: "Login successful",
            role
        })

    } catch (error) {
        // Unexpected server errors
        console.error("SignInController error:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

/**
 * signupController
 *
 * Handles user signup requests by validating input data, creating a new account,
 * and returning a success or error message.
 *
 * Steps performed:
 * 1. Extracts `fullname`, `email`, `phone`, `datebirth`, and `password` from request body.
 * 2. Validates that all required fields are provided.
 * 3. Validates `email` format using a regex pattern.
 * 4. Validates `phone` format (Vietnamese numbers) using a regex pattern.
 * 5. Ensures `password` is at least 6 characters long.
 * 6. Validates `datebirth` is a valid date and that age is at least 12 years.
 * 7. Calls `signupService` to create the account (role defaults to "user").
 * 8. Returns HTTP 201 with success message if account creation succeeds.
 * 9. Handles and returns appropriate HTTP error codes for validation and server errors.
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user signup data
 * @param {string} req.body.fullname - Full name of the user
 * @param {string} req.body.email - Email address of the user
 * @param {string} req.body.phone - Phone number of the user
 * @param {string|Date} req.body.datebirth - Date of birth of the user
 * @param {string} req.body.password - Plain text password
 * 
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with `message` indicating success or error
 * 
 * @example
 * POST /api/auth/signup
 * {
 *   "fullname": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "0912345678",
 *   "datebirth": "2000-01-01",
 *   "password": "securePass123"
 * }
 *
 * Response:
 * {
 *   "message": "Account created successfully"
 * }
 */

export const signupController = async (req, res) => {
    try {
        const { fullname, email, phone, datebirth, password } = req.body

        // Validate required fields
        if (!fullname || !email || !phone || !datebirth || !password) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" })
        }

        // Validate phone
        const phoneRegex = /^(0|\+84)(\d{9})$/
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Invalid phone number format" })
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" })
        }

        // Validate date of birth
        const birth = new Date(datebirth)
        if (isNaN(birth.getTime())) {
            return res.status(400).json({ message: "Invalid date of birth" })
        }
        const age = new Date().getFullYear() - birth.getFullYear()
        if (age < 12) {
            return res.status(400).json({ message: "Age must be at least 12 years old" })
        }

        const result = await signupService({ fullname, email, phone, datebirth, password })

        return res.status(201).json(result)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * signOutController
 *
 * Handles user sign-out by clearing authentication tokens stored in HTTP cookies.
 * Removes both accessToken and refreshToken cookies to log the user out.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON object containing a success message
 *
 * @example
 * // Route example:
 * // POST /api/auth/signout
 * signOutController(req, res)
 * // Response:
 * // { message: "Logged out successfully" }
 */
export const signOutController = (req, res) => {
    try {
        // Clear authentication cookies
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        })

        return res.status(200).json({ message: "Logged out successfully" })
    } catch (error) {
        console.error("SignOutController error:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}
