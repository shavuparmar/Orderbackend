import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true, trim: true }, // snapshot
    price: { type: Number, required: true, min: 0 },     // snapshot
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    items: { type: [orderItemSchema], required: true },

    subtotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["PLACED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PLACED",
      index: true,
    },

    note: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

orderSchema.pre("save", function () {
  if (!this.isNew) return;
  const ts = Date.now().toString().slice(-6);
  this.orderNo = `KOR-${ts}-${Math.floor(100 + Math.random() * 900)}`;
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
