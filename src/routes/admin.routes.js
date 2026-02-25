import express from "express";
import { verifyJWT, requireAdmin } from "../middlewares/auth.middleware.js";
import { listChangeRequests, reviewChangeRequest } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/requests", verifyJWT, requireAdmin, listChangeRequests);
router.patch("/requests/:id", verifyJWT, requireAdmin, reviewChangeRequest);

export default router;
