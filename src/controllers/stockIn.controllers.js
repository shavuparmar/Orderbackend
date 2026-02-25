import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Product from "../models/product.model.js";
import StockIn from "../models/stockIn.model.js";

// helper: normalize any date to YYYY-MM-DD
const toDayString = (input) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

// ✅ STAFF creates entry (backend calculates totals)
const createStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { productId, carets, date, note } = req.body;

  if (!productId) throw new ApiError(400, "productId is required");

  const caretNum = Number(carets || 0);
  if (!Number.isFinite(caretNum) || caretNum <= 0)
    throw new ApiError(400, "Carets must be > 0");

  const day = toDayString(date);
  if (!day) throw new ApiError(400, "Invalid date");

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });

  if (!product) throw new ApiError(404, "Product not found/inactive");

  const unitsPerCaret = Number(product.unitsPerCaret || 1);
  const unitPrice = Number(product.price || 0);

  const totalUnits = unitsPerCaret * caretNum;
  const totalAmount = totalUnits * unitPrice;

  const entry = await StockIn.create({
    productId: product._id,
    day,
    carets: caretNum,
    unitsPerCaretSnapshot: unitsPerCaret,
    unitPriceSnapshot: unitPrice,
    totalUnits,
    totalAmount,
    note: (note || "").trim(),
    createdBy: req.user._id,
  });

  // ✅ OPTIONAL: increase Product.stock in UNITS
  // If your "stock" represents total units available, keep this.
  await Product.updateOne(
    { _id: product._id },
    { $inc: { stock: totalUnits }, $set: { updatedBy: req.user._id } }
  );

  return res.status(201).json(new ApiResponse(201, entry, "Stock-in saved"));
});

// ✅ (optional) list for history later
const listStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const day = req.query.day || req.query.date || toDayString();
  const items = await StockIn.find({ day })
    .populate("productId", "name sku price unitsPerCaret unit")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, items, "Stock-in list"));
});

export { createStockIn, listStockIn };
