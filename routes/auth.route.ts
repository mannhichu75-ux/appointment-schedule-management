import {
    signInController,
    signupController,
    signOutController
} from '../controllers/auth.controller.js'
import express from 'express'

const router = express.Router()

router.post("/signin", signInController)
router.post("/signup", signupController)
router.post("/signout", signOutController)

export default router