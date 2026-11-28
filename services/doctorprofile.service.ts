import DoctorProfile from "../schemas/doctorprofile.schema.js";
import Account from "../schemas/account.schema.js";
import Faculty from "../schemas/faculty.schema.js";

/**
 * createDoctorProfileService
 *
 * Creates a DoctorProfile and links it to an existing doctor account.
 *
 * Responsibilities:
 * 1. Validate that the given account exists and has role = "doctor".
 * 2. Validate that the given faculty exists.
 * 3. Prevent duplicate profiles for the same doctor.
 * 4. Create a DoctorProfile document and save to DB.
 *
 * @param {Object} data
 * @param {string} data.accountId - ID of the doctor account
 * @param {string} data.facultyId - ID of the faculty the doctor belongs to
 * @param {string} data.specialization - Doctor’s area of expertise
 * @param {number} [data.experienceYears] - Number of years of experience
 * @param {string} [data.description] - Doctor’s bio or description
 * @param {string} [data.clinicAddress] - Address where the doctor works
 *
 * @returns {Promise<Object>} Newly created DoctorProfile document
 */
export const createDoctorProfileService = async (data) => {
    try {
        const { accountId, facultyId, specialization, experienceYears, description, clinicAddress } = data;

        // Check if doctor account exists
        const account = await Account.findById(accountId);
        if (!account) throw new Error("Account not found");
        if (account.role !== "doctor") {
            throw new Error("This account is not a doctor");
        }

        // Check if faculty exists
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) throw new Error("Faculty not found");

        // Check if profile already exists
        const existingProfile = await DoctorProfile.findOne({ accountId });
        if (existingProfile) throw new Error("Doctor profile already exists for this account");

        // Create new profile
        const profile = new DoctorProfile({
            accountId,
            facultyId,
            specialization,
            experienceYears,
            description,
            clinicAddress
        });

        await profile.save();
        return { message: "Doctor profile created successfully", profile };
    } catch (error) {
        throw new Error(error.message || "Failed to create doctor profile");
    }
};

/**
 * getDoctorProfileByAccountIdService
 *
 * Finds a doctor profile by the associated Account ID and populates related data.
 * @param {string} accountId - The ID of the Account.
 * @returns {Promise<object>} The found doctor profile with populated account and faculty info.
 * @throws {Error} If the profile is not found.
 */
export const getDoctorProfileByAccountIdService = async (accountId) => {
    try {
        if (!accountId) {
            throw new Error("Account ID is required");
        }

        const profile = await DoctorProfile.findOne({ accountId: accountId })
            // Populate 'accountId' field from Account model, selecting specific fields
            .populate({
                path: 'accountId',
                select: 'fullname email phone datebirth role' // Select fields you want from Account
            })
            // Populate 'facultyId' field from Faculty model, selecting specific fields
            .populate({
                path: 'facultyId',
                select: 'name description location' // Select fields you want from Faculty
            });

        if (!profile) {
            throw new Error("Doctor profile not found for this account ID");
        }

        return profile; // Return the fully populated profile object

    } catch (error) {
        // Re-throw specific or generic error
        throw new Error(error.message || "Failed to fetch doctor profile");
    }
};

/**
 * getAllDoctorProfilesService
 *
 * Retrieves a paginated list of doctor profiles, populating associated account data.
 * @param {number} [page=1] - The current page number.
 * @param {number} [limit=10] - The number of profiles per page.
 * @returns {Promise<object>} An object containing the list of profiles and pagination details.
 * @throws {Error} If database query fails.
 */
export const getAllDoctorProfilesService = async (page = 1, limit = 10) => {
    try {
        // Ensure page and limit are positive integers
        const pageNum = Math.max(1, page);
        const limitNum = Math.max(1, limit);
        const skip = (pageNum - 1) * limitNum;

        // Perform parallel queries for profiles and total count
        const [profiles, total] = await Promise.all([
            DoctorProfile.find() // Find all doctor profiles
                .populate({
                    path: 'accountId', // Populate the linked Account
                    select: 'fullname email phone role' // Select only needed Account fields
                })
                .populate({
                    path: 'facultyId', // Optionally populate faculty too
                    select: 'name'      // Select only faculty name
                })
                .sort({ createdAt: -1 }) // Sort by creation date, newest first
                .skip(skip)               // Apply pagination skip
                .limit(limitNum),         // Apply pagination limit
            DoctorProfile.countDocuments() // Get the total count of profiles
        ]);

        // Calculate total pages
        const totalPages = Math.ceil(total / limitNum);

        // Return the results in a structured format
        return {
            profiles, // The array of profile documents for the current page
            pagination: {
                total,
                totalPages,
                currentPage: pageNum,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
        };

    } catch (error) {
        // Re-throw specific or generic error
        console.error("Error in getAllDoctorProfilesService:", error);
        throw new Error(error.message || "Failed to fetch doctor profiles from service");
    }
};

// Helper function to escape special regex characters
function escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * searchDoctorsService
 *
 * Finds accounts with role 'doctor' matching a search query (fullname OR email)
 * with pagination.
 *
 * @param {string} query - The search term for the doctor's fullname or email.
 * @param {number} [page=1] - Current page number.
 * @param {number} [limit=20] - Results per page.
 * @returns {Promise<object>} Object containing the list of doctors and pagination details.
 * @throws {Error} If the database query fails.
 */
export const searchDoctorsService = async (query, page = 1, limit = 20) => {
    try {
        const pageNum = Math.max(1, page);
        const limitNum = Math.max(1, limit);
        const skip = (pageNum - 1) * limitNum;

        // Escape the query string to handle special characters safely
        const escapedQuery = escapeRegex(query.trim());
        // Create a case-insensitive regex that matches anywhere in the string
        const searchRegex = new RegExp(escapedQuery, 'i');

        // --- MODIFIED CRITERIA ---
        // Use $or to search in multiple fields
        const criteria = {
            role: 'doctor',        // Still only doctors
            $or: [                 // Match if EITHER condition below is true
                { fullname: searchRegex }, // Match fullname
                { email: searchRegex }     // OR Match email
            ]
        };
        // -------------------------

        const [doctors, total] = await Promise.all([
            Account.find(criteria)
                .select('_id fullname email') // Keep selection minimal for dropdown
                .sort({ fullname: 1 })
                .skip(skip)
                .limit(limitNum),
            Account.countDocuments(criteria) // Use the same criteria for counting
        ]);

        const totalPages = Math.ceil(total / limitNum);

        return {
            doctors,
            pagination: {
                total,
                totalPages,
                currentPage: pageNum,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
        };

    } catch (error) {
        console.error("Error in searchDoctorsService:", error);
        throw new Error(error.message || "Failed to search doctors from service");
    }
};

/**
 * updateDoctorProfileService
 *
 * Finds a doctor profile by the associated Account ID and updates specified fields.
 *
 * @param {string} accountId - The ID of the Account associated with the profile.
 * @param {object} updateData - An object containing fields to update (e.g., { specialization, experienceYears, ... }).
 * @returns {Promise<object>} An object containing the success message and the updated profile.
 * @throws {Error} If the profile or related entities (like a new facultyId) are not found, or if validation fails.
 */
export const updateDoctorProfileService = async (accountId, updateData) => {
    try {
        if (!accountId) {
            throw new Error("Account ID is required");
        }

        // Find the profile using the accountId
        const profile = await DoctorProfile.findOne({ accountId: accountId });
        if (!profile) {
            throw new Error("Doctor profile not found for this account ID");
        }

        // --- Optional Validations/Updates ---

        // If facultyId is being updated, verify the new faculty exists
        if (updateData.facultyId && updateData.facultyId !== profile.facultyId.toString()) {
            const facultyExists = await Faculty.findById(updateData.facultyId);
            if (!facultyExists) {
                throw new Error("New Faculty ID not found");
            }
            profile.facultyId = updateData.facultyId;
        }

        // Update other allowed fields directly
        if (updateData.specialization !== undefined) {
            profile.specialization = updateData.specialization;
        }
        if (updateData.experienceYears !== undefined) {
            // Add validation if needed (e.g., ensure it's a non-negative number)
            const years = Number(updateData.experienceYears);
            profile.experienceYears = isNaN(years) || years < 0 ? 0 : years;
        }
        if (updateData.description !== undefined) {
            profile.description = updateData.description;
        }
        if (updateData.clinicAddress !== undefined) {
            profile.clinicAddress = updateData.clinicAddress;
        }

        // Save the updated profile (this will trigger Mongoose schema validations)
        const updatedProfile = await profile.save();

        // Populate the updated profile before returning (optional but good for response)
        await updatedProfile.populate([
            { path: 'accountId', select: 'fullname email phone role' },
            { path: 'facultyId', select: 'name' }
        ]);


        return {
            message: "Doctor profile updated successfully",
            profile: updatedProfile
        };

    } catch (error) {
        // Re-throw specific or generic error
        console.error("Error in updateDoctorProfileService:", error);
        // Handle potential unique constraint errors if schema changed (unlikely here)
        if (error.code === 11000) {
            throw new Error("Update failed due to duplicate value constraint.");
        }
        throw new Error(error.message || "Failed to update doctor profile in service");
    }
};

/**
 * deleteDoctorProfileService
 *
 * Finds and deletes a doctor profile based on the associated Account ID.
 *
 * @param {string} accountId - The ID of the Account associated with the profile to delete.
 * @returns {Promise<object>} An object containing the success message.
 * @throws {Error} If the profile is not found or if the deletion fails.
 */
export const deleteDoctorProfileService = async (accountId) => {
    try {
        if (!accountId) {
            throw new Error("Account ID is required");
        }

        // Find and delete the profile using the accountId
        // findOneAndDelete is suitable here as it returns the deleted document (or null)
        const deletedProfile = await DoctorProfile.findOneAndDelete({ accountId: accountId });

        // Check if a profile was actually found and deleted
        if (!deletedProfile) {
            throw new Error("Doctor profile not found for this account ID");
        }

        // Return success message
        return {
            message: "Doctor profile deleted successfully",
            // You could optionally return deletedProfile._id if needed
        };

    } catch (error) {
        // Re-throw specific or generic error
        console.error("Error in deleteDoctorProfileService:", error);
        throw new Error(error.message || "Failed to delete doctor profile in service");
    }
};