import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Product from "../models/product.model.js";
import StockIn from "../models/stockIn.model.js";

const toDayString = (input) => {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

export const createStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { productId, carets, date, note, remarks, supplier, batchNumber, unit, type } = req.body;

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
    remarks: (remarks || "").trim(),
    unit: unit || product.unit || "pcs",
    category: product.category || "General",
    supplier: (supplier || "").trim(),
    batchNumber: (batchNumber || "").trim(),
    type: type || "STOCK_IN",
    createdBy: req.user._id,
  });

  await Product.updateOne(
    { _id: product._id },
    { $inc: { stock: totalUnits }, $set: { updatedBy: req.user._id } }
  );

  return res.status(201).json(new ApiResponse(201, entry, "Stock-in saved"));
});

export const bulkStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { date, items, note } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Items array is required");
  }

  const day = toDayString(date);
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, isDeleted: false });

  const createdEntries = [];

  for (const item of items) {
    const p = products.find((x) => String(x._id) === String(item.productId));
    if (!p) continue;

    const caretNum = Number(item.carets || 0);
    if (caretNum <= 0) continue;

    const unitsPerCaret = Number(p.unitsPerCaret || 1);
    const unitPrice = Number(p.price || 0);
    const totalUnits = unitsPerCaret * caretNum;
    const totalAmount = totalUnits * unitPrice;

    const entry = await StockIn.create({
      productId: p._id,
      day,
      carets: caretNum,
      unitsPerCaretSnapshot: unitsPerCaret,
      unitPriceSnapshot: unitPrice,
      totalUnits,
      totalAmount,
      note: (item.note || note || "").trim(),
      remarks: (item.remarks || "").trim(),
      unit: item.unit || p.unit || "pcs",
      category: p.category || "General",
      supplier: (item.supplier || "").trim(),
      batchNumber: (item.batchNumber || "").trim(),
      type: "STOCK_IN",
      createdBy: req.user._id,
    });

    await Product.updateOne(
      { _id: p._id },
      { $inc: { stock: totalUnits }, $set: { updatedBy: req.user._id } }
    );

    createdEntries.push(entry);
  }

  return res.status(201).json(new ApiResponse(201, createdEntries, "Bulk stock-in batch saved"));
});

export const listStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { day, date, fromDate, toDate, search, category } = req.query;

  const query = {};
  if (day || date) {
    query.day = day || date;
  } else if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate + "T00:00:00.000Z");
    if (toDate) query.createdAt.$lte = new Date(toDate + "T23:59:59.999Z");
  }

  if (category) {
    query.category = category;
  }

  const items = await StockIn.find(query)
    .populate("productId", "name sku price unitsPerCaret unit stock category")
    .populate("createdBy", "firstName customerName role")
    .sort({ createdAt: -1 })
    .lean();

  let filtered = items;
  if (search) {
    const q = search.trim().toLowerCase();
    filtered = items.filter((it) => {
      const pName = String(it.productId?.name || "").toLowerCase();
      const sku = String(it.productId?.sku || "").toLowerCase();
      const note = String(it.note || "").toLowerCase();
      const supplier = String(it.supplier || "").toLowerCase();
      const batch = String(it.batchNumber || "").toLowerCase();
      return (
        pName.includes(q) ||
        sku.includes(q) ||
        note.includes(q) ||
        supplier.includes(q) ||
        batch.includes(q)
      );
    });
  }

  return res.status(200).json(new ApiResponse(200, filtered, "Stock-in list"));
});

export const updateStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { id } = req.params;
  const { carets, note, remarks, supplier, batchNumber } = req.body;

  const entry = await StockIn.findById(id);
  if (!entry) throw new ApiError(404, "Stock entry not found");

  const oldTotalUnits = entry.totalUnits;

  if (carets !== undefined) {
    const newCarets = Number(carets);
    if (isNaN(newCarets) || newCarets <= 0) throw new ApiError(400, "Carets must be > 0");

    entry.carets = newCarets;
    entry.totalUnits = entry.unitsPerCaretSnapshot * newCarets;
    entry.totalAmount = entry.totalUnits * entry.unitPriceSnapshot;

    const unitDiff = entry.totalUnits - oldTotalUnits;
    if (unitDiff !== 0) {
      await Product.findByIdAndUpdate(entry.productId, {
        $inc: { stock: unitDiff },
        updatedBy: req.user._id,
      });
    }
  }

  if (note !== undefined) entry.note = note;
  if (remarks !== undefined) entry.remarks = remarks;
  if (supplier !== undefined) entry.supplier = supplier;
  if (batchNumber !== undefined) entry.batchNumber = batchNumber;

  await entry.save();

  return res.status(200).json(new ApiResponse(200, entry, "Stock entry updated"));
});

export const deleteStockIn = asynchandler(async (req, res) => {
  const role = req.user?.role;
  if (!["STAFF", "ADMIN"].includes(role)) throw new ApiError(403, "Not allowed");

  const { id } = req.params;
  const entry = await StockIn.findById(id);
  if (!entry) throw new ApiError(404, "Stock entry not found");

  // Revert product stock addition
  await Product.findByIdAndUpdate(entry.productId, {
    $inc: { stock: -entry.totalUnits },
    updatedBy: req.user._id,
  });

  await StockIn.findByIdAndDelete(id);

  return res.status(200).json(new ApiResponse(200, null, "Stock entry deleted"));
});

export const getStockSummary = asynchandler(async (req, res) => {
  const products = await Product.find({ isDeleted: false, isActive: true }).lean();

  const totalProducts = products.length;
  const totalInventoryUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0);

  const lowStockThreshold = 10;
  const criticalThreshold = 3;

  const lowStockItems = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= lowStockThreshold);
  const criticalStockItems = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= criticalThreshold);
  const outOfStockItems = products.filter((p) => (p.stock || 0) <= 0);

  const today = toDayString();
  const todayEntries = await StockIn.find({ day: today }).lean();
  const todayStockInUnits = todayEntries.reduce((acc, e) => acc + (e.totalUnits || 0), 0);
  const todayStockInAmount = todayEntries.reduce((acc, e) => acc + (e.totalAmount || 0), 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalProducts,
        totalInventoryUnits,
        totalInventoryValue,
        lowStockCount: lowStockItems.length,
        criticalStockCount: criticalStockItems.length,
        outOfStockCount: outOfStockItems.length,
        lowStockItems,
        criticalStockItems,
        outOfStockItems,
        todayStockInUnits,
        todayStockInAmount,
        todayEntriesCount: todayEntries.length,
      },
      "Stock inventory summary"
    )
  );
});
