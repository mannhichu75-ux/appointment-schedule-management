import express from "express"
import { 
    createFacultyController,
    getFacultiesController,
    updateFacultyController,
    deleteFacultyController,
    getDoctorsByFacultyController,
    searchFacultiesController
 } from "../controllers/faculty.controller.js"

import {
    verifyAccessToken,
    checkModeratorRole,
} from '../middlewares/token.middleware.js'

const router = express.Router()

/**
 * Faculty Routes
 *
 * Base URL: /api/v1/faculties
 */

// Create a new faculty
router.post("/", verifyAccessToken, checkModeratorRole, createFacultyController)
// Get all faculties (with pagination)
router.get("/", verifyAccessToken, checkModeratorRole, getFacultiesController)
// Update a faculty by ID
router.put("/:id", verifyAccessToken, checkModeratorRole, updateFacultyController)
// Delete a faculty by ID
router.delete("/:id", verifyAccessToken, checkModeratorRole, deleteFacultyController)
// GET all doctors belonging to a specific faculty
router.get("/doctor/:facultyId", getDoctorsByFacultyController)
// GET /api/v1/faculty/search?q=...&page=...&limit=...
router.get("/search", verifyAccessToken, checkModeratorRole, searchFacultiesController);

export default router
