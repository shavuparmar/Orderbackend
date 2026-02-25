import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ChangeRequest from "../models/ChangeRequest.models.js";
import User from "../models/User.models.js";

export const listChangeRequests = asynchandler(async (req, res) => {
  const { status = "PENDING" } = req.query;

  const items = await ChangeRequest.find({ status })
    .populate("userId", "customerName firstName email customerNumber role isActive")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, items, "Requests fetched"));
});

export const reviewChangeRequest = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { action, reviewNote } = req.body; // action: APPROVE | REJECT

  const doc = await ChangeRequest.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");
  if (doc.status !== "PENDING") throw new ApiError(400, "Request already reviewed");

  if (!["APPROVE", "REJECT"].includes(action)) throw new ApiError(400, "Invalid action");

  if (action === "REJECT") {
    doc.status = "REJECTED";
    doc.reviewNote = reviewNote || "";
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();
    return res.status(200).json(new ApiResponse(200, doc, "Request rejected"));
  }

  // APPROVE: apply changes
  const user = await User.findById(doc.userId);
  if (!user) throw new ApiError(404, "User not found");

  if (doc.type === "PROFILE_UPDATE") {
    Object.assign(user, doc.payload);
    await user.save(); // will validate unique email/customerNumber
  }

  if (doc.type === "PASSWORD_RESET") {
    user.password = doc.payload.newPassword; // will hash via pre-save
    await user.save();
  }

  doc.status = "APPROVED";
  doc.reviewNote = reviewNote || "";
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();
  await doc.save();

  return res.status(200).json(new ApiResponse(200, doc, "Request approved & applied"));
});
