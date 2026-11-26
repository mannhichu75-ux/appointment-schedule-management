import mongoose from "mongoose";

/**
 * DoctorProfile Schema
 *
 * Extended info for accounts with role = "doctor".
 * Each doctor can be linked to exactly one Faculty.
 */
const doctorProfileSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true,
        unique: true
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
        required: true
    },
    specialization: {
        type: String,
        required: true,
    },
    experienceYears: { type: Number, default: 0 },
    description: { type: String },
    clinicAddress: { type: String },
}, { timestamps: true });

export default mongoose.model("DoctorProfile", doctorProfileSchema);
