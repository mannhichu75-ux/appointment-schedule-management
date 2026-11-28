import {
    createScheduleService,
    assignDoctorService,
    getAllSchedulesService,
    getSchedulesByPatientService,
    getSchedulesByDoctorService,
    getMySchedulesService,
    updateMyScheduleService,
    cancelMyScheduleService,
    getScheduleStatsService,
    getPeakAppointmentDateService,
    createMyScheduleService
} from "../services/schedule.service.js";
import Account from "../schemas/account.schema.js";

/**
 * createScheduleController
 *
 * Controller to handle patient schedule registration.
 *
 * Endpoint: POST /api/v1/schedules
 *
 * Request Body:
 * {
 *   "patientId": "string",              // MongoDB ObjectId of the patient
 *   "appointmentDate": "string|Date",   // Desired appointment date/time in ISO format
 *   "illnessDescription": "string"      // Patient's illness description
 * }
 *
 * Response:
 * - 201: Schedule created successfully
 *   { message: "Schedule created successfully" }
 * - 400: Validation error or patient already has a schedule at the same time
 *   { message: "Error description" }
 * - 500: Internal server error
 *   { message: "Internal server error" }
 *
 * Behavior:
 * - Validates required fields.
 * - Calls createScheduleService to handle business logic and DB operations.
 * - Only returns a success message instead of full schedule data.
 *
 * Example Usage:
 * POST /api/v1/schedules
 * Body:
 * {
 *   "patientId": "670f2a8c1b9c5f0012345678",
 *   "appointmentDate": "2025-11-02T09:00:00Z",
 *   "illnessDescription": "Persistent headache"
 * }
 */
export const createScheduleController = async (req, res) => {
    try {
        const { patientId, appointmentDate, illnessDescription } = req.body;

        // Validate required fields
        if (!patientId || !appointmentDate || !illnessDescription) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        try {
            // Attempt to create the schedule
            await createScheduleService(patientId, appointmentDate, illnessDescription);

            return res.status(201).json({ message: "Schedule created successfully" });
        } catch (serviceError) {
            // Handle known service errors (e.g., duplicate schedule, invalid patientId)
            return res.status(400).json({ message: serviceError.message });
        }
    } catch (error) {
        // Unexpected server errors
        console.error("createScheduleController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * assignDoctorController
 *
 * Controller to handle admin assignment of doctor, faculty, and admin notes to a schedule.
 *
 * PUT /api/v1/schedules/:scheduleId/assign
 *
 * Request Body:
 * {
 *   "doctorId": "string",      // MongoDB ObjectId
 *   "facultyId": "string",     // MongoDB ObjectId
 *   "adminNotes": "string"     // Optional notes
 * }
 *
 * Response:
 * - 200: Assignment successful
 *   { message: "Schedule successfully assigned" }
 * - 400: Validation error or business logic error
 *   { message: "Error description" }
 * - 500: Internal server error
 */
export const assignDoctorController = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { doctorId, facultyId, adminNotes } = req.body;

        if (!doctorId || !facultyId) {
            return res.status(400).json({ message: "doctorId and facultyId are required" });
        }

        try {
            const result = await assignDoctorService(scheduleId, doctorId, facultyId, adminNotes);
            return res.status(200).json(result);
        } catch (serviceError) {
            return res.status(400).json({ message: serviceError.message });
        }
    } catch (error) {
        console.error("assignDoctorController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * getAllSchedulesController
 *
 * Handles fetching all appointment schedules with pagination.
 *
 * Query Parameters:
 * - page: optional, current page number (default = 1)
 * - limit: optional, number of schedules per page (default = 10)
 *
 * Response:
 * - 200: Success with paginated schedules
 * - 500: Internal server error
 */
export const getAllSchedulesController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await getAllSchedulesService(page, limit);
        return res.status(200).json(result);
    } catch (error) {
        console.error("getAllSchedulesController error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

/**
 * getSchedulesByPatientController
 *
 * Handles fetching all schedules for a specific patient.
 *
 * Query parameters:
 * - page: optional, default = 1
 * - limit: optional, default = 10
 *
 * Route parameter:
 * - patientId: MongoDB ObjectId of the patient
 *
 * Response:
 * - 200: Success with schedules array
 * - 400: Invalid patient ID
 * - 500: Internal server error
 */
export const getSchedulesByPatientController = async (req, res) => {
    try {
        const { patientId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!patientId) {
            return res.status(400).json({ message: "Patient ID is required" });
        }

        const result = await getSchedulesByPatientService(patientId, page, limit);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

/**
 * getSchedulesByDoctorController
 *
 * Handles fetching all schedules for a specific doctor.
 *
 * Query parameters:
 * - page: optional, default = 1
 * - limit: optional, default = 10
 *
 * Route parameter:
 * - doctorId: MongoDB ObjectId of the doctor
 *
 * Response:
 * - 200: Success with schedules array
 * - 400: Invalid doctor ID
 * - 500: Internal server error
 */
export const getSchedulesByDoctorController = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!doctorId) {
            return res.status(400).json({ message: "Doctor ID is required" });
        }

        const result = await getSchedulesByDoctorService(doctorId, page, limit);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

/**
 * getMySchedulesController
 *
 * Controller to fetch all schedules of the currently logged-in user.
 *
 * GET /api/v1/schedules/my
 *
 * Middleware:
 * - verifyAccessToken required
 *
 * Response:
 * - 200: Array of schedule objects
 * - 500: Internal server error
 */
export const getMySchedulesController = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const schedules = await getMySchedulesService(userId, role);

        return res.status(200).json({ message: "Schedules fetched successfully", schedules });
    } catch (error) {
        console.error("getMySchedulesController error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * updateMyScheduleController
 *
 * Allows a patient to update their own appointment date.
 *
 * PUT /api/v1/schedules/:scheduleId
 *
 * Body:
 * {
 *   "appointmentDate": "2025-11-05T10:00:00Z"
 * }
 *
 * Response:
 * - 200: Appointment date updated successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Internal server error
 */
export const updateMyScheduleController = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { appointmentDate } = req.body;
        const patientId = req.user.id; // from verifyAccessToken middleware

        if (!appointmentDate) {
            return res.status(400).json({ message: "appointmentDate is required" });
        }

        const result = await updateMyScheduleService(scheduleId, patientId, appointmentDate);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

/**
 * cancelMyScheduleController
 *
 * Controller to allow patients to cancel their schedule.
 *
 * DELETE /api/v1/schedules/:id
 *
 * Headers:
 * - Requires valid access token (patient)
 *
 * Response Codes:
 * - 200: Successfully cancelled
 * - 400: Validation or permission error
 * - 404: Schedule not found
 * - 500: Internal server error
 */
export const cancelMyScheduleController = async (req, res) => {
    try {
        const scheduleId = req.params.id;
        const patientId = req.user.id; // lấy từ token đã xác thực

        const result = await cancelMyScheduleService(scheduleId, patientId);

        return res.status(200).json({
            message: "Schedule cancelled successfully",
            schedule: result,
        });
    } catch (error) {
        console.error("cancelMyScheduleController error:", error.message);

        let status = 400;
        if (error.message.includes("not found")) status = 404;
        if (error.message.includes("only cancel your own")) status = 403;

        return res.status(status).json({ message: error.message });
    }
};

/**
 * getScheduleStatsController
 *
 * Controller for retrieving statistics of schedules grouped by status.
 *
 * GET /api/v1/schedules/stats
 *
 * Access: Admin only
 *
 * Response Example:
 * {
 *   "pending": 10,
 *   "assigned": 7,
 *   "completed": 4,
 *   "cancelled": 2
 * }
 */
export const getScheduleStatsController = async (req, res) => {
    try {
        const stats = await getScheduleStatsService();
        return res.status(200).json({
            message: "Schedule statistics retrieved successfully",
            data: stats
        });
    } catch (error) {
        console.error("getScheduleStatsController error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * getPeakAppointmentDateController
 *
 * @route GET /api/v1/schedules/peak-date
 * @desc Get the appointmentDate with the most assigned schedules
 * @access Admin only
 */
export const getPeakAppointmentDateController = async (req, res) => {
    try {
        const data = await getPeakAppointmentDateService();
        return res.status(200).json({
            message: "Peak appointment date retrieved successfully",
            data
        });
    } catch (error) {
        console.error("getPeakAppointmentDateController error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * createScheduleController
 *
 * Handles creating a new schedule for the currently logged-in user (patient).
 * Automatically uses the user's ID from the access token.
 */
export const createMyScheduleController = async (req, res) => {
    try {
        const patientId = req.user.id;
        const { appointmentDate, illnessDescription } = req.body;

        if (!appointmentDate || !illnessDescription) {
            return res.status(400).json({
                message: "Appointment date and illness description are required",
            });
        }

        const newSchedule = await createMyScheduleService(
            patientId,
            appointmentDate,
            illnessDescription
        );

        const patient = await Account.findById(patientId).select("fullname email phone");

        const io = req.app.get("io");
        io.emit("newSchedule", {
            ...newSchedule.toObject(),
            patientId: {
                _id: patient._id,
                fullname: patient.fullname,
                email: patient.email,
                phone: patient.phone,
            },
        });

        return res.status(201).json({
            message: "Schedule created successfully",
            schedule: newSchedule,
        });
    } catch (error) {
        console.error("createMyScheduleController error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
};