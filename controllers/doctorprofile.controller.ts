import {
    createDoctorProfileService,
    getDoctorProfileByAccountIdService,
    getAllDoctorProfilesService,
    searchDoctorsService,
    updateDoctorProfileService,
    deleteDoctorProfileService
} from "../services/doctorprofile.service.js";

/**
 * createDoctorProfileController
 *
 * Handles HTTP requests to create a doctor profile.
 *
 * @route POST /api/v1/doctor-profiles
 */
export const createDoctorProfileController = async (req, res) => {
    try {
        const { accountId, facultyId, specialization, experienceYears, description, clinicAddress } = req.body;

        if (!accountId || !facultyId || !specialization) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const result = await createDoctorProfileService({
            accountId,
            facultyId,
            specialization,
            experienceYears,
            description,
            clinicAddress
        });

        return res.status(201).json({ "message": "Created Doctor Profile Successfully" });
    } catch (error) {
        console.error("createDoctorProfileController error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * getDoctorProfileByAccountIdController
 *
 * Handles fetching a doctor's profile using their associated Account ID.
 * Expects `accountId` in route parameters.
 */
export const getDoctorProfileByAccountIdController = async (req, res) => {
    try {
        const { accountId } = req.params;

        if (!accountId) {
            return res.status(400).json({ message: "Account ID is required" });
        }

        // Call the service function
        const profile = await getDoctorProfileByAccountIdService(accountId);

        // Service throws error if not found, caught below
        return res.status(200).json({ message: "Doctor profile fetched successfully", profile });

    } catch (error) {
        console.error("getDoctorProfileByAccountIdController error:", error);
        // Handle specific "Not Found" error from service
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        // Handle other potential errors
        return res.status(500).json({ message: error.message });
    }
};

/**
 * getAllDoctorProfilesController
 *
 * Handles fetching a paginated list of all doctor profiles.
 * Expects optional `page` and `limit` query parameters.
 */
export const getAllDoctorProfilesController = async (req, res) => {
    try {
        // Extract pagination parameters from query string, providing defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

        // Call the service function
        const result = await getAllDoctorProfilesService(page, limit);

        // Service returns { profiles: [...], pagination: {...} }
        return res.status(200).json({
            message: "Doctor profiles fetched successfully",
            ...result // Spread the profiles and pagination keys
        });

    } catch (error) {
        console.error("getAllDoctorProfilesController error:", error);
        return res.status(500).json({ message: error.message || "Failed to fetch doctor profiles" });
    }
};

/**
 * searchDoctorsController
 *
 * Handles searching for accounts with the 'doctor' role based on a query string.
 * Expects query parameters: `q` (search term), `page`, `limit`.
 */
export const searchDoctorsController = async (req, res) => {
    try {
        const { q, page, limit } = req.query;

        // Basic validation for the search query
        if (!q) {
            return res.status(400).json({ message: "Search query 'q' is required" });
        }

        // Parse pagination, provide defaults
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 20; // Default limit for search

        // Call the service function
        const result = await searchDoctorsService(q, pageNum, limitNum);

        // Service returns { doctors: [...], pagination: {...} }
        return res.status(200).json({
            message: "Doctors searched successfully",
            ...result // Spread doctors and pagination
        });

    } catch (error) {
        console.error("searchDoctorsController error:", error);
        return res.status(500).json({ message: error.message || "Failed to search doctors" });
    }
};

/**
 * updateDoctorProfileController
 *
 * Handles updating an existing doctor's profile using their Account ID.
 * Expects `accountId` in route parameters and update fields in the request body.
 */
export const updateDoctorProfileController = async (req, res) => {
    try {
        const { accountId } = req.params; // Get accountId from URL
        const updateData = req.body; // Get fields to update from body

        // Basic validation
        if (!accountId) {
            return res.status(400).json({ message: "Account ID is required" });
        }
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No update data provided" });
        }

        // Remove potentially harmful or immutable fields from updateData
        delete updateData.accountId; // Cannot change the linked account
        delete updateData._id;       // Cannot change the profile's own ID

        // Call the service function
        const result = await updateDoctorProfileService(accountId, updateData);

        // Service returns { message, profile }
        return res.status(200).json({ message: result.message, profile: result.profile });

    } catch (error) {
        console.error("updateDoctorProfileController error:", error);
        // Handle specific errors like "not found" or validation errors
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.name === 'ValidationError') { // Mongoose validation error
            return res.status(400).json({ message: `Validation Error: ${error.message}` });
        }
        return res.status(500).json({ message: error.message || "Failed to update doctor profile" });
    }
};

/**
 * deleteDoctorProfileController
 *
 * Handles deleting a doctor's profile using their associated Account ID.
 * Expects `accountId` in route parameters.
 */
export const deleteDoctorProfileController = async (req, res) => {
    try {
        const { accountId } = req.params; // Get accountId from URL

        // Basic validation
        if (!accountId) {
            return res.status(400).json({ message: "Account ID is required" });
        }

        // Call the service function
        const result = await deleteDoctorProfileService(accountId);

        // Service returns a success message
        return res.status(200).json({ message: result.message }); // Or status 204 No Content

    } catch (error) {
        console.error("deleteDoctorProfileController error:", error);
        // Handle specific "Not Found" error from service
        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        // Handle other potential errors
        return res.status(500).json({ message: error.message || "Failed to delete doctor profile" });
    }
};