import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Product from "../models/product.model.js";

const createProduct = asynchandler(async (req, res) => {
  const { name, price, stock, unit, category, description,unitsPerCaret, tags, mrp } =
    req.body;
  if (!name || price === undefined)
    throw new ApiError(400, "Name and price are required");

  const product = await Product.create({
    name,
    price,
    mrp,
    stock: stock ?? 0,
    unit: unit || "pcs",
    category,
    description,
    unitsPerCaret,
    
    tags: tags || [],
    createdBy: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, product, "Product created"));
});

const getProducts = asynchandler(async (req, res) => {
  const query = req.user?.role === "ADMIN" ? {} : { isActive: true };
  const products = await Product.find(query);
  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products fetched"));
});

const updateProduct = asynchandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(
    id,
    { ...req.body, updatedBy: req.user._id },
    { new: true },
  );

  if (!product) throw new ApiError(404, "Product not found");
  return res.status(200).json(new ApiResponse(200, product, "Product updated"));
});

const deleteProduct = asynchandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false, updatedBy: req.user._id },
    { new: true },
  );

  if (!product) throw new ApiError(404, "Product not found");
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product deleted (soft)"));
});

export { createProduct, getProducts, updateProduct, deleteProduct };
