import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

const placeOrder = asynchandler(async (req, res) => {
  const { items, note, kitchenNotes, deliveryAddress, paymentMethod } = req.body;
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
    kitchenNotes,
    deliveryAddress,
    paymentMethod: paymentMethod || "PENDING",
    statusHistory: [
      {
        status: "PLACED",
        note: "Order created",
        updatedBy: req.user._id,
        timestamp: new Date(),
      },
    ],
  });

  // Automatically deduct inventory stock for each ordered item
  for (const item of mapped) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.qty },
      updatedBy: req.user._id,
    });
  }

  return res.status(201).json(new ApiResponse(201, order, "Order placed"));
});

const myOrders = asynchandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const query = { userId: req.user._id };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        data: orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "My orders"
    )
  );
});

const updateMyOrder = asynchandler(async (req, res) => {
  const { id } = req.params;
  const {
    note,
    kitchenNotes,
    staffNotes,
    priorityTag,
    assignedStaff,
    paymentMethod,
    deliveryAddress,
    items,
    status,
    statusNote,
  } = req.body;

  const isStaffOrAdmin = ["STAFF", "ADMIN"].includes(req.user?.role);
  const query = isStaffOrAdmin ? { _id: id } : { _id: id, userId: req.user._id };

  const order = await Order.findOne(query);
  if (!order) throw new ApiError(404, "Order not found");

  if (!isStaffOrAdmin && order.status !== "PLACED")
    throw new ApiError(403, "Order cannot be updated after confirmation");

  if (status && status !== order.status) {
    const validStatuses = [
      "PLACED",
      "ACCEPTED",
      "CONFIRMED",
      "PREPARING",
      "IN_PROGRESS",
      "READY",
      "COMPLETED",
      "DELIVERED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    order.status = status;

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status,
      note: statusNote || `Status changed to ${status}`,
      updatedBy: req.user._id,
      timestamp: new Date(),
    });
  }

  if (note !== undefined) order.note = note;
  if (kitchenNotes !== undefined) order.kitchenNotes = kitchenNotes;
  if (staffNotes !== undefined) order.staffNotes = staffNotes;
  if (priorityTag !== undefined) order.priorityTag = priorityTag;
  if (assignedStaff !== undefined) order.assignedStaff = assignedStaff;
  if (paymentMethod !== undefined) order.paymentMethod = paymentMethod;
  if (deliveryAddress !== undefined) order.deliveryAddress = deliveryAddress;

  if (items !== undefined && !isStaffOrAdmin) {
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
    order.items = mapped;
    order.subtotal = subtotal;
    order.grandTotal = subtotal;
  }

  await order.save();

  const populated = await Order.findById(order._id)
    .populate("userId", "customerName firstName email customerNumber role")
    .populate("assignedStaff", "customerName firstName email role");

  return res.status(200).json(new ApiResponse(200, populated, "Order updated"));
});

const bulkUpdateOrderStatus = asynchandler(async (req, res) => {
  const { orderIds, status, statusNote } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0 || !status) {
    throw new ApiError(400, "orderIds array and status are required");
  }

  const validStatuses = [
    "PLACED",
    "ACCEPTED",
    "CONFIRMED",
    "PREPARING",
    "IN_PROGRESS",
    "READY",
    "COMPLETED",
    "DELIVERED",
    "CANCELLED",
  ];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const orders = await Order.find({ _id: { $in: orderIds } });

  for (const order of orders) {
    if (order.status !== status) {
      order.status = status;
      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status,
        note: statusNote || `Bulk status updated to ${status}`,
        updatedBy: req.user._id,
        timestamp: new Date(),
      });
      await order.save();
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { updatedCount: orders.length },
      `Updated ${orders.length} orders to ${status}`
    )
  );
});

const listAllOrders = asynchandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const sortField = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const { status, q, priority } = req.query;

  const query = {};
  if (status && status !== "ALL") {
    if (status === "PENDING") query.status = "PLACED";
    else if (status === "ACTIVE") query.status = { $in: ["ACCEPTED", "CONFIRMED", "PREPARING", "IN_PROGRESS", "READY"] };
    else query.status = status;
  }

  if (priority) query.priorityTag = priority;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("userId", "customerName firstName email customerNumber role")
      .populate("assignedStaff", "customerName firstName email role")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  let filtered = orders;
  if (q) {
    const search = q.trim().toLowerCase();
    filtered = orders.filter((o) => {
      const orderNo = String(o.orderNo || "").toLowerCase();
      const customerName = String(o.userId?.customerName || o.userId?.firstName || "").toLowerCase();
      const email = String(o.userId?.email || "").toLowerCase();
      const customerNo = String(o.userId?.customerNumber || "").toLowerCase();
      return (
        orderNo.includes(search) ||
        customerName.includes(search) ||
        email.includes(search) ||
        customerNo.includes(search)
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
      "All orders"
    )
  );
});

const getOrderById = asynchandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate("userId", "customerName firstName email customerNumber role")
    .populate("assignedStaff", "customerName firstName email role")
    .populate("statusHistory.updatedBy", "firstName customerName role");

  if (!order) throw new ApiError(404, "Order not found");

  const role = req.user?.role;
  const isAdminStaff = role === "ADMIN" || role === "STAFF";
  const isOwner = String(order.userId?._id || order.userId) === String(req.user?._id);

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

  const isOwner = String(order.userId?._id || order.userId) === String(req.user._id);
  const isStaffAdmin = ["STAFF", "ADMIN"].includes(req.user.role);

  if (!isOwner && !isStaffAdmin) throw new ApiError(403, "Not allowed");

  return res.status(200).json(new ApiResponse(200, order, "Invoice fetched"));
});

export {
  placeOrder,
  myOrders,
  updateMyOrder,
  bulkUpdateOrderStatus,
  listAllOrders,
  getOrderById,
  getOrderInvoice,
};
