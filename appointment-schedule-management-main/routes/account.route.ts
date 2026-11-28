import express from "express"
import {
    createAccountController,
    updateAccountController,
    getAccountsController,
    deleteAccountController,
    getAccountStatsController
} from "../controllers/account.controller.js"
import {
    verifyAccessToken,
    checkModeratorRole,
    checkAdminRole
} from '../middlewares/token.middleware.js'

const router = express.Router()

router.post("/", verifyAccessToken, checkModeratorRole, createAccountController)
router.put("/:idOrEmail", verifyAccessToken, updateAccountController)
router.get("/", verifyAccessToken, getAccountsController)
router.delete("/", verifyAccessToken, checkModeratorRole, deleteAccountController)
router.get("/stats", verifyAccessToken, checkAdminRole, getAccountStatsController);

export default router
