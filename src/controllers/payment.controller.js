import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";
import User from "../models/User.models.js";

const getMyStatement = asynchandler(async (req, res) => {
  const payment = await Payment.findOne({ userId: req.user._id }).populate("entries.updatedBy", "firstName role");
  return res.status(200).json(new ApiResponse(200, payment || { userId: req.user._id, entries: [] }, "My statement"));
});

const getUserStatement = asynchandler(async (req, res) => {
  const { userId } = req.params;
  const payment = await Payment.findOne({ userId }).populate("entries.updatedBy", "firstName role");
  return res.status(200).json(new ApiResponse(200, payment || { userId, entries: [] }, "User statement"));
});

// staff/admin adds received money
const addPaymentEntry = asynchandler(async (req, res) => {
  const { userId, amount, note, date } = req.body;

  if (!userId || amount === undefined) throw new ApiError(400, "userId and amount are required");

  let payment = await Payment.findOne({ userId });
  if (!payment) payment = await Payment.create({ userId, entries: [] });

  payment.entries.push({
    amount: Number(amount),
    note,
    date: date ? new Date(date) : new Date(),
    updatedBy: req.user._id,
  });

  await payment.save();

  return res.status(201).json(new ApiResponse(201, payment, "Payment entry added"));
});


export const getMyPaymentSummary = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("_id customerName customerNumber email");
  if (!user) throw new ApiError(404, "User not found");

  const orders = await Order.find({ userId, status: { $ne: "CANCELLED" } });
  const totalOrderAmount = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const lastOrderAt = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

  const payment = await Payment.findOne({ userId }).populate("entries.updatedBy", "firstName role");
  const entries = payment?.entries || [];
  const totalReceived = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const pendingAmount = totalOrderAmount - totalReceived;

  return res.status(200).json(new ApiResponse(200, {
    user,
    totalOrderAmount,
    totalReceived,
    pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
    lastOrderAt,
    entries
  }, "My payment summary"));
});

export const getUserPaymentSummary = asynchandler(async (req, res) => {
  const { userId } = req.params;

  // 1. Get user to ensure it exists
  // For full detail, we should populate user, but we can also just fetch it
  const user = await User.findById(userId).select("_id customerName customerNumber email");
  if (!user) throw new ApiError(404, "User not found");

  // 2. Calculate Total Orders
  const orders = await Order.find({ userId, status: { $ne: "CANCELLED" } });
  const totalOrderAmount = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const lastOrderAt = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

  // 3. Calculate Total Received
  const payment = await Payment.findOne({ userId }).populate("entries.updatedBy", "firstName role");
  const entries = payment?.entries || [];
  const totalReceived = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  return res.status(200).json(new ApiResponse(200, {
    user,
    totalOrderAmount,
    totalReceived,
    lastOrderAt,
    entries
  }, "User payment summary"));
});

const updatePaymentEntry = asynchandler(async (req, res) => {
  const { entryId } = req.params;
  const { amount, note, date } = req.body;

  const payment = await Payment.findOne({ "entries._id": entryId });
  if (!payment) throw new ApiError(404, "Payment entry not found");

  const entry = payment.entries.id(entryId);
  if (!entry) throw new ApiError(404, "Entry not found");

  if (amount !== undefined) entry.amount = Number(amount);
  if (note !== undefined) entry.note = note;
  if (date !== undefined) entry.date = new Date(date);
  entry.updatedBy = req.user._id;

  await payment.save();

  return res.status(200).json(new ApiResponse(200, payment, "Payment entry updated"));
});

const deletePaymentEntry = asynchandler(async (req, res) => {
  const { entryId } = req.params;

  const payment = await Payment.findOne({ "entries._id": entryId });
  if (!payment) throw new ApiError(404, "Payment entry not found");

  payment.entries = payment.entries.filter((e) => String(e._id) !== String(entryId));
  await payment.save();

  return res.status(200).json(new ApiResponse(200, payment, "Payment entry deleted"));
});

export const getAllUsersPaymentSummary = asynchandler(async (req, res) => {
  const [users, orders, payments] = await Promise.all([
    User.find({ $or: [{ role: "CUSTOMER" }, { role: { $exists: false } }] }).select("_id customerName firstName customerNumber email"),
    Order.find({ status: { $ne: "CANCELLED" } }).select("userId grandTotal status paymentMethod createdAt"),
    Payment.find().lean()
  ]);

  const summary = users.map(u => {
    const userOrders = orders.filter(o => String(o.userId) === String(u._id));
    const totalOrderAmount = userOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    
    const userPayment = payments.find(p => String(p.userId) === String(u._id));
    const totalReceived = (userPayment?.entries || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingAmount = totalOrderAmount - totalReceived;
    
    return {
      user: u,
      totalOrderAmount,
      totalReceived,
      pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
      paymentStatus: totalOrderAmount === 0 ? "NO_ORDERS" : (totalReceived >= totalOrderAmount ? "PAID" : (totalReceived > 0 ? "PARTIAL" : "PENDING")),
      lastOrderDate: userOrders.length > 0 ? userOrders[userOrders.length - 1].createdAt : null
    };
  });

  // Calculate global totals
  const globalTotalAmount = summary.reduce((sum, s) => sum + s.totalOrderAmount, 0);
  const globalPaidAmount = summary.reduce((sum, s) => sum + s.totalReceived, 0);
  const globalPendingAmount = summary.reduce((sum, s) => sum + s.pendingAmount, 0);
  const globalPendingPayments = summary.filter(s => s.pendingAmount > 0).length;

  return res.status(200).json(new ApiResponse(200, {
    summary,
    globals: {
      globalTotalAmount,
      globalPaidAmount,
      globalPendingAmount,
      globalPendingPayments
    }
  }, "All users payment summary"));
});

export { getMyStatement, getUserStatement, addPaymentEntry, updatePaymentEntry, deletePaymentEntry };
