import express from "express"
import {
    createScheduleController,
    assignDoctorController,
    getAllSchedulesController,
    getSchedulesByPatientController,
    getSchedulesByDoctorController,
    getMySchedulesController,
    updateMyScheduleController,
    cancelMyScheduleController,
    getScheduleStatsController,
    getPeakAppointmentDateController,
    createMyScheduleController
} from "../controllers/schedule.controller.js"

import {
    verifyAccessToken,
    checkModeratorRole,
    checkAdminRole
} from '../middlewares/token.middleware.js'

const router = express.Router()

/**
 * Paitient create a schedule by them own.
 * POST /api/v1/schedule/
 */
router.post("/", verifyAccessToken, createScheduleController)
/**
 * Admin assigns doctor & faculty to a schedule
 * PUT /api/v1/schedules/:scheduleId/assign
 */
router.put("/:scheduleId/assign", verifyAccessToken, checkAdminRole, assignDoctorController);
/**
 * GET /api/v1/schedules
 * Fetch all schedules with optional pagination
 * Query params:
 *   - page: number
 *   - limit: number
 */
router.get("/", verifyAccessToken, checkModeratorRole, getAllSchedulesController);
/**
 * GET /api/v1/schedules/patient/:patientId
 * Fetch all schedules of a specific patient
 * Query params:
 *   - page: number (optional)
 *   - limit: number (optional)
 */
router.get("/patient/:patientId", getSchedulesByPatientController);
/**
 * GET /api/v1/schedules/doctor/:doctorId
 * Fetch all schedules of a specific doctor
 * Query params:
 *   - page: number (optional)
 *   - limit: number (optional)
 */
router.get("/doctor/:doctorId", verifyAccessToken, checkModeratorRole, getSchedulesByDoctorController);
/**
 * GET /api/v1/schedules/my
 * - Returns all schedules of the currently logged-in user
 * - Requires valid access token
 */
router.get("/my", verifyAccessToken, getMySchedulesController);
/**
 * PUT /api/v1/schedules/:scheduleId
 * - Patient can update their own appointment date
 * - Requires valid access token
 * - Only patients can access
 */
router.put("/:scheduleId", verifyAccessToken, updateMyScheduleController);
/**
 * @route DELETE /api/v1/schedules/:id
 * @desc Cancel a patient’s schedule (mark as cancelled)
 * @access Patient only
 */
router.delete("/:id/my", verifyAccessToken, cancelMyScheduleController);
/**
 * @route GET /api/v1/schedules/stats
 * @desc Get statistics of schedules grouped by status
 * @access Admin only
 */
router.get("/stats", verifyAccessToken, checkAdminRole, getScheduleStatsController);
/**
 * @route GET /api/v1/schedules/peak-date
 * @desc Get the appointmentDate with the most assigned schedules
 * @access Admin only
 */
router.get("/peak-date", verifyAccessToken, checkAdminRole, getPeakAppointmentDateController);
/**
 * @route POST /api/v1/schedules/my
 * @desc Create a schedule for the logged-in patient
 * @access Patient only
 */
router.post("/my", verifyAccessToken, createMyScheduleController);

export default router
