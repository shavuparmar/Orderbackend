import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import {
  createReturn,
  listReturns,
  updateReturn,
  deleteReturn,
  getReturnStats,
} from "../controllers/returns.controller.js";

const router = Router();

router.use(verifyJWT, allowRoles("STAFF", "ADMIN"));

router.post("/", createReturn);
router.get("/", listReturns);
router.get("/stats", getReturnStats);
router.patch("/:id", updateReturn);
router.delete("/:id", deleteReturn);

export default router;
