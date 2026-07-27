import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { checkOrderWindow } from "../middlewares/orderWindow.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createOrderSchema } from "../validations/main.validation.js";

import {
  placeOrder,
  myOrders,
  listAllOrders,
  getOrderById,
  updateMyOrder,
  bulkUpdateOrderStatus,
  getOrderInvoice,
} from "../controllers/order.controller.js";

const router = Router();

// USER
router.post("/", verifyJWT, allowRoles("USER"), checkOrderWindow, validate(createOrderSchema), placeOrder);
router.get("/my", verifyJWT, allowRoles("USER"), myOrders);

// STAFF & ADMIN
router.get("/", verifyJWT, allowRoles("ADMIN", "STAFF"), listAllOrders);
router.patch("/bulk-status", verifyJWT, allowRoles("ADMIN", "STAFF"), bulkUpdateOrderStatus);

router.get("/:id", verifyJWT, allowRoles("USER", "ADMIN", "STAFF"), getOrderById);
router.patch("/:id", verifyJWT, allowRoles("USER", "ADMIN", "STAFF"), updateMyOrder);

router.get("/:id/invoice", verifyJWT, getOrderInvoice);

export default router;
