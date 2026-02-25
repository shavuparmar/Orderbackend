import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { checkOrderWindow } from "../middlewares/orderWindow.middleware.js";

import {
  placeOrder,
  myOrders,
  listAllOrders,
  getOrderById,      // ✅ add
  updateMyOrder,
  getOrderInvoice,
} from "../controllers/order.controller.js";

const router = Router();

// USER
router.post("/", verifyJWT, allowRoles("USER"), checkOrderWindow, placeOrder);
router.get("/my", verifyJWT, allowRoles("USER"), myOrders);

router.get("/", verifyJWT, allowRoles("ADMIN", "STAFF"), listAllOrders);

router.get("/:id", verifyJWT, allowRoles("USER", "ADMIN", "STAFF"), getOrderById);
router.patch("/:id", verifyJWT, allowRoles("USER", "ADMIN", "STAFF"), updateMyOrder);

router.get("/:id/invoice", verifyJWT, getOrderInvoice);

export default router;
