import cookieParser from 'cookie-parser'
import express from 'express'
import ENVARS from './config/envars.js'
import { connectDB } from './config/db.js'
import cors from 'cors'

import accountRoutes from './routes/account.route.js'
import authRoutes from './routes/auth.route.js'
import facultyRoutes from './routes/faculty.route.js'
import profileRoutes from './routes/doctorprofile.route.js'
import scheduleRoutes from './routes/schedule.route.js'
import medicalRecordRoutes from './routes/medicalRecord.route.js'
import exportRoutes from './routes/export.route.js'

import { Server as SocketServer } from 'socket.io'
import http from 'http'

const app = express()

app.use(cors({
  origin: ENVARS.FRONTEND_URL,
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
  res.json({ message: "Hello this is backend" })
})

app.use("/api/v1/accounts", accountRoutes)
app.use("/api/v1/auth", authRoutes)
app.use('/api/v1/faculty', facultyRoutes)
app.use("/api/v1/profile", profileRoutes)
app.use("/api/v1/schedule", scheduleRoutes)
app.use("/api/v1/medical-records", medicalRecordRoutes)
app.use("/api/v1/export", exportRoutes)

// --- Tạo HTTP server từ app để dùng với Socket.IO ---
const server = http.createServer(app)

// --- Khởi tạo Socket.IO ---
export const io = new SocketServer(server, {
  cors: {
    origin: ENVARS.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
})

// --- Socket.IO connection ---
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// --- Lưu io vào app để dùng trong các service/controller ---
app.set("io", io)

// --- Kết nối DB và start server ---
server.listen(ENVARS.API_PORT, () => {
  console.log(`Server is running on port ${ENVARS.API_PORT}`)
  connectDB()
})
