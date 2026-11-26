import jwt from "jsonwebtoken"
import ENVARS from "../config/envars.js"

/**
 * generateAccessToken
 *
 * Generates a short-lived JWT access token.
 *
 * @param {Object} payload - Data to encode in the token (e.g., { id, email, role })
 * @param {string} [expiresIn='15m'] - Optional token expiration time
 * @returns {string} Signed JWT access token
 *
 * @example
 * const token = generateAccessToken({ id: "123", role: "user" });
 */
export const generateAccessToken = (payload, expiresIn = "30m") => {
    return jwt.sign(payload, ENVARS.JWT_ACCESS_SECRET, { expiresIn })
}

/**
 * generateRefreshToken
 *
 * Generates a long-lived JWT refresh token.
 *
 * @param {Object} payload - Data to encode in the token (e.g., { id, email, role })
 * @param {string} [expiresIn='7d'] - Optional token expiration time
 * @returns {string} Signed JWT refresh token
 *
 * @example
 * const refreshToken = generateRefreshToken({ id: "123", role: "user" });
 */
export const generateRefreshToken = (payload, expiresIn = "7d") => {
    return jwt.sign(payload, ENVARS.JWT_REFRESH_SECRET, { expiresIn })
}
