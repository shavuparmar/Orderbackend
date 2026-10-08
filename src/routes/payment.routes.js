import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { addPaymentEntrySchema } from "../validations/main.validation.js";
import { getMyStatement, getMyPaymentSummary, getUserStatement, addPaymentEntry, getUserPaymentSummary, updatePaymentEntry, deletePaymentEntry, getAllUsersPaymentSummary } from "../controllers/payment.controller.js";

const router = Router();

router.get("/my", verifyJWT, allowRoles("CUSTOMER"), getMyStatement);
router.get("/my/summary", verifyJWT, allowRoles("CUSTOMER"), getMyPaymentSummary);

// staff/admin
router.get("/users/summary", verifyJWT, allowRoles("ADMIN", "STAFF"), getAllUsersPaymentSummary);
router.get("/user/:userId", verifyJWT, allowRoles("ADMIN", "STAFF"), getUserStatement);
router.get("/user/:userId/summary", verifyJWT, allowRoles("ADMIN", "STAFF"), getUserPaymentSummary);
router.post("/entry", verifyJWT, allowRoles("ADMIN", "STAFF"), validate(addPaymentEntrySchema), addPaymentEntry);
router.patch("/entry/:entryId", verifyJWT, allowRoles("ADMIN", "STAFF"), updatePaymentEntry);
router.delete("/entry/:entryId", verifyJWT, allowRoles("ADMIN", "STAFF"), deletePaymentEntry);

export default router;
