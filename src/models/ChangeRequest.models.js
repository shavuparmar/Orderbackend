import mongoose from "mongoose";

const changeRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, trim: true, default: "General Request" },
    description: { type: String, trim: true, maxlength: 2000 },

    type: {
      type: String,
      enum: [
        "PROFILE_UPDATE",
        "PASSWORD_RESET",
        "PRODUCT_MODIFICATION",
        "STOCK_CORRECTION",
        "RETURN_ADJUSTMENT",
        "ACCESS_REQUEST",
        "FEATURE_REQUEST",
        "GENERAL"
      ],
      default: "GENERAL",
      required: true,
      index: true
    },

    payload: { type: Object, default: {} },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
      index: true
    },

    requestedByRole: { type: String, enum: ["USER", "STAFF", "ADMIN"], required: true },
    note: { type: String, trim: true, maxlength: 1000 },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

const ChangeRequest = mongoose.model("ChangeRequest", changeRequestSchema);
export default ChangeRequest;
