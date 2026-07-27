import mongoose from "mongoose";

const returnProductSchema = new mongoose.Schema(
  {
    returnNo: { type: String, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    
    qty: { type: Number, required: true, min: 0.01 },
    unit: { type: String, trim: true, default: "pcs" },
    reason: { type: String, required: true, trim: true },
    condition: {
      type: String,
      enum: ["GOOD", "DAMAGED", "EXPIRED", "DEFECTIVE"],
      default: "GOOD",
    },
    remarks: { type: String, trim: true, maxlength: 1000 },
    
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "RESTOCKED", "DISPOSED"],
      default: "PENDING",
      index: true,
    },
    
    images: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

returnProductSchema.pre("save", function () {
  if (!this.isNew) return;
  const ts = Date.now().toString().slice(-6);
  this.returnNo = `RET-${ts}-${Math.floor(100 + Math.random() * 900)}`;
});

const ReturnProduct = mongoose.model("ReturnProduct", returnProductSchema);
export default ReturnProduct;
