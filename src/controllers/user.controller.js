import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.models.js";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import ChangeRequest from "../models/ChangeRequest.models.js";

export const getMe = asynchandler(async (req, res) => {
  const me = await User.findById(req.user._id).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200, me, "Me fetched"));
});

export const updateMyProfile = asynchandler(async (req, res) => {
  const { customerName, firstName, email, customerNumber, phone, bio, website, location } = req.body;
  const userId = req.user._id;

  const updateFields = {};
  if (customerName !== undefined) updateFields.customerName = customerName;
  if (firstName !== undefined) updateFields.firstName = firstName;
  if (email !== undefined) updateFields.email = email;
  if (customerNumber !== undefined) updateFields.customerNumber = customerNumber;
  if (phone !== undefined) updateFields.phone = phone;
  if (bio !== undefined) updateFields.bio = bio;
  if (website !== undefined) updateFields.website = website;
  if (location !== undefined) updateFields.location = location;

  const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true, runValidators: true })
    .select("-password -refreshToken");

  if (!updatedUser) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

export const createUser = asynchandler(async (req, res) => {
  const { customerName, firstName, email, customerNumber, password, role } = req.body;

  const existed = await User.findOne({ $or: [{ email }, { customerNumber }] });
  if (existed) throw new ApiError(409, "User already exists with email/number");

  const user = await User.create({
    customerName,
    firstName,
    email,
    customerNumber,
    password,
    role: role || "USER",
  });

  const created = await User.findById(user._id).select("-password -refreshToken");
  return res.status(201).json(new ApiResponse(201, created, "User created"));
});

export const listUsers = asynchandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const sortField = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const roleFilter = req.query.role;

  const query = {};
  if (roleFilter) query.role = roleFilter;

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -refreshToken")
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  return res.status(200).json(new ApiResponse(200, {
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }, "Users fetched"));
});

export const toggleActive = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: !!isActive },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, user, "User updated"));
});

export const deleteUser = asynchandler(async (req, res) => {
  const { id } = req.params;

  if (String(id) === String(req.user._id)) {
    throw new ApiError(400, "You cannot delete your own admin account");
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  await User.findByIdAndDelete(id);

  return res.status(200).json(new ApiResponse(200, null, "User deleted successfully from database"));
});

export const searchUsers = asynchandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  if (!q || q.trim() === "") {
    return res.status(200).json(new ApiResponse(200, { data: [], pagination: { total: 0, page, limit, totalPages: 0 } }, "No query provided"));
  }

  const regex = new RegExp(q.trim(), "i");
  const query = {
    $or: [
      { customerName: regex },
      { customerNumber: regex },
      { email: regex }
    ]
  };

  const [users, total] = await Promise.all([
    User.find(query)
      .select("_id customerName customerNumber email")
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  const usersWithPending = await Promise.all(users.map(async (user) => {
    const orders = await Order.find({ userId: user._id, status: { $ne: "CANCELLED" } }).lean();
    const totalOrderAmount = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const payment = await Payment.findOne({ userId: user._id }).lean();
    const totalReceived = (payment?.entries || []).reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      ...user,
      hasOrders: orders.length > 0,
      pendingAmount: Math.max(0, totalOrderAmount - totalReceived)
    };
  }));

  usersWithPending.sort((a, b) => {
    if (a.hasOrders && !b.hasOrders) return -1;
    if (!a.hasOrders && b.hasOrders) return 1;
    return b.pendingAmount - a.pendingAmount;
  });

  return res.status(200).json(new ApiResponse(200, {
    data: usersWithPending,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }, "Users found"));
});

export const requestProfileUpdate = asynchandler(async (req, res) => {
  const { customerName, firstName, email, customerNumber, note } = req.body;

  if (!["USER", "STAFF"].includes(req.user.role)) {
    throw new ApiError(403, "Only User/Staff can request changes");
  }

  const payload = {};
  if (customerName) payload.customerName = customerName;
  if (firstName) payload.firstName = firstName;
  if (email) payload.email = email;
  if (customerNumber) payload.customerNumber = customerNumber;

  if (Object.keys(payload).length === 0) throw new ApiError(400, "Nothing to update");

  const reqDoc = await ChangeRequest.create({
    userId: req.user._id,
    type: "PROFILE_UPDATE",
    payload,
    status: "PENDING",
    requestedByRole: req.user.role,
    note: note || "",
  });

  return res.status(201).json(new ApiResponse(201, reqDoc, "Request created"));
});

export const requestPasswordReset = asynchandler(async (req, res) => {
  const { newPassword, note } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  if (!["USER", "STAFF"].includes(req.user.role)) {
    throw new ApiError(403, "Only User/Staff can request password change");
  }

  const reqDoc = await ChangeRequest.create({
    userId: req.user._id,
    type: "PASSWORD_RESET",
    payload: { newPassword },
    status: "PENDING",
    requestedByRole: req.user.role,
    note: note || "",
  });

  return res.status(201).json(new ApiResponse(201, reqDoc, "Password change request created"));
});

export const createGenericRequest = asynchandler(async (req, res) => {
  const { title, type, description, payload, note } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  const reqDoc = await ChangeRequest.create({
    userId: req.user._id,
    title: title.trim(),
    description: description.trim(),
    type: type || "GENERAL",
    payload: payload || {},
    status: "PENDING",
    requestedByRole: req.user.role || "USER",
    note: note || "",
  });

  return res.status(201).json(new ApiResponse(201, reqDoc, "Request submitted successfully"));
});
