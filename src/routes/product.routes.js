import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { allowRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { productSchema } from "../validations/main.validation.js";
import { createProduct, getProducts, updateProduct, deleteProduct } from "../controllers/product.controller.js";

const router = Router();

router.get("/", verifyJWT, getProducts);
router.post("/", verifyJWT, allowRoles("ADMIN"), validate(productSchema), createProduct);
router.patch("/:id", verifyJWT, allowRoles("ADMIN"), validate(productSchema.partial()), updateProduct);
router.delete("/:id", verifyJWT, allowRoles("ADMIN"), deleteProduct);

export default router;
