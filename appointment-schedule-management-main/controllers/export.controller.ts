import path from "path";
import { renderRecordHtml, generateRecordPdf } from "../services/export.service.js";
import { getMedicalRecordById } from "../services/medicalRecord.service.js";
import Account from "../schemas/account.schema.js";

/**
 * export.controller.js
 *
 * Now prefers doctorName/patientName passed from the client (req.query).
 * If not provided, falls back to account fullname or id.
 */

const TEMPLATE_PATH = path.resolve(process.cwd(), "templates", "prescriptions.html");

function checkAuthorizationForRecord(reqUser, record) {
    if (!reqUser) return false;
    if (reqUser.role === "admin") return true;
    if (reqUser.role === "doctor" && String(record.doctorId) === String(reqUser.id)) return true;
    if (reqUser.role === "patient" && String(record.patientId) === String(reqUser.id)) return true;
    return false;
}

export async function getRecordHtmlHandler(req, res) {
    try {
        const { id } = req.params;
        const record = await getMedicalRecordById(id);
        if (!record) return res.status(404).json({ message: "Medical record not found" });

        if (!checkAuthorizationForRecord(req.user, record)) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Fetch doctor and patient for display names (fallback)
        const [doctorAcct, patientAcct] = await Promise.all([
            Account.findById(record.doctorId).lean(),
            Account.findById(record.patientId).lean(),
        ]);

        const lookup = {};
        if (doctorAcct) lookup[String(doctorAcct._id)] = doctorAcct.fullname || doctorAcct.email || "";
        if (patientAcct) lookup[String(patientAcct._id)] = patientAcct.fullname || patientAcct.email || "";

        const hospitalLogo = process.env.HOSPITAL_LOGO_URL || `${req.protocol}://${req.get("host")}/static/logo.png`;
        const hospitalName = process.env.HOSPITAL_NAME || "QTECH MED";
        const hospitalAddress = process.env.HOSPITAL_ADDRESS || "";

        // Prefer names passed from client via query params
        const qDoctorName = req.query?.doctorName ? String(req.query.doctorName).trim() : "";
        const qPatientName = req.query?.patientName ? String(req.query.patientName).trim() : "";

        const doctorName = qDoctorName || doctorAcct?.fullname || String(record.doctorId ?? "-");
        const patientName = qPatientName || patientAcct?.fullname || String(record.patientId ?? "-");

        const html = renderRecordHtml({
            record,
            lookupMap: lookup,
            options: {
                templatePath: TEMPLATE_PATH,
                hospitalLogo,
                hospitalName,
                hospitalAddress,
                doctorName,
                patientName,
                now: new Date(),
            },
        });

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
    } catch (err) {
        console.error("getRecordHtmlHandler error:", err);
        return res.status(500).json({ message: "Failed to render medical record HTML" });
    }
}

export async function getRecordPdfHandler(req, res) {
    try {
        const { id } = req.params;
        const record = await getMedicalRecordById(id);
        if (!record) return res.status(404).json({ message: "Medical record not found" });

        if (!checkAuthorizationForRecord(req.user, record)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const [doctorAcct, patientAcct] = await Promise.all([
            Account.findById(record.doctorId).lean(),
            Account.findById(record.patientId).lean(),
        ]);

        const lookup = {};
        if (doctorAcct) lookup[String(doctorAcct._id)] = doctorAcct.fullname || doctorAcct.email || "";
        if (patientAcct) lookup[String(patientAcct._id)] = patientAcct.fullname || patientAcct.email || "";

        const hospitalLogo = process.env.HOSPITAL_LOGO_URL || `${req.protocol}://${req.get("host")}/static/logo.png`;
        const hospitalName = process.env.HOSPITAL_NAME || "QTECH MED";
        const hospitalAddress = process.env.HOSPITAL_ADDRESS || "";

        // Prefer names passed from client via query params
        const qDoctorName = req.query?.doctorName ? String(req.query.doctorName).trim() : "";
        const qPatientName = req.query?.patientName ? String(req.query.patientName).trim() : "";

        const doctorName = qDoctorName || doctorAcct?.fullname || String(record.doctorId ?? "-");
        const patientName = qPatientName || patientAcct?.fullname || String(record.patientId ?? "-");

        const pdfBuffer = await generateRecordPdf({
            record,
            lookupMap: lookup,
            options: {
                templatePath: TEMPLATE_PATH,
                hospitalLogo,
                hospitalName,
                hospitalAddress,
                doctorName,
                patientName,
                now: new Date(),
                puppeteerArgs: process.env.PUPPETEER_ARGS ? JSON.parse(process.env.PUPPETEER_ARGS) : undefined,
                puppeteerExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            },
        });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="medical-record-${record._id}.pdf"`,
            "Content-Length": pdfBuffer.length,
        });
        return res.send(pdfBuffer);
    } catch (err) {
        console.error("getRecordPdfHandler error:", err);
        return res.status(500).json({ message: "Failed to generate PDF" });
    }
}