import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      index: true,
    },
    sku: { type: String, trim: true, uppercase: true, index: true },

    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },

    stock: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, default: "pcs" },

    description: { type: String, trim: true, maxlength: 2000 },
    images: [{ type: String, trim: true }],

    category: { type: String, trim: true, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],

    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, select: false },
    unitsPerCaret: { type: Number, default: 1, min: 1 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

productSchema.index({ name: 1, category: 1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
