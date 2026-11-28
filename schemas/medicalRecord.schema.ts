import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    diagnosis: { type: String, required: true },
    treatment: { type: String, required: true },
    prescriptions: { type: String, required: true },
    visitDate: { type: Date, required: true },
    notes: { type: String }
})

export default mongoose.model('MedicalRecord', medicalRecordSchema);