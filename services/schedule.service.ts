import Schedule from "../schemas/schedule.schema.js";
import mongoose from "mongoose";

/**
 * createScheduleService
 *
 * Service function to allow a patient to create an appointment schedule.
 * 
 * Business Rules:
 * 1. Checks that the patient does not already have a schedule at the same date/time.
 * 2. Faculty and doctor are initially set to null; they will be assigned later by an admin.
 * 3. Validates patientId, appointmentDate, and illnessDescription.
 *
 * @async
 * @param {string} patientId - MongoDB ObjectId of the patient creating the schedule.
 * @param {Date|string} appointmentDate - Desired date/time for the appointment.
 * @param {string} illnessDescription - Description of the patient's illness or reason for visit.
 *
 * @returns {Promise<Object>} Returns the newly created Schedule document.
 *
 * @throws {Error} Throws an error in the following cases:
 *   - If `patientId` is missing or invalid.
 *   - If `appointmentDate` or `illnessDescription` is missing.
 *   - If the patient already has a schedule at the same date/time.
 *   - If saving to the database fails for any reason.
 *
 * @example
 * try {
 *   const schedule = await createScheduleService(
 *     "670f2a8c1b9c5f0012345678",
 *     "2025-11-02T09:00:00Z",
 *     "Persistent headache for 3 days"
 *   );
 *   console.log(schedule);
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
export const createScheduleService = async (patientId, appointmentDate, illnessDescription) => {
  try {
    // Validate patientId
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      throw new Error("Invalid or missing patient ID");
    }

    // Validate appointmentDate
    if (!appointmentDate) {
      throw new Error("Appointment date is required");
    }
    const appointment = new Date(appointmentDate);
    if (isNaN(appointment.getTime())) {
      throw new Error("Invalid appointment date format");
    }

    // Validate illnessDescription
    if (!illnessDescription || illnessDescription.trim().length === 0) {
      throw new Error("Illness description is required");
    }

    // Check for existing schedule for the same patient at the same datetime
    const existingSchedule = await Schedule.findOne({
      patientId,
      appointmentDate: appointment,
    });

    if (existingSchedule) {
      throw new Error("You already have a schedule at this date/time");
    }

    // Create new schedule
    const newSchedule = new Schedule({
      patientId,
      appointmentDate: appointment,
      illnessDescription: illnessDescription.trim(),
      doctorId: null,
      facultyId: null,
      status: "pending",
    });

    await newSchedule.save();

    return newSchedule;
  } catch (error) {
    // Wrap unexpected errors
    throw new Error(error.message || "Failed to create schedule");
  }
};

/**
 * assignDoctorService
 *
 * Assigns a doctor and faculty to a schedule and updates its status.
 *
 * Business Rules:
 * - Only schedules in "pending" status can be assigned.
 * - doctorId and facultyId must be valid MongoDB ObjectIds.
 * - adminNotes is optional.
 * - After assignment, status is updated to "assigned".
 *
 * @param {string} scheduleId - MongoDB ObjectId of the schedule to update
 * @param {string} doctorId - MongoDB ObjectId of the doctor
 * @param {string} facultyId - MongoDB ObjectId of the faculty
 * @param {string} [adminNotes] - Optional notes from admin
 *
 * @returns {Promise<Object>} - { message: "Schedule successfully assigned" }
 * @throws {Error} - Throws if schedule not found, invalid IDs, or status not pending
 *
 * Example:
 * await assignDoctorService(
 *   "670f2a8c1b9c5f0012345678",
 *   "67101d9d1c23b10012876543",
 *   "67101d9d1c23b10012876544",
 *   "Patient has urgent condition"
 * )
 */
export const assignDoctorService = async (scheduleId, doctorId, facultyId, adminNotes = "") => {
  try {
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      throw new Error("Invalid schedule ID");
    }
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new Error("Invalid doctor ID");
    }
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      throw new Error("Invalid faculty ID");
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.status !== "pending") {
      throw new Error("Only pending schedules can be assigned");
    }

    schedule.doctorId = doctorId;
    schedule.facultyId = facultyId;
    schedule.adminNotes = adminNotes;
    schedule.status = "assigned";

    await schedule.save();

    return { message: "Schedule successfully assigned" };
  } catch (error) {
    throw new Error(error.message || "Failed to assign doctor to schedule");
  }
};

/**
 * getAllSchedulesService
 *
 * Fetch all appointment schedules from the system with pagination.
 *
 * @param {number} page - Current page number (1-based). Default = 1.
 * @param {number} limit - Number of schedules per page. Default = 10.
 *
 * @returns {Promise<Object>} - Object containing:
 *   - schedules: Array of schedule documents
 *   - total: Total number of schedules
 *   - page: Current page number
 *   - totalPages: Total number of pages
 *
 * @throws {Error} - Throws if fetching schedules fails.
 *
 * Example:
 * const result = await getAllSchedulesService(1, 20);
 * // result => { schedules: [...], total: 42, page: 1, totalPages: 3 }
 */
export const getAllSchedulesService = async (page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      Schedule.find()
        .sort({ appointmentDate: 1 }) // sort by upcoming date
        .skip(skip)
        .limit(limit)
        .populate("patientId", "fullname email phone") // populate basic patient info
        .populate("doctorId", "fullname email") // populate doctor info if assigned
        .populate("facultyId", "name"), // populate faculty name
      Schedule.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { schedules, total, page, totalPages };
  } catch (error) {
    throw new Error(error.message || "Failed to fetch schedules");
  }
};

/**
 * getSchedulesByPatientService
 *
 * Fetch all appointment schedules for a specific patient with pagination.
 *
 * @param {string} patientId - MongoDB ObjectId of the patient
 * @param {number} page - Current page number (1-based). Default = 1
 * @param {number} limit - Number of schedules per page. Default = 10
 *
 * @returns {Promise<Object>} - Object containing:
 *   - schedules: Array of schedule documents
 *   - total: Total number of schedules for this patient
 *   - page: Current page number
 *   - totalPages: Total number of pages
 *
 * @throws {Error} - Throws if patientId invalid or fetching fails
 */
export const getSchedulesByPatientService = async (patientId, page = 1, limit = 10) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new Error("Invalid patient ID");
    }

    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      Schedule.find({ patientId })
        .sort({ appointmentDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate("doctorId", "fullname email")
        .populate("facultyId", "name"),
      Schedule.countDocuments({ patientId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { schedules, total, page, totalPages };
  } catch (error) {
    throw new Error(error.message || "Failed to fetch patient schedules");
  }
};

/**
 * getSchedulesByDoctorService
 *
 * Fetch all appointment schedules assigned to a specific doctor with pagination.
 *
 * @param {string} doctorId - MongoDB ObjectId of the doctor
 * @param {number} page - Current page number (1-based). Default = 1
 * @param {number} limit - Number of schedules per page. Default = 10
 *
 * @returns {Promise<Object>} - Object containing:
 *   - schedules: Array of schedule documents
 *   - total: Total number of schedules for this doctor
 *   - page: Current page number
 *   - totalPages: Total number of pages
 *
 * @throws {Error} - Throws if doctorId invalid or fetching fails
 */
export const getSchedulesByDoctorService = async (doctorId, page = 1, limit = 10) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new Error("Invalid doctor ID");
    }

    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      Schedule.find({ doctorId })
        .sort({ appointmentDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate("patientId", "fullname email")
        .populate("facultyId", "name"),
      Schedule.countDocuments({ doctorId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return { schedules, total, page, totalPages };
  } catch (error) {
    throw new Error(error.message || "Failed to fetch doctor schedules");
  }
};

/**
 * getMySchedulesService
 *
 * Fetches all schedules for the current user based on their role.
 *
 * Business Logic:
 * - If role is "doctor", fetch schedules where doctorId = user id
 * - If role is "user" (patient), fetch schedules where patientId = user id
 *
 * @param {string} userId - MongoDB ObjectId of the current user
 * @param {string} role - Role of the current user ("doctor" or "user")
 *
 * @returns {Promise<Array>} - Array of schedule documents
 * @throws {Error} - Throws if fetching schedules fails
 */
export const getMySchedulesService = async (userId, role) => {
  try {
    const query = role === "doctor"
      ? { doctorId: userId }
      : { patientId: userId };

    const schedules = await Schedule.find(query)
      .populate("patientId", "fullname email phone")
      .populate("doctorId", "fullname email")
      .populate("facultyId", "name")
      .sort({ appointmentDate: 1 });

    return schedules;
  } catch (error) {
    throw new Error(error.message || "Failed to fetch schedules");
  }
};

/**
 * updateMyScheduleService
 *
 * Allows a patient to update the appointmentDate of their own schedule.
 *
 * Business Rules:
 * - Only patients can update their own schedule.
 * - Only appointmentDate can be updated.
 * - The current date must be at least 2 days before the existing appointmentDate.
 * - Cannot set the new appointmentDate to a datetime that already exists for this patient.
 *
 * @param {string} scheduleId - MongoDB ObjectId of the schedule
 * @param {string} patientId - MongoDB ObjectId of the patient
 * @param {Date} newAppointmentDate - Desired new appointment datetime
 *
 * @returns {Promise<Object>} - Updated schedule object
 * @throws {Error} - Throws if validation fails
 */
export const updateMyScheduleService = async (scheduleId, patientId, newAppointmentDate) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      throw new Error("Invalid schedule ID");
    }

    if (!newAppointmentDate) {
      throw new Error("New appointmentDate is required");
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    // Ensure the schedule belongs to the patient
    if (schedule.patientId.toString() !== patientId) {
      throw new Error("You can only modify your own schedules");
    }

    const now = new Date();
    const minChangeDate = new Date(schedule.appointmentDate);
    minChangeDate.setDate(minChangeDate.getDate() - 2);

    if (now > minChangeDate) {
      throw new Error("You can only change the appointment at least 2 days in advance");
    }

    // Check if patient already has a schedule at the new datetime
    const existing = await Schedule.findOne({
      patientId,
      appointmentDate: new Date(newAppointmentDate),
      _id: { $ne: scheduleId },
    });

    if (existing) {
      throw new Error("You already have another schedule at this date/time");
    }

    schedule.appointmentDate = new Date(newAppointmentDate);
    await schedule.save();

    return { message: "Appointment date updated successfully" };
  } catch (error) {
    throw new Error(error.message || "Failed to update schedule");
  }
};

/**
 * cancelMyScheduleService
 *
 * Allows a patient to cancel (mark as cancelled) their own schedule.
 *
 * Business Rules:
 * - Only the patient who created the schedule can cancel it.
 * - The appointment must be at least 1 day in the future.
 * - Instead of deleting, the schedule’s `status` is updated to "cancelled".
 *
 * @param {string} scheduleId - The ID of the schedule to cancel
 * @param {string} patientId - The ID of the patient requesting the cancellation
 * @returns {Promise<Object>} - Message confirming cancellation
 * @throws {Error} - Throws if validation fails or schedule not found
 */
export const cancelMyScheduleService = async (scheduleId, patientId) => {
  try {
    // console.log("=== CANCEL DEBUG ===");
    // console.log("scheduleId:", scheduleId);
    // console.log("patientId:", patientId);

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      throw new Error("Invalid schedule ID");
    }

    // Find schedule and populate patient info
    const schedule = await Schedule.findById(scheduleId).populate("patientId", "_id fullname");
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    // Convert both IDs to plain string for accurate comparison
    const schedulePatientId = schedule.patientId?._id?.toString() || schedule.patientId.toString();
    const requesterId = String(patientId)
      .replace(/^new ObjectId\(['"]?|['"]?\)$/g, "")
      .trim();

    // console.log("schedulePatientId:", schedulePatientId);
    // console.log("schedulePatientId type:", typeof schedulePatientId);
    // console.log("requesterId:", requesterId);
    // console.log("requesterId type:", typeof requesterId);

    // Ensure the requester owns the schedule
    if (schedulePatientId !== requesterId) {
      throw new Error("You can only cancel your own schedules");
    }

    // Check 24-hour cancellation rule
    const now = new Date();
    const appointmentDate = new Date(schedule.appointmentDate);
    const diffInHours = (appointmentDate - now) / (1000 * 60 * 60);
    console.log("diffInHours:", diffInHours);

    if (diffInHours < 24) {
      throw new Error("You can only cancel appointments at least 1 day in advance");
    }

    // Prevent re-cancellation
    if (schedule.status === "cancelled") {
      throw new Error("This schedule has already been cancelled");
    }

    // Update status instead of deleting
    schedule.status = "cancelled";
    await schedule.save();

    console.log("Schedule cancelled:", schedule._id);
    return schedule;
  } catch (error) {
    console.error("cancelMyScheduleService error:", error.message);
    throw new Error(error.message || "Failed to cancel schedule");
  }
};

/**
 * getScheduleStatsService
 *
 * Aggregates and returns statistics of schedules grouped by their status.
 *
 * Business Rules:
 * - Admins can use this service to view overall system statistics.
 * - Returns all statuses, even if count = 0.
 *
 * @returns {Promise<Object>} - An object containing counts for each schedule status
 * @throws {Error} - Throws if database aggregation fails
 *
 * Example Response:
 * {
 *   "pending": 12,
 *   "assigned": 8,
 *   "completed": 5,
 *   "cancelled": 3
 * }
 */
export const getScheduleStatsService = async () => {
  try {
    const results = await Schedule.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation result to a map
    const counts = {
      pending: 0,
      assigned: 0,
      completed: 0,
      cancelled: 0
    };

    results.forEach(r => {
      counts[r._id] = r.count;
    });

    return counts;
  } catch (error) {
    throw new Error(error.message || "Failed to retrieve schedule statistics");
  }
};

/**
 * getPeakAppointmentDateService
 *
 * Finds the appointmentDate that has the most schedules
 * with status = "assigned".
 *
 * @returns {Promise<Object>} - An object containing the peak date and count
 * Example: { appointmentDate: "2025-10-24", totalAssigned: 12 }
 */
export const getPeakAppointmentDateService = async () => {
  try {
    const result = await Schedule.aggregate([
      { $match: { status: "assigned" } },
      {
        $group: {
          _id: "$appointmentDate",
          totalAssigned: { $sum: 1 }
        }
      },
      { $sort: { totalAssigned: -1 } },
      { $limit: 1 }
    ]);

    if (result.length === 0) {
      return { appointmentDate: null, totalAssigned: 0 };
    }

    return {
      appointmentDate: result[0]._id,
      totalAssigned: result[0].totalAssigned
    };
  } catch (error) {
    throw new Error(error.message || "Failed to find peak appointment date");
  }
};

/**
 * createScheduleService
 *
 * Creates a new schedule record in the database for a given patient.
 *
 * @param {string} patientId - The MongoDB ObjectId of the patient.
 * @param {string|Date} appointmentDate - The requested date/time.
 * @param {string} illnessDescription - The description provided by the patient.
 * @returns {Promise<object>} The newly created schedule document.
 * @throws {Error} If validation fails or a duplicate schedule exists.
 */
export const createMyScheduleService = async (patientId, appointmentDate, illnessDescription) => {
  try {
    // Validate patientId (đã có từ controller, nhưng kiểm tra lại cũng tốt)
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      throw new Error("Invalid or missing patient ID");
    }

    // Validate appointmentDate
    if (!appointmentDate) {
      throw new Error("Appointment date is required");
    }
    const appointment = new Date(appointmentDate);
    if (isNaN(appointment.getTime())) {
      throw new Error("Invalid appointment date format");
    }
    // Optional: Check if the date is in the past
    if (appointment < new Date()) {
      throw new Error("Appointment date cannot be in the past");
    }


    // Validate illnessDescription
    if (!illnessDescription || illnessDescription.trim().length === 0) {
      throw new Error("Illness description is required");
    }

    // Check for existing schedule for the same patient at the same datetime
    const existingSchedule = await Schedule.findOne({
      patientId,
      appointmentDate: appointment,
    });

    if (existingSchedule) {
      throw new Error("You already have a schedule at this date/time");
    }

    // Create new schedule (doctorId and facultyId remain null initially)
    const newSchedule = new Schedule({
      patientId,
      appointmentDate: appointment,
      illnessDescription: illnessDescription.trim(),
      doctorId: null,
      facultyId: null, // Sẽ được admin gán sau nếu cần
      status: "pending",
    });

    await newSchedule.save();

    return newSchedule; // Trả về schedule vừa tạo
  } catch (error) {
    // Ném lại lỗi để controller xử lý
    throw new Error(error.message || "Failed to create schedule");
  }
};