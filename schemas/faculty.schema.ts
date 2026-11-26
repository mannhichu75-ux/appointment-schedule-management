import mongoose from "mongoose";

/**
 * Faculty Schema
 *
 * Represents a medical department or faculty that doctors can belong to.
 * Each faculty can have multiple doctors (referenced in DoctorProfile).
 *
 * Fields:
 * @property {String} name           - Faculty name (required, unique)
 * @property {String} description    - Brief description about the department
 * @property {String} location       - Physical location of the department (optional)
 *
 * Usage example:
 * const faculty = new Faculty({
 *   name: "Răng Hàm Mặt",
 *   description: "Chuyên điều trị các bệnh lý răng miệng và hàm mặt.",
 *   location: "Tầng 3, Bệnh viện Trung Ương"
 * });
 * await faculty.save();
 *
 * Then link doctors to this faculty via DoctorProfile.facultyId.
 */
const facultySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  location: { type: String },
}, { timestamps: true });

export default mongoose.model("Faculty", facultySchema);
