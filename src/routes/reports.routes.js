import express from "express";
import { verifyJWT, requireAdmin } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getDashboardStats, getStaffDashboardStats } from "../controllers/reports.controller.js";

const router = express.Router();

// Admin Dashboard stats endpoint
router.get("/dashboard", verifyJWT, requireAdmin, getDashboardStats);

// Staff & Admin Operations Dashboard analytics
router.get("/staff-dashboard", verifyJWT, allowRoles("STAFF", "ADMIN"), getStaffDashboardStats);

export default router;
