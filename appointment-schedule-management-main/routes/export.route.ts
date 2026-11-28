import express from "express";
import { getRecordHtmlHandler, getRecordPdfHandler } from "../controllers/export.controller.js";
import { verifyAccessToken } from "../middlewares/token.middleware.js";

const router = express.Router();

/**
 * GET /api/v1/medical-records/:id/html  -> rendered HTML (view in browser)
 * GET /api/v1/medical-records/:id/pdf   -> generated PDF (attachment)
 *
 * Ensure verifyAccessToken middleware runs before handlers (done here).
 */

router.get("/:id/html", verifyAccessToken, getRecordHtmlHandler);
router.get("/:id/pdf", verifyAccessToken, getRecordPdfHandler);

export default router;