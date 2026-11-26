import mongoose from "mongoose"

/**
 * Schedule Schema
 *
 * Represents an appointment schedule between a patient and (optionally) a doctor.
 *
 * Business Logic:
 * - Initially, only the patient's account is required when creating a schedule.
 * - The doctor account is left empty at first and later assigned by an admin
 *   after reviewing the patient's illness description and faculty.
 * 
 * Key Relationships:
 * - `patientId`: References the Account document of the patient.
 * - `doctorId`: References the Account document of the doctor (optional, assigned later).
 * - `facultyId`: References the Faculty related to the patient’s medical concern.
 * 
 * Required Fields at Creation:
 * - `patientId`, `facultyId`, `appointmentDate`, `illnessDescription`
 *
 * Automatic Timestamps:
 * - `createdAt` and `updatedAt` are automatically maintained by Mongoose.
 *
 * Example:
 * ```json
 * {
 *   "patientId": "670f2a8c1b9c5f0012345678",
 *   "facultyId": "67101d9d1c23b10012876543",
 *   "appointmentDate": "2025-11-02T09:00:00Z",
 *   "illnessDescription": "Persistent chest pain for 3 days",
 *   "doctorId": null
 * }
 * ```
 */
const scheduleSchema = new mongoose.Schema(
  {
    // Reference to the patient account (required)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    // Doctor assigned to the appointment (optional at creation)
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },

    // Faculty related to this appointment (e.g., Cardiology, Neurology)
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    // Scheduled date for the appointment
    appointmentDate: {
      type: Date,
      required: true,
    },

    // Description of the patient’s illness or reason for visit
    illnessDescription: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional notes or admin remarks about scheduling decisions
    adminNotes: {
      type: String,
      default: "",
    },

    // Current status of the appointment
    status: {
      type: String,
      enum: ["pending", "assigned", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
)

export default mongoose.model("Schedule", scheduleSchema)
