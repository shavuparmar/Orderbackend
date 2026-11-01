import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, loginUserSchema, updateProfileSchema, passwordResetSchema } from "../validations/user.validation.js";

import { loginUser, logoutUser, getMe, refreshToken } from "../controllers/auth.controller.js";
import {
  createUser,
  listUsers,
  toggleActive,
  searchUsers,
  updateMyProfile,
  deleteUser,
  createGenericRequest,
  updateRole,
  adminUpdateUser,
  adminResetPassword,
  submitPublicRequest,
  requestProfileUpdate,
  requestPasswordReset,
} from "../controllers/user.controller.js";

const router = Router();

// Public request submissions (Customer / Staff onboarding)
router.post("/public-request", submitPublicRequest);

// Auth
router.post("/login", validate(loginUserSchema), loginUser);
router.post("/refresh", refreshToken);
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getMe);
router.put("/me", verifyJWT, updateMyProfile);

// Admin user management (Complete CRUD & Password Management)
router.post("/create", verifyJWT, allowRoles("ADMIN"), validate(createUserSchema), createUser);
router.get("/search", verifyJWT, allowRoles("ADMIN", "STAFF"), searchUsers);
router.get("/", verifyJWT, allowRoles("ADMIN", "STAFF"), listUsers);
router.put("/:id", verifyJWT, allowRoles("ADMIN"), adminUpdateUser);
router.patch("/:id/password", verifyJWT, allowRoles("ADMIN"), adminResetPassword);
router.patch("/:id/active", verifyJWT, allowRoles("ADMIN"), toggleActive);
router.patch("/:id/role", verifyJWT, allowRoles("ADMIN"), updateRole);
router.delete("/:id", verifyJWT, allowRoles("ADMIN"), deleteUser);

// User self-service requests
router.post("/request", verifyJWT, createGenericRequest);
router.post("/request/profile", verifyJWT, validate(updateProfileSchema), requestProfileUpdate);
router.post("/request/password", verifyJWT, validate(passwordResetSchema), requestPasswordReset);

export default router;
