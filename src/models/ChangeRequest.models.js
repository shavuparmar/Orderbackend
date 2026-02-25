import mongoose from "mongoose";

const changeRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: ["PROFILE_UPDATE", "PASSWORD_RESET"], required: true },

    // for PROFILE_UPDATE: payload = { customerName?, firstName?, email?, customerNumber? }
    // for PASSWORD_RESET: payload = { newPassword }
    payload: { type: Object, required: true },

    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },

    requestedByRole: { type: String, enum: ["USER", "STAFF"], required: true },
    note: { type: String, trim: true, maxlength: 1000 },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const ChangeRequest = mongoose.model("ChangeRequest", changeRequestSchema);
export default ChangeRequest;
