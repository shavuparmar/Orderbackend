import { Router } from "express";
import { createStockIn, listStockIn } from "../controllers/stockIn.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; 
const router = Router();

router.post("/", verifyJWT, createStockIn);
router.get("/", verifyJWT, listStockIn); // optional for later

export default router;
