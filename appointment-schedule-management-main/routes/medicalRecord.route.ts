import express from "express";
import {
    createRecordHandler,
    listRecordsHandler,
    getRecordHandler,
    updateRecordHandler,
    deleteRecordHandler,
} from "../controllers/medicalRecord.controller.js";
import { verifyAccessToken, checkDoctorRole } from "../middlewares/token.middleware.js";

const router = express.Router();

/**
 * Routes:
 * POST   /           -> create a medical record (doctor or admin)
 * GET    /           -> list (admin all, doctor their, patient their)
 * GET    /:id        -> get single record (admin/doctor/patient with access)
 * PATCH  /:id        -> update (admin or associated doctor)
 * DELETE /:id        -> delete (admin only)
 */

// create - require authentication and doctor role (or admin)
router.post("/", verifyAccessToken, createRecordHandler);

// list - any authenticated user
router.get("/", verifyAccessToken, listRecordsHandler);

// get by id - any authenticated user (controller enforces ownership/admin)
router.get("/:id", verifyAccessToken, getRecordHandler);

// update - authenticated; controller enforces admin/doctor ownership
router.patch("/:id", verifyAccessToken, updateRecordHandler);

// delete - admin only
router.delete("/:id", verifyAccessToken, deleteRecordHandler);

export default router;