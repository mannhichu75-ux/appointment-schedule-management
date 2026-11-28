import mongoose from "mongoose";
import ENVARS from "./envars.js";

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(ENVARS.MONGO_URI);

        console.log("MongoDB connected: " + conn.connection.host);
    } catch (error) {
        console.log("Error connecting to MongoDB: " + error.message);
        process.exit(1);
    }
};