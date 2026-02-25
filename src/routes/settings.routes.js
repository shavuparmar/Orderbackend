import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getSettings, updateOrderWindow } from "../controllers/settings.controller.js";

const router = Router();

router.get("/", verifyJWT, allowRoles("ADMIN"), getSettings);
router.patch("/order-window", verifyJWT, allowRoles("ADMIN"), updateOrderWindow);

export default router;
