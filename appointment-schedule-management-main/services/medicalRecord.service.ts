import mongoose from "mongoose";
import MedicalRecord from "../schemas/medicalRecord.schema.js";
import Account from "../schemas/account.schema.js";

/**
 * Service layer for MedicalRecord CRUD operations
 */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate that doctorId corresponds to an Account with role 'doctor'
 * and patientId corresponds to Account with role 'patient'.
 * Throws an Error with message if invalid.
 */
async function validateDoctorAndPatient(doctorId, patientId) {
    if (!isValidObjectId(doctorId)) {
        throw new Error("Invalid doctorId");
    }
    if (!isValidObjectId(patientId)) {
        throw new Error("Invalid patientId");
    }

    const [doctor, patient] = await Promise.all([
        Account.findById(doctorId).lean(),
        Account.findById(patientId).lean(),
    ]);

    if (!doctor) {
        throw new Error("Doctor account not found");
    }
    if (doctor.role !== "doctor") {
        throw new Error("doctorId does not belong to an account with role 'doctor'");
    }

    if (!patient) {
        throw new Error("Patient account not found");
    }
    if (patient.role !== "user") {
        throw new Error("patientId does not belong to an account with role 'patient'");
    }

    return { doctor, patient };
}

export async function createMedicalRecord(payload) {
    const { doctorId, patientId } = payload;

    await validateDoctorAndPatient(doctorId, patientId);

    const record = new MedicalRecord(payload);
    return record.save();
}

export async function getMedicalRecords(filter = {}, options = {}) {
    // options: { skip, limit, sort, populate }
    const query = MedicalRecord.find(filter);

    if (options.populate) {
        query.populate(options.populate);
    }

    if (options.sort) {
        query.sort(options.sort);
    }

    if (typeof options.skip === "number") {
        query.skip(options.skip);
    }
    if (typeof options.limit === "number") {
        query.limit(options.limit);
    }

    return query.lean();
}

export async function getMedicalRecordById(id) {
    if (!isValidObjectId(id)) return null;
    return MedicalRecord.findById(id).lean();
}

export async function updateMedicalRecord(id, updatePayload) {
    if (!isValidObjectId(id)) {
        throw new Error("Invalid medical record id");
    }

    if (updatePayload.doctorId || updatePayload.patientId) {
        // validate new associations if provided
        const doctorId = updatePayload.doctorId || undefined;
        const patientId = updatePayload.patientId || undefined;
        if (doctorId && patientId) {
            await validateDoctorAndPatient(doctorId, patientId);
        } else if (doctorId) {
            const doctor = await Account.findById(doctorId).lean();
            if (!doctor || doctor.role !== "doctor") {
                throw new Error("doctorId does not belong to an account with role 'doctor'");
            }
        } else if (patientId) {
            const patient = await Account.findById(patientId).lean();
            if (!patient || patient.role !== "patient") {
                throw new Error("patientId does not belong to an account with role 'patient'");
            }
        }
    }

    const now = new Date();
    const res = await MedicalRecord.findByIdAndUpdate(
        id,
        { ...updatePayload, updatedAt: now.toISOString ? now.toISOString() : now },
        { new: true }
    ).lean();

    return res;
}

export async function deleteMedicalRecord(id) {
    if (!isValidObjectId(id)) {
        throw new Error("Invalid medical record id");
    }
    return MedicalRecord.findByIdAndDelete(id).lean();
}