import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { getSettings, updateOrderWindow, updateSettings } from "../controllers/settings.controller.js";

const router = Router();

router.get("/", verifyJWT, allowRoles("ADMIN"), getSettings);
router.put("/", verifyJWT, allowRoles("ADMIN"), updateSettings);
router.patch("/", verifyJWT, allowRoles("ADMIN"), updateSettings);
router.patch("/order-window", verifyJWT, allowRoles("ADMIN"), updateOrderWindow);

export default router;
