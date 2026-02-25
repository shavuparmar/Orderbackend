import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Payment from "../models/payment.model.js";
import Order from "../models/order.model.js";

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

export { getMyStatement, getUserStatement, addPaymentEntry };
