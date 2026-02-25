import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { createProduct, getProducts, updateProduct, deleteProduct } from "../controllers/product.controller.js";

const router = Router();

router.get("/", verifyJWT, getProducts);
router.post("/", verifyJWT, allowRoles("ADMIN"), createProduct);
router.patch("/:id", verifyJWT, allowRoles("ADMIN"), updateProduct);
router.delete("/:id", verifyJWT, allowRoles("ADMIN"), deleteProduct);

export default router;
