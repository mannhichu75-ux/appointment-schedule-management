import {
    createMedicalRecord,
    getMedicalRecords,
    getMedicalRecordById,
    updateMedicalRecord,
    deleteMedicalRecord,
} from "../services/medicalRecord.service.js";
import mongoose from "mongoose";

/**
 * Controller for MedicalRecord routes.
 *
 * Access control rules enforced here:
 * - create: doctor (or admin) can create. If doctorId omitted, will default to req.user.id (if doctor).
 * - list: admin -> all, doctor -> their records, patient -> their records
 * - get by id: only admin, the related doctor, or the related patient
 * - update: only admin or the doctor associated with the record
 * - delete: admin only
 */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export async function createRecordHandler(req, res) {
    try {
        const payload = { ...req.body };

        // If user is doctor and didn't supply doctorId, set to their id
        if (!payload.doctorId && req.user && req.user.role === "doctor") {
            payload.doctorId = req.user.id;
        }

        // Only doctors or admins can create medical records
        if (req.user.role !== "doctor" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied: only doctors or admins can create records" });
        }

        const created = await createMedicalRecord(payload);
        return res.status(201).json({ data: created });
    } catch (error) {
        console.error("createRecordHandler error:", error);
        return res.status(400).json({ message: error.message || "Failed to create medical record" });
    }
}

export async function listRecordsHandler(req, res) {
    try {
        const { page = 1, limit = 20, sortBy = "visitDate", order = "desc" } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        let filter = {};

        if (req.user.role === "doctor") {
            filter.doctorId = req.user.id;
        } else if (req.user.role === "patient") {
            filter.patientId = req.user.id;
        } // admin sees all

        // optional query filters
        if (req.query.patientId && isValidObjectId(req.query.patientId)) {
            filter.patientId = req.query.patientId;
        }
        if (req.query.doctorId && isValidObjectId(req.query.doctorId)) {
            filter.doctorId = req.query.doctorId;
        }
        if (req.query.fromDate || req.query.toDate) {
            filter.visitDate = {};
            if (req.query.fromDate) filter.visitDate.$gte = new Date(req.query.fromDate);
            if (req.query.toDate) filter.visitDate.$lte = new Date(req.query.toDate);
        }

        const records = await getMedicalRecords(filter, {
            skip,
            limit: Number(limit),
            sort: { [sortBy]: order === "asc" ? 1 : -1 },
        });

        return res.json({ data: records, meta: { page: Number(page), limit: Number(limit) } });
    } catch (error) {
        console.error("listRecordsHandler error:", error);
        return res.status(500).json({ message: "Failed to list medical records" });
    }
}

export async function getRecordHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        const record = await getMedicalRecordById(id);
        if (!record) {
            return res.status(404).json({ message: "Medical record not found" });
        }

        // Authorization: admin OR doctor associated OR patient associated
        if (
            req.user.role !== "admin" &&
            !(req.user.role === "doctor" && String(record.doctorId) === String(req.user.id)) &&
            !(req.user.role === "patient" && String(record.patientId) === String(req.user.id))
        ) {
            return res.status(403).json({ message: "Access denied" });
        }

        return res.json({ data: record });
    } catch (error) {
        console.error("getRecordHandler error:", error);
        return res.status(500).json({ message: "Failed to get medical record" });
    }
}

export async function updateRecordHandler(req, res) {
    try {
        const { id } = req.params;
        const payload = { ...req.body };

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        const existing = await getMedicalRecordById(id);
        if (!existing) {
            return res.status(404).json({ message: "Medical record not found" });
        }

        // Only admin or associated doctor can update
        if (!(req.user.role === "admin" || (req.user.role === "doctor" && String(existing.doctorId) === String(req.user.id)))) {
            return res.status(403).json({ message: "Access denied: only admin or the doctor of this record can update" });
        }

        const updated = await updateMedicalRecord(id, payload);
        return res.json({ data: updated });
    } catch (error) {
        console.error("updateRecordHandler error:", error);
        return res.status(400).json({ message: error.message || "Failed to update medical record" });
    }
}

export async function deleteRecordHandler(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }

        // Only admin can delete
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied: admin only" });
        }

        const existing = await getMedicalRecordById(id);
        if (!existing) {
            return res.status(404).json({ message: "Medical record not found" });
        }

        await deleteMedicalRecord(id);
        return res.json({ message: "Medical record deleted" });
    } catch (error) {
        console.error("deleteRecordHandler error:", error);
        return res.status(500).json({ message: "Failed to delete medical record" });
    }
}