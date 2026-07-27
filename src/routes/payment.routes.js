import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { addPaymentEntrySchema } from "../validations/main.validation.js";
import { getMyStatement, getUserStatement, addPaymentEntry, getUserPaymentSummary, updatePaymentEntry, deletePaymentEntry } from "../controllers/payment.controller.js";

const router = Router();

router.get("/my", verifyJWT, allowRoles("USER"), getMyStatement);

// staff/admin
router.get("/user/:userId", verifyJWT, allowRoles("ADMIN", "STAFF"), getUserStatement);
router.get("/user/:userId/summary", verifyJWT, allowRoles("ADMIN", "STAFF"), getUserPaymentSummary);
router.post("/entry", verifyJWT, allowRoles("ADMIN", "STAFF"), validate(addPaymentEntrySchema), addPaymentEntry);
router.patch("/entry/:entryId", verifyJWT, allowRoles("ADMIN", "STAFF"), updatePaymentEntry);
router.delete("/entry/:entryId", verifyJWT, allowRoles("ADMIN", "STAFF"), deletePaymentEntry);

export default router;
