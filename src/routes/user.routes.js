import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";

import { loginUser, logoutUser, getMe, refreshToken } from "../controllers/auth.controller.js";
import { createUser, listUsers, toggleActive } from "../controllers/user.controller.js";
import {requestProfileUpdate, requestPasswordReset } from "../controllers/user.controller.js";
const router = Router();

// auth
router.post("/login", loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getMe);

// admin user management
router.post("/create", verifyJWT, allowRoles("ADMIN"), createUser);
router.get("/", verifyJWT, allowRoles("ADMIN"), listUsers);
router.patch("/:id/active", verifyJWT, allowRoles("ADMIN"), toggleActive);

router.post("/request/profile", verifyJWT, requestProfileUpdate);
router.post("/request/password", verifyJWT, requestPasswordReset);

export default router;
