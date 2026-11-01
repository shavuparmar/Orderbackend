import mongoose from "mongoose";

const changeRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, index: true },

    applicantName: { type: String, trim: true },
    mobileNumber: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    department: { type: String, trim: true },

    title: { type: String, trim: true, default: "General Request" },
    description: { type: String, trim: true, maxlength: 2000 },

    type: {
      type: String,
      enum: [
        "CUSTOMER_REGISTRATION",
        "STAFF_REGISTRATION",
        "CUSTOMER_REQUEST",
        "STAFF_REQUEST",
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

    requestedByRole: { type: String, enum: ["CUSTOMER", "STAFF", "ADMIN", "APPLICANT"], default: "APPLICANT" },
    note: { type: String, trim: true, maxlength: 1000 },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },

    createdUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const ChangeRequest = mongoose.model("ChangeRequest", changeRequestSchema);
export default ChangeRequest;
