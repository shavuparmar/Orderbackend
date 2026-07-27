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
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50; // Products might need higher default limit
  const skip = (page - 1) * limit;
  const sortField = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const { q, category } = req.query;

  const query = req.user?.role === "ADMIN" ? { isDeleted: { $ne: true } } : { isActive: true, isDeleted: { $ne: true } };

  if (q) {
    query.name = new RegExp(q.trim(), "i");
  }
  if (category) {
    query.category = category;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query)
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }, "Products fetched"));
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
