import mongoose from "mongoose";

const stockInSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    // store day as "YYYY-MM-DD" for easy grouping/filtering
    day: { type: String, required: true, index: true },

    carets: { type: Number, required: true, min: 0.01 },

    // snapshots (important)
    unitsPerCaretSnapshot: { type: Number, required: true, min: 1 },
    unitPriceSnapshot: { type: Number, required: true, min: 0 },

    totalUnits: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    note: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

stockInSchema.index({ day: 1, productId: 1 });

const StockIn = mongoose.model("StockIn", stockInSchema);
export default StockIn;
