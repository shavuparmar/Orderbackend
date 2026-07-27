import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ChangeRequest from "../models/ChangeRequest.models.js";
import User from "../models/User.models.js";

export const listChangeRequests = asynchandler(async (req, res) => {
  const { status, type } = req.query;

  const query = {};
  if (status && status !== "ALL") query.status = status;
  if (type && type !== "ALL") query.type = type;

  const items = await ChangeRequest.find(query)
    .populate("userId", "customerName firstName email customerNumber role isActive")
    .populate("reviewedBy", "customerName firstName role")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, items, "Requests fetched"));
});

export const reviewChangeRequest = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { action, reviewNote } = req.body; // action: APPROVE | REJECT | COMPLETE

  const doc = await ChangeRequest.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (!["APPROVE", "REJECT", "COMPLETE"].includes(action)) {
    throw new ApiError(400, "Invalid action");
  }

  if (action === "REJECT") {
    doc.status = "REJECTED";
    doc.reviewNote = reviewNote || "";
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();
    return res.status(200).json(new ApiResponse(200, doc, "Request rejected"));
  }

  // APPROVE or COMPLETE
  const user = await User.findById(doc.userId);
  if (user) {
    if (doc.type === "PROFILE_UPDATE" && doc.payload) {
      Object.assign(user, doc.payload);
      await user.save();
    }
    if (doc.type === "PASSWORD_RESET" && doc.payload?.newPassword) {
      user.password = doc.payload.newPassword;
      await user.save();
    }
  }

  doc.status = action === "COMPLETE" ? "COMPLETED" : "APPROVED";
  doc.reviewNote = reviewNote || "";
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();
  await doc.save();

  return res.status(200).json(new ApiResponse(200, doc, `Request marked as ${doc.status}`));
});
