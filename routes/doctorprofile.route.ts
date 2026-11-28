import express from "express";
import { 
    createDoctorProfileController,
    getDoctorProfileByAccountIdController,
    getAllDoctorProfilesController,
    searchDoctorsController,
    updateDoctorProfileController,
    deleteDoctorProfileController
} from "../controllers/doctorprofile.controller.js";
import {
    verifyAccessToken,
    checkModeratorRole,
} from '../middlewares/token.middleware.js'

const router = express.Router();

/**
 * DoctorProfile Routes
 *
 * Base URL: /api/v1/doctor-profiles
 */
router.post("/doctor", verifyAccessToken, checkModeratorRole, createDoctorProfileController);
router.get("/doctor/:accountId", verifyAccessToken, getDoctorProfileByAccountIdController);
router.get("/doctor", verifyAccessToken, checkModeratorRole, getAllDoctorProfilesController);
router.get("/doctors/search", verifyAccessToken, checkModeratorRole, searchDoctorsController);
router.put("/doctor/:accountId", verifyAccessToken, checkModeratorRole, updateDoctorProfileController);
router.delete("/doctor/:accountId", verifyAccessToken, checkModeratorRole, deleteDoctorProfileController);

export default router;
