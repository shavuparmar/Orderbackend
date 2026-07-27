import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ReturnProduct from "../models/ReturnProduct.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

export const createReturn = asynchandler(async (req, res) => {
  const { orderId, userId, productId, qty, countType, unit, reason, condition, remarks, images, status } = req.body;

  if (!productId || !qty) {
    throw new ApiError(400, "productId and qty are required");
  }

  const numQty = Number(qty);
  if (isNaN(numQty) || numQty <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  const upc = Number(product.unitsPerCaret || 1);
  const totalUnits = countType === "CRATE" ? numQty * upc : numQty;

  const returnStatus = status || "PENDING";
  const targetUserId = userId || req.user._id;

  const returnDoc = await ReturnProduct.create({
    orderId: orderId || null,
    userId: targetUserId,
    productId,
    qty: totalUnits,
    unit: unit || product.unit || "pcs",
    reason: reason || "Returned by customer",
    condition: condition || "GOOD",
    remarks: remarks || "",
    images: images || [],
    status: returnStatus,
    createdBy: req.user._id,
  });

  // Automatically restock inventory if approved & restocked
  if (returnStatus === "RESTOCKED") {
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: totalUnits },
      updatedBy: req.user._id,
    });
  }

  const populatedObj = await ReturnProduct.findById(returnDoc._id)
    .populate("productId", "name sku price unit category unitsPerCaret stock")
    .populate("userId", "customerName firstName customerNumber email")
    .populate("createdBy", "firstName customerName role");

  return res.status(201).json(new ApiResponse(201, populatedObj, "Return product logged successfully"));
});

export const listReturns = asynchandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 30;
  const skip = (page - 1) * limit;
  const { status, search, day, fromDate, toDate } = req.query;

  const query = {};

  if (status && status !== "ALL") {
    query.status = status;
  }

  if (day) {
    const start = new Date(day + "T00:00:00.000Z");
    const end = new Date(day + "T23:59:59.999Z");
    query.createdAt = { $gte: start, $lte: end };
  } else if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate + "T00:00:00.000Z");
    if (toDate) query.createdAt.$lte = new Date(toDate + "T23:59:59.999Z");
  }

  const [returns, total] = await Promise.all([
    ReturnProduct.find(query)
      .populate("productId", "name sku price unit category images unitsPerCaret stock")
      .populate("userId", "customerName firstName customerNumber email")
      .populate("createdBy", "firstName customerName role")
      .populate("orderId", "orderNo grandTotal status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReturnProduct.countDocuments(query),
  ]);

  // Client side search filter if search parameter passed
  let filtered = returns;
  if (search) {
    const q = search.trim().toLowerCase();
    filtered = returns.filter((r) => {
      const returnNo = String(r.returnNo || "").toLowerCase();
      const prodName = String(r.productId?.name || "").toLowerCase();
      const custName = String(r.userId?.customerName || r.userId?.firstName || "").toLowerCase();
      const orderNo = String(r.orderId?.orderNo || "").toLowerCase();
      const reason = String(r.reason || "").toLowerCase();
      return (
        returnNo.includes(q) ||
        prodName.includes(q) ||
        custName.includes(q) ||
        orderNo.includes(q) ||
        reason.includes(q)
      );
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: filtered,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Return items fetched"
    )
  );
});

export const updateReturn = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { qty, unit, reason, condition, remarks, status } = req.body;

  const returnDoc = await ReturnProduct.findById(id);
  if (!returnDoc) throw new ApiError(404, "Return record not found");

  const oldStatus = returnDoc.status;
  const oldQty = returnDoc.qty;

  if (qty !== undefined) returnDoc.qty = Number(qty);
  if (unit !== undefined) returnDoc.unit = unit;
  if (reason !== undefined) returnDoc.reason = reason;
  if (condition !== undefined) returnDoc.condition = condition;
  if (remarks !== undefined) returnDoc.remarks = remarks;

  if (status !== undefined) {
    returnDoc.status = status;
  }

  await returnDoc.save();

  // Stock inventory auto-sync logic
  if (oldStatus !== "RESTOCKED" && returnDoc.status === "RESTOCKED") {
    // Add stock
    await Product.findByIdAndUpdate(returnDoc.productId, {
      $inc: { stock: returnDoc.qty },
      updatedBy: req.user._id,
    });
  } else if (oldStatus === "RESTOCKED" && returnDoc.status !== "RESTOCKED") {
    // Revert stock addition
    await Product.findByIdAndUpdate(returnDoc.productId, {
      $inc: { stock: -oldQty },
      updatedBy: req.user._id,
    });
  }

  const updatedPopulated = await ReturnProduct.findById(id)
    .populate("productId", "name sku price unit category")
    .populate("userId", "customerName firstName customerNumber email")
    .populate("createdBy", "firstName customerName role");

  return res.status(200).json(new ApiResponse(200, updatedPopulated, "Return record updated"));
});

export const deleteReturn = asynchandler(async (req, res) => {
  const { id } = req.params;

  const returnDoc = await ReturnProduct.findById(id);
  if (!returnDoc) throw new ApiError(404, "Return record not found");

  // Revert restock if it was previously restocked
  if (returnDoc.status === "RESTOCKED") {
    await Product.findByIdAndUpdate(returnDoc.productId, {
      $inc: { stock: -returnDoc.qty },
      updatedBy: req.user._id,
    });
  }

  await ReturnProduct.findByIdAndDelete(id);

  return res.status(200).json(new ApiResponse(200, null, "Return record deleted"));
});

export const getReturnStats = asynchandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayCount, pendingCount, approvedCount, rejectedCount, restockedCount, allReturns] =
    await Promise.all([
      ReturnProduct.countDocuments({ createdAt: { $gte: todayStart } }),
      ReturnProduct.countDocuments({ status: "PENDING" }),
      ReturnProduct.countDocuments({ status: "APPROVED" }),
      ReturnProduct.countDocuments({ status: "REJECTED" }),
      ReturnProduct.countDocuments({ status: "RESTOCKED" }),
      ReturnProduct.find().populate("productId", "price").lean(),
    ]);

  const totalValue = allReturns.reduce((sum, r) => {
    const price = r.productId?.price || 0;
    return sum + price * (r.qty || 0);
  }, 0);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        todayReturns: todayCount,
        pendingReturns: pendingCount,
        approvedReturns: approvedCount,
        rejectedReturns: rejectedCount,
        restockedCount,
        totalReturnQty: allReturns.reduce((sum, r) => sum + (r.qty || 0), 0),
        totalReturnValue: totalValue,
      },
      "Return statistics fetched"
    )
  );
});
