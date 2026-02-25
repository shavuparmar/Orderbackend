import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.models.js";



export const getMe = asynchandler(async (req, res) => {
  const me = await User.findById(req.user._id).select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200, me, "Me fetched"));
});
const createUser = asynchandler(async (req, res) => {
  const { customerName, firstName, email, customerNumber, password, role } = req.body;

  if (!customerName || !firstName || !email || !customerNumber || !password) {
    throw new ApiError(400, "All fields are required");
  }

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

const listUsers = asynchandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken");
  return res.status(200).json(new ApiResponse(200, users, "Users fetched"));
});

const toggleActive = asynchandler(async (req, res) => {
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
export { createUser, listUsers, toggleActive };
