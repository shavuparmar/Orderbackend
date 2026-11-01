import express from "express";
import { verifyJWT, requireAdmin } from "../middlewares/auth.middleware.js";
import {
  listChangeRequests,
  getRequestDetails,
  updateChangeRequest,
  reviewChangeRequest,
  deleteChangeRequest,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(verifyJWT, requireAdmin);

router.get("/requests", listChangeRequests);
router.get("/requests/:id", getRequestDetails);
router.put("/requests/:id", updateChangeRequest);
router.patch("/requests/:id", reviewChangeRequest);
router.delete("/requests/:id", deleteChangeRequest);

export default router;
