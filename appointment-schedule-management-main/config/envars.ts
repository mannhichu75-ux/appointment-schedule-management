import dotenv from 'dotenv'

dotenv.config({ path: '.env'})

const ENVARS = {
    API_PORT: process.env.API_PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL
}

export default ENVARS;
