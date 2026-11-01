import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ChangeRequest from "../models/ChangeRequest.models.js";
import User from "../models/User.models.js";

export const listChangeRequests = asynchandler(async (req, res) => {
  const { status, type, q } = req.query;

  const query = {};
  if (status && status !== "ALL") query.status = status;
  if (type && type !== "ALL") query.type = type;

  if (q && q.trim()) {
    const escaped = q.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { applicantName: regex },
      { mobileNumber: regex },
      { email: regex },
      { title: regex },
      { description: regex }
    ];
  }

  const [items, allDocs] = await Promise.all([
    ChangeRequest.find(query)
      .populate("userId", "customerName firstName email customerNumber role isActive")
      .populate("reviewedBy", "customerName firstName role")
      .populate("createdUserId", "customerName firstName email customerNumber role")
      .sort({ createdAt: -1 }),
    ChangeRequest.find().select("status type").lean()
  ]);

  const stats = {
    total: allDocs.length,
    pending: allDocs.filter(d => d.status === "PENDING").length,
    approved: allDocs.filter(d => d.status === "APPROVED" || d.status === "COMPLETED").length,
    rejected: allDocs.filter(d => d.status === "REJECTED").length,
    customerRequests: allDocs.filter(d => d.type === "CUSTOMER_REGISTRATION" || d.type === "CUSTOMER_REQUEST").length,
    staffRequests: allDocs.filter(d => d.type === "STAFF_REGISTRATION" || d.type === "STAFF_REQUEST").length,
  };

  return res.status(200).json(new ApiResponse(200, { items, stats }, "Requests fetched successfully"));
});

export const getRequestDetails = asynchandler(async (req, res) => {
  const { id } = req.params;
  const doc = await ChangeRequest.findById(id)
    .populate("userId", "customerName firstName email customerNumber role isActive")
    .populate("reviewedBy", "customerName firstName role")
    .populate("createdUserId", "customerName firstName email customerNumber role");

  if (!doc) throw new ApiError(404, "Request not found");
  return res.status(200).json(new ApiResponse(200, doc, "Request details fetched"));
});

export const updateChangeRequest = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { applicantName, mobileNumber, email, address, department, title, description, note, type } = req.body;

  const doc = await ChangeRequest.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (doc.status === "APPROVED" || doc.status === "COMPLETED") {
    throw new ApiError(400, "Cannot edit an already approved or completed request");
  }

  if (applicantName !== undefined) doc.applicantName = applicantName.trim();
  if (mobileNumber !== undefined) doc.mobileNumber = String(mobileNumber).trim();
  if (email !== undefined) doc.email = email.trim().toLowerCase();
  if (address !== undefined) doc.address = address.trim();
  if (department !== undefined) doc.department = department.trim();
  if (title !== undefined) doc.title = title.trim();
  if (description !== undefined) doc.description = description.trim();
  if (note !== undefined) doc.note = note.trim();
  if (type !== undefined) doc.type = type;

  await doc.save();
  return res.status(200).json(new ApiResponse(200, doc, "Request updated successfully"));
});

export const reviewChangeRequest = asynchandler(async (req, res) => {
  const { id } = req.params;
  const { action, reviewNote, initialPassword } = req.body; // action: APPROVE | REJECT | COMPLETE

  const doc = await ChangeRequest.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  if (!["APPROVE", "REJECT", "COMPLETE"].includes(action)) {
    throw new ApiError(400, "Invalid action. Must be APPROVE, REJECT, or COMPLETE");
  }

  // Idempotency: prevent double approvals / race conditions
  if (action === "APPROVE" && (doc.status === "APPROVED" || doc.createdUserId)) {
    throw new ApiError(400, "This request has already been approved and the account was created.");
  }

  if (action === "REJECT") {
    doc.status = "REJECTED";
    doc.reviewNote = (reviewNote || "").trim();
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
    await doc.save();
    return res.status(200).json(new ApiResponse(200, doc, "Request rejected"));
  }

  // APPROVE WORKFLOW: Account creation / role initialization
  let createdAccount = null;

  if (doc.type === "CUSTOMER_REGISTRATION" || doc.type === "CUSTOMER_REQUEST") {
    const rawMobile = doc.mobileNumber || (doc.userId ? (await User.findById(doc.userId))?.customerNumber : null);
    const cleanMobile = rawMobile ? String(rawMobile).trim() : `CUST${Date.now()}`;
    const targetEmail = doc.email || `${cleanMobile}@korder.keshavkrupa.com`;
    const fullName = doc.applicantName || doc.title || "Customer";
    const firstName = fullName.split(" ")[0] || "Customer";

    const existed = await User.findOne({ $or: [{ customerNumber: cleanMobile }, { email: targetEmail }] });
    if (existed) {
      doc.createdUserId = existed._id;
      createdAccount = existed;
    } else {
      const newUser = await User.create({
        customerName: fullName,
        firstName,
        email: targetEmail,
        customerNumber: cleanMobile,
        password: initialPassword || "Korder@123",
        role: "CUSTOMER",
        isActive: true
      });
      doc.createdUserId = newUser._id;
      createdAccount = newUser;
    }
  } else if (doc.type === "STAFF_REGISTRATION" || doc.type === "STAFF_REQUEST") {
    const rawMobile = doc.mobileNumber || (doc.userId ? (await User.findById(doc.userId))?.customerNumber : null);
    const cleanMobile = rawMobile ? String(rawMobile).trim() : `STAFF${Date.now()}`;
    const targetEmail = doc.email || `${cleanMobile}@staff.keshavkrupa.com`;
    const fullName = doc.applicantName || doc.title || "Staff Member";
    const firstName = fullName.split(" ")[0] || "Staff";

    const existed = await User.findOne({ $or: [{ customerNumber: cleanMobile }, { email: targetEmail }] });
    if (existed) {
      existed.role = "STAFF";
      await existed.save();
      doc.createdUserId = existed._id;
      createdAccount = existed;
    } else {
      const newUser = await User.create({
        customerName: fullName,
        firstName,
        email: targetEmail,
        customerNumber: cleanMobile,
        password: initialPassword || "Staff@123",
        role: "STAFF",
        isActive: true
      });
      doc.createdUserId = newUser._id;
      createdAccount = newUser;
    }
  } else if (doc.userId) {
    // User profile or password update request from logged-in user
    const user = await User.findById(doc.userId);
    if (user) {
      if (doc.type === "PROFILE_UPDATE" && doc.payload) {
        Object.assign(user, doc.payload);
        await user.save();
      }
      if (doc.type === "PASSWORD_RESET" && doc.payload?.newPassword) {
        user.password = doc.payload.newPassword;
        user.refreshToken = undefined;
        await user.save();
      }
      createdAccount = user;
    }
  }

  doc.status = action === "COMPLETE" ? "COMPLETED" : "APPROVED";
  doc.reviewNote = (reviewNote || "").trim();
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();
  await doc.save();

  return res.status(200).json(new ApiResponse(200, { request: doc, account: createdAccount }, `Request marked as ${doc.status}`));
});

export const deleteChangeRequest = asynchandler(async (req, res) => {
  const { id } = req.params;
  const doc = await ChangeRequest.findById(id);
  if (!doc) throw new ApiError(404, "Request not found");

  await ChangeRequest.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, null, "Request deleted successfully"));
});
