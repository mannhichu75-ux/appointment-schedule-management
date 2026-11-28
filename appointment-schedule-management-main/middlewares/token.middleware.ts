import jwt from "jsonwebtoken";
import Account from "../schemas/account.schema.js";

/**
 * verifyAccessToken
 *
 * Middleware to validate access token sent via HTTP cookie.
 * Steps:
 * 1. Check if `accessToken` exists in cookies.
 * 2. Verify JWT token signature and expiration.
 * 3. Check if email in token exists in the database.
 * 4. Attach user info to `req.user` if valid.
 * 5. Call `next()` if all checks pass, otherwise respond with 401.
 *
 * Usage:
 * app.use("/api/v1/protected", verifyAccessToken, protectedRoute);
 */
export const verifyAccessToken = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            return res.status(401).json({ message: "Access token not found" });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired access token" });
        }

        const account = await Account.findOne({ email: payload.email });
        if (!account) {
            return res.status(401).json({ message: "Account not found" });
        }

        // Attach user info to request for downstream use
        req.user = {
            id: account._id,
            email: account.email,
            role: account.role
        };

        next();
    } catch (error) {
        console.error("verifyAccessToken middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * checkAdminRole
 *
 * Middleware to allow only users with role "admin".
 *
 * Usage:
 * app.use("/api/v1/admin", verifyAccessToken, checkAdminRole, adminRoutes);
 */
export const checkAdminRole = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }
    next();
};

/**
 * checkDoctorRole
 *
 * Middleware to allow only users with role "doctor".
 *
 * Usage:
 * app.use("/api/v1/doctor", verifyAccessToken, checkDoctorRole, doctorRoutes);
 */
export const checkDoctorRole = (req, res, next) => {
    if (!req.user || req.user.role !== "doctor") {
        return res.status(403).json({ message: "Access denied: Doctors only" });
    }
    next();
};

/**
 * checkModeratorRole
 *
 * Middleware to allow only users with role "moderator".
 *
 * Usage:
 * app.use("/api/v1/moderator", verifyAccessToken, checkModeratorRole, moderatorRoutes);
 */
export const checkModeratorRole = (req, res, next) => {
    if (!req.user || req.user.role !== "moderator") {
        return res.status(403).json({ message: "Access denied: Moderators only" });
    }
    next();
};
