import { Router } from "express";
import {
  createStockIn,
  bulkStockIn,
  listStockIn,
  updateStockIn,
  deleteStockIn,
  getStockSummary,
} from "../controllers/stockIn.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.use(verifyJWT, allowRoles("STAFF", "ADMIN"));

router.post("/", createStockIn);
router.post("/bulk", bulkStockIn);
router.get("/", listStockIn);
router.get("/summary", getStockSummary);
router.patch("/:id", updateStockIn);
router.delete("/:id", deleteStockIn);

export default router;
