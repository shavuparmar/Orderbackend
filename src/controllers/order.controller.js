import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

const placeOrder = asynchandler(async (req, res) => {
  const { items, note } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    throw new ApiError(400, "Items are required");

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });

  if (products.length !== items.length)
    throw new ApiError(400, "Some products are invalid/inactive");

  const mapped = items.map((i) => {
    const p = products.find((x) => String(x._id) === String(i.productId));
    if (!p) throw new ApiError(400, "Invalid product");
    const qty = Number(i.qty || 0);
    if (qty < 1) throw new ApiError(400, "Qty must be >= 1");

    return {
      productId: p._id,
      name: p.name,
      price: p.price,
      qty,
    };
  });

  const subtotal = mapped.reduce((sum, x) => sum + x.price * x.qty, 0);
  const grandTotal = subtotal;

  const order = await Order.create({
    userId: req.user._id,
    items: mapped,
    subtotal,
    grandTotal,
    note,
  });

  return res.status(201).json(new ApiResponse(201, order, "Order placed"));
});

const myOrders = asynchandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  return res.status(200).json(new ApiResponse(200, orders, "My orders"));
});

const updateMyOrder = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { note, items } = req.body;

  const order = await Order.findOne({ _id: id, userId: req.user._id });
  if (!order) throw new ApiError(404, "Order not found");

  if (order.status !== "PLACED")
    throw new ApiError(403, "Order cannot be updated after confirmation");

  // ✅ update note (optional)
  order.note = note ?? order.note;

  // ✅ update items (optional) - for edit order feature
  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0)
      throw new ApiError(400, "Items are required");

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    });

    if (products.length !== items.length)
      throw new ApiError(400, "Some products are invalid/inactive");

    const mapped = items.map((i) => {
      const p = products.find((x) => String(x._id) === String(i.productId));
      if (!p) throw new ApiError(400, "Invalid product");
      const qty = Number(i.qty || 0);
      if (qty < 1) throw new ApiError(400, "Qty must be >= 1");

      return {
        productId: p._id,
        name: p.name,
        price: p.price,
        qty,
      };
    });

    const subtotal = mapped.reduce((sum, x) => sum + x.price * x.qty, 0);
    const grandTotal = subtotal;

    order.items = mapped;
    order.subtotal = subtotal;
    order.grandTotal = grandTotal;
  }

  await order.save();

  return res.status(200).json(new ApiResponse(200, order, "Order updated"));
});

const listAllOrders = asynchandler(async (req, res) => {
  const orders = await Order.find().populate(
    "userId",
    "customerName firstName email customerNumber role",
  );
  return res.status(200).json(new ApiResponse(200, orders, "All orders"));
});

const getOrderById = asynchandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, "Order not found");

  const role = req.user?.role;
  const isAdminStaff = role === "ADMIN" || role === "STAFF";
  const isOwner = String(order.userId) === String(req.user?._id); // ✅ FIXED

  if (!isAdminStaff && !isOwner) throw new ApiError(403, "Not allowed");

  return res.status(200).json(new ApiResponse(200, order, "Order fetched"));
});

const getOrderInvoice = asynchandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id).populate(
    "userId",
    "customerName firstName email customerNumber",
  );
  if (!order) throw new ApiError(404, "Order not found");

  // ✅ FIXED: use userId (not userId?._id after populate is fine too)
  const isOwner = String(order.userId?._id || order.userId) === String(req.user._id);
  const isStaffAdmin = ["STAFF", "ADMIN"].includes(req.user.role);

  if (!isOwner && !isStaffAdmin) throw new ApiError(403, "Not allowed");

  return res.status(200).json(new ApiResponse(200, order, "Invoice fetched"));
});

export {
  placeOrder,
  myOrders,
  updateMyOrder,
  listAllOrders,
  getOrderById,
  getOrderInvoice,
};
