import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, loginUserSchema, updateProfileSchema, passwordResetSchema } from "../validations/user.validation.js";

import { loginUser, logoutUser, getMe, refreshToken } from "../controllers/auth.controller.js";
import { createUser, listUsers, toggleActive, searchUsers, updateMyProfile, deleteUser, createGenericRequest } from "../controllers/user.controller.js";
import {requestProfileUpdate, requestPasswordReset } from "../controllers/user.controller.js";
const router = Router();

// auth
router.post("/login", validate(loginUserSchema), loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getMe);
router.put("/me", verifyJWT, updateMyProfile);

// admin user management
router.post("/create", verifyJWT, allowRoles("ADMIN"), validate(createUserSchema), createUser);
router.get("/search", verifyJWT, allowRoles("ADMIN", "STAFF"), searchUsers);
router.get("/", verifyJWT, allowRoles("ADMIN", "STAFF"), listUsers);
router.patch("/:id/active", verifyJWT, allowRoles("ADMIN"), toggleActive);
router.delete("/:id", verifyJWT, allowRoles("ADMIN"), deleteUser);

router.post("/request", verifyJWT, createGenericRequest);
router.post("/request/profile", verifyJWT, validate(updateProfileSchema), requestProfileUpdate);
router.post("/request/password", verifyJWT, validate(passwordResetSchema), requestPasswordReset);

export default router;
