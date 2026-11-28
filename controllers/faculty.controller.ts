import {
    createFacultyService,
    getFacultiesService,
    updateFacultyService,
    deleteFacultyService,
    getDoctorsByFacultyService,
    searchFacultiesService
} from "../services/faculty.service.js"

/**
 * createFacultyController
 *
 * Express controller for creating a new faculty (department).
 * Validates input, calls service layer, and handles HTTP responses.
 *
 * @param {Object} req - Express request object containing faculty data in `req.body`
 * @param {Object} res - Express response object
 *
 * @route POST /api/v1/faculties
 * @access Admin (recommended, can be restricted later)
 *
 * @example
 * Request body:
 * {
 *   "name": "Răng Hàm Mặt",
 *   "description": "Chuyên điều trị răng miệng và hàm mặt.",
 *   "location": "Tầng 3, Bệnh viện Trung Ương"
 * }
 *
 * Response:
 * {
 *   "message": "Faculty created successfully",
 *   "faculty": { ... }
 * }
 */
export const createFacultyController = async (req, res) => {
    try {
        const { name, description, location } = req.body

        // Basic validation
        if (!name) {
            return res.status(400).json({ message: "Faculty name is required" })
        }

        const result = await createFacultyService({ name, description, location })

        if (!result) {
            return res.status(400).json({ "message": "Create Faculty Failed" })
        }
        return res.status(201).json({ "message": "Create Faculty Successfully" })
    } catch (error) {
        console.error("createFacultyController error:", error)
        return res.status(500).json({ message: error.message })
    }
}

/**
 * getFacultiesController
 *
 * Express controller for fetching paginated faculties (lazy loading).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @route GET /api/v1/faculties?page=1&limit=10
 * @access Public
 *
 * @example
 * GET /api/v1/faculties?page=2&limit=5
 *
 * Response:
 * {
 *   "message": "Faculties fetched successfully",
 *   "faculties": [ ... ],
 *   "pagination": {
 *     "total": 25,
 *     "totalPages": 5,
 *     "currentPage": 2,
 *     "limit": 5,
 *     "hasNextPage": true,
 *     "hasPrevPage": true
 *   }
 * }
 */
export const getFacultiesController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10

        const result = await getFacultiesService(page, limit)

        if (!result) {
            return res.status(400).json("Error in fetching Faculty Data")
        }

        return res.status(200).json(result)
    } catch (error) {
        console.error("getFacultiesController error:", error)
        return res.status(500).json({ message: error.message })
    }
}

/**
 * updateFacultyController
 *
 * Express controller for updating a faculty's information by ID.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 *
 * @route PUT /api/v1/faculties/:id
 * @access Admin (or authorized user)
 *
 * @example
 * PUT /api/v1/faculties/6715f3b4f2b38b001f4cba9e
 * {
 *   "name": "Khoa Nội Tim Mạch",
 *   "description": "Chuyên điều trị các bệnh lý về tim mạch",
 *   "location": "Tầng 5"
 * }
 *
 * Response:
 * {
 *   "message": "Faculty updated successfully",
 *   "faculty": {
 *     "_id": "6715f3b4f2b38b001f4cba9e",
 *     "name": "Khoa Nội Tim Mạch",
 *     "description": "Chuyên điều trị các bệnh lý về tim mạch",
 *     "location": "Tầng 5",
 *     "updatedAt": "2025-10-20T02:30:00.000Z"
 *   }
 * }
 */
export const updateFacultyController = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        const result = await updateFacultyService(id, updateData)
        return res.status(200).json({ "message": "Updated Successfully" })
    } catch (error) {
        console.error("updateFacultyController error:", error)
        return res.status(500).json({ message: error.message })
    }
}

/**
 * deleteFacultyController
 *
 * Handles the deletion of a faculty record from the database.
 *
 * @route DELETE /api/v1/faculties/:id
 * @access Admin (or authorized user)
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 *
 * @example
 * DELETE /api/v1/faculties/6715f3b4f2b38b001f4cba9e
 *
 * Response:
 * {
 *   "message": "Faculty deleted successfully",
 *   }
 * }
 */
export const deleteFacultyController = async (req, res) => {
    try {
        const { id } = req.params

        const result = await deleteFacultyService(id)
        return res.status(200).json({ "message": "Faculty deleted successfully" })
    } catch (error) {
        console.error("deleteFacultyController error:", error)
        return res.status(500).json({ message: error.message })
    }
}

/**
 * getDoctorsByFacultyController
 *
 * Controller function for retrieving all doctors under a specific faculty.
 *
 * Endpoint: GET /api/v1/doctors/faculty/:facultyId
 *
 * Request Params:
 * - facultyId: Faculty ObjectId string.
 *
 * Response:
 * - 200 OK: Returns list of doctors with their profile and account info.
 * - 400 Bad Request: Invalid facultyId.
 * - 500 Internal Server Error: Database or query failure.
 */
export const getDoctorsByFacultyController = async (req, res) => {
    try {
        const { facultyId } = req.params
        const doctors = await getDoctorsByFacultyService(facultyId)
        return res.status(200).json(doctors)
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

/**
 * searchFacultiesController
 *
 * Handles searching for faculties based on a query string (name).
 * Expects query parameters: `q` (search term), `page`, `limit`.
 */
export const searchFacultiesController = async (req, res) => {
    try {
        const { q, page, limit } = req.query;

        // Basic validation
        if (!q) {
            return res.status(400).json({ message: "Search query 'q' is required" });
        }

        // Parse pagination, provide defaults
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 15; // Default limit for faculty search

        // Call the service function
        const result = await searchFacultiesService(q, pageNum, limitNum);

        // Service returns { faculties: [...], pagination: {...} }
        return res.status(200).json({
            message: "Faculties searched successfully",
            ...result // Spread faculties and pagination
        });

    } catch (error) {
        console.error("searchFacultiesController error:", error);
        return res.status(500).json({ message: error.message || "Failed to search faculties" });
    }
};