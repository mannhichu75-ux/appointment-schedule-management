import Faculty from "../schemas/faculty.schema.js"
import doctorProfileSchema from "../schemas/doctorprofile.schema.js"

/**
 * createFacultyService
 *
 * Handles logic for creating a new faculty (medical department).
 *
 * @param {Object} data - Faculty data
 * @param {string} data.name - Name of the faculty (required)
 * @param {string} [data.description] - Optional description of the faculty
 * @param {string} [data.location] - Optional location of the faculty
 *
 * @returns {Object} - JSON object with success message and created faculty info
 * @throws {Error} - Throws if name is missing, already exists, or creation fails
 */
export const createFacultyService = async (data) => {
    try {
        const { name, description, location } = data

        // Validate required field
        if (!name || !name.trim()) {
            throw new Error("Faculty name is required")
        }

        // Check for duplicates
        const existingFaculty = await Faculty.findOne({ name: name.trim() })
        if (existingFaculty) {
            throw new Error("Faculty already exists")
        }

        // Create new faculty
        const newFaculty = new Faculty({
            name: name.trim(),
            description: description?.trim(),
            location: location?.trim()
        })

        await newFaculty.save()

        return {
            message: "Faculty created successfully",
            faculty: newFaculty
        }
    } catch (error) {
        throw new Error(error.message || "Failed to create faculty")
    }
}

/**
 * getFacultiesService
 *
 * Handles fetching faculties with lazy-loading pagination.
 *
 * @param {number} page - Current page number (default: 1)
 * @param {number} limit - Number of faculties per page (default: 10)
 *
 * @returns {Object} - Object containing paginated list of faculties and metadata
 * @throws {Error} - Throws if fetching fails
 */
export const getFacultiesService = async (page = 1, limit = 10) => {
    try {
        const skip = (page - 1) * limit

        const [faculties, total] = await Promise.all([
            Faculty.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
            Faculty.countDocuments(),
        ])

        const totalPages = Math.ceil(total / limit)

        return {
            message: "Faculties fetched successfully",
            faculties,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        }
    } catch (error) {
        throw new Error(error.message || "Failed to fetch faculties")
    }
}

/**
 * updateFacultyService
 *
 * Updates information of an existing faculty in the database.
 *
 * @param {string} facultyId - ID of the faculty to update
 * @param {Object} updateData - Object containing fields to update (e.g. name, description, location)
 *
 * @returns {Object} - Updated faculty document
 * @throws {Error} - Throws error if faculty not found or update fails
 */
export const updateFacultyService = async (facultyId, updateData) => {
    try {
        // Validate ID
        if (!facultyId) {
            throw new Error("Faculty ID is required")
        }

        // Find and update
        const updatedFaculty = await Faculty.findByIdAndUpdate(
            facultyId,
            { $set: updateData },
            { new: true, runValidators: true }
        )

        if (!updatedFaculty) {
            throw new Error("Faculty not found")
        }

        return {
            message: "Faculty updated successfully",
            faculty: updatedFaculty,
        }
    } catch (error) {
        throw new Error(error.message || "Failed to update faculty")
    }
}

/**
 * deleteFacultyService
 *
 * Deletes a faculty from the database based on its ID.
 *
 * @param {string} facultyId - The ID of the faculty to delete.
 *
 * @returns {Object} - An object containing a success message and deleted faculty data.
 * @throws {Error} - Throws an error if the faculty is not found or the deletion fails.
 *
 * @example
 * const result = await deleteFacultyService("6715f3b4f2b38b001f4cba9e")
 * console.log(result)
 * // {
 * //   message: "Faculty deleted successfully",
 * //   faculty: { _id: "6715f3b4f2b38b001f4cba9e", name: "Khoa Nội Tim Mạch", ... }
 * // }
 */
export const deleteFacultyService = async (facultyId) => {
    try {
        if (!facultyId) {
            throw new Error("Faculty ID is required")
        }

        const deletedFaculty = await Faculty.findByIdAndDelete(facultyId)

        if (!deletedFaculty) {
            throw new Error("Faculty not found")
        }

        return {
            message: "Faculty deleted successfully",
            faculty: deletedFaculty,
        }
    } catch (error) {
        throw new Error(error.message || "Failed to delete faculty")
    }
}

/**
 * getDoctorsByFacultyService
 *
 * Service function to retrieve all doctor accounts belonging to a specific faculty.
 *
 * Responsibilities:
 * 1. Validate that the provided facultyId is a valid MongoDB ObjectId.
 * 2. Find all DoctorProfile documents linked to the given facultyId.
 * 3. Populate doctor account information (fullname, email, phone, etc.).
 * 4. Return a combined list of doctor accounts and their profile info.
 *
 * @param {string} facultyId - The MongoDB ObjectId of the faculty.
 *
 * @returns {Promise<Array>} Array of doctor objects, each including:
 * {
 *   _id,
 *   fullname,
 *   email,
 *   phone,
 *   role,
 *   specialization,
 *   experienceYears,
 *   description,
 *   clinicAddress
 * }
 *
 * @throws {Error} Throws if facultyId is invalid or query fails.
 *
 * @example
 * const doctors = await getDoctorsByFacultyService("6712aef91b9c5f001234abcd");
 * console.log(doctors);
 * // → [{ _id, fullname, specialization, ... }, ...]
 */
export const getDoctorsByFacultyService = async (facultyId) => {
    try {
        if (!facultyId || !facultyId.match(/^[0-9a-fA-F]{24}$/)) {
            throw new Error("Invalid faculty ID format")
        }

        const doctorProfiles = await doctorProfileSchema.find({ facultyId })
            .populate({
                path: "accountId",
                match: { role: "doctor" },
                select: "fullname email phone role datebirth",
            })
            .lean()

        const doctors = doctorProfiles
            .filter((p) => p.accountId)
            .map((p) => ({
                ...p.accountId,
                specialization: p.specialization,
                experienceYears: p.experienceYears,
                description: p.description,
                clinicAddress: p.clinicAddress,
            }))

        return doctors
    } catch (error) {
        throw new Error(error.message || "Failed to fetch doctors by faculty")
    }
}

// Helper function to escape special regex characters
function escapeRegex(string) {
    // Trim the string first before escaping
    const trimmedString = string ? string.trim() : '';
    return trimmedString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * searchFacultiesService
 *
 * Finds faculties matching a search query (name) with pagination.
 * Handles special regex characters in the query.
 *
 * @param {string} query - The search term for the faculty name.
 * @param {number} [page=1] - Current page number.
 * @param {number} [limit=15] - Results per page.
 * @returns {Promise<object>} Object containing the list of faculties and pagination details.
 * @throws {Error} If the database query fails.
 */
export const searchFacultiesService = async (query, page = 1, limit = 15) => {
    try {
        const pageNum = Math.max(1, page);
        const limitNum = Math.max(1, limit);
        const skip = (pageNum - 1) * limitNum;

        // --- MODIFIED REGEX ---
        // Escape the query string first
        const escapedQuery = escapeRegex(query);
        // Create a case-insensitive regex
        const searchRegex = new RegExp(escapedQuery, 'i');
        // ----------------------

        // Define the base query criteria
        const criteria = {
            name: searchRegex // Match name using the safe regex
        };

        const [faculties, total] = await Promise.all([
            Faculty.find(criteria)
                .select('_id name')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum),
            Faculty.countDocuments(criteria)
        ]);

        const totalPages = Math.ceil(total / limitNum);

        return {
            faculties,
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
        console.error("Error in searchFacultiesService:", error);
        throw new Error(error.message || "Failed to search faculties from service");
    }
};