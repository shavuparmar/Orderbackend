const fs = require('fs');

const path = 'f:/Projects/Korder/Korder/backend/src/controllers/payment.controller.js';
let content = fs.readFileSync(path, 'utf8');

// Replace export list
content = content.replace(
  /export \{ getMyStatement, getUserStatement, addPaymentEntry, updatePaymentEntry, deletePaymentEntry \};/,
  'export { getMyStatement, getMyPaymentSummary, getUserStatement, addPaymentEntry, updatePaymentEntry, deletePaymentEntry };'
);

// Add getMyPaymentSummary wrapped inside template literals
const addStr = `export const getMyPaymentSummary = asynchandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select("_id customerName customerNumber email");
  if (!user) throw new ApiError(404, "User not found");

  const orders = await Order.find({ userId, status: { $ne: "CANCELLED" } });
  const totalOrderAmount = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const lastOrderAt = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

  const payment = await Payment.findOne({ userId }).populate("entries.updatedBy", "firstName role");
  const entries = payment?.entries || [];
  const totalReceived = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  const pendingAmount = totalOrderAmount - totalReceived;

  return res.status(200).json(new ApiResponse(200, {
    user,
    totalOrderAmount,
    totalReceived,
    pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
    lastOrderAt,
    entries
  }, "My payment summary"));
});\n`;

if (!content.includes('getMyPaymentSummary = asynchandler')) {
  content = content.replace('export const getUserPaymentSummary', addStr + '\nexport const getUserPaymentSummary');
}

fs.writeFileSync(path, content);
console.log('payment.controller.js patched successfully');