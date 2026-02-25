import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getMyStatement, getUserStatement, addPaymentEntry } from "../controllers/payment.controller.js";

const router = Router();

router.get("/my", verifyJWT, allowRoles("USER"), getMyStatement);

// staff/admin
router.get("/user/:userId", verifyJWT, allowRoles("ADMIN", "STAFF"), getUserStatement);
router.post("/entry", verifyJWT, allowRoles("ADMIN", "STAFF"), addPaymentEntry);

export default router;
