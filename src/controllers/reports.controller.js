import { asynchandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.models.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Payment from "../models/payment.model.js";
import ReturnProduct from "../models/ReturnProduct.model.js";
import StockIn from "../models/stockIn.model.js";

export const getDashboardStats = asynchandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    allOrders,
    allProducts,
    allUsers,
    allPayments,
    allReturns,
    allStockIns
  ] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).lean(),
    Product.find({ isDeleted: false }).lean(),
    User.find().lean(),
    Payment.find().lean(),
    ReturnProduct.find().populate("productId", "price name").lean(),
    StockIn.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  // Order Metrics
  const ordersToday = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
  const ordersThisMonth = allOrders.filter(o => new Date(o.createdAt) >= monthStart);
  const ordersThisYear = allOrders.filter(o => new Date(o.createdAt) >= yearStart);

  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter(o => ["PLACED", "ACCEPTED", "CONFIRMED", "PREPARING", "IN_PROGRESS"].includes(o.status)).length;
  const completedOrders = allOrders.filter(o => ["COMPLETED", "DELIVERED"].includes(o.status)).length;
  const cancelledOrders = allOrders.filter(o => o.status === "CANCELLED").length;

  // Revenue Calculations
  const revenueTotal = allOrders.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const revenueToday = ordersToday.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const revenueThisMonth = ordersThisMonth.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // User & Staff Counts
  const totalCustomers = allUsers.filter(u => u.role === "USER" || !u.role).length;
  const activeStaff = allUsers.filter(u => u.role === "STAFF" && u.isActive !== false).length;

  // Inventory Metrics
  const totalProducts = allProducts.length;
  const stockValue = allProducts.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
  const lowStockCount = allProducts.filter(p => (p.stock || 0) <= 10 && (p.stock || 0) > 0).length;
  const outOfStockCount = allProducts.filter(p => (p.stock || 0) <= 0).length;

  // Return Metrics
  const returnProductsCount = allReturns.length;
  const returnProductsValue = allReturns.reduce((sum, r) => sum + ((r.qty || 0) * (r.productId?.price || 0)), 0);

  // Payments Collection Today
  let todayCollection = 0;
  allPayments.forEach((pDoc) => {
    (pDoc.entries || []).forEach((e) => {
      if (new Date(e.date || 0) >= todayStart) {
        todayCollection += e.amount || 0;
      }
    });
  });

  // Analytics: Average Order Value & Completion Rate
  const validOrdersCount = allOrders.filter(o => o.status !== "CANCELLED").length;
  const averageOrderValue = validOrdersCount > 0 ? Math.round(revenueTotal / validOrdersCount) : 0;
  const orderCompletionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const returnRate = validOrdersCount > 0 ? ((returnProductsCount / validOrdersCount) * 100).toFixed(1) : 0;

  // Category Breakdown
  const categorySalesMap = {};
  allOrders.forEach(o => {
    if (o.status !== "CANCELLED") {
      (o.items || []).forEach(it => {
        const cat = it.category || "General";
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + ((it.price || 0) * (it.qty || 0));
      });
    }
  });
  const topCategories = Object.keys(categorySalesMap).map(cat => ({
    name: cat,
    value: categorySalesMap[cat]
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  // Top Products Breakdown
  const productSalesMap = {};
  allOrders.forEach(o => {
    if (o.status !== "CANCELLED") {
      (o.items || []).forEach(it => {
        const name = it.name || "Product";
        if (!productSalesMap[name]) productSalesMap[name] = { qty: 0, revenue: 0 };
        productSalesMap[name].qty += (it.qty || 0);
        productSalesMap[name].revenue += ((it.price || 0) * (it.qty || 0));
      });
    }
  });
  const topProducts = Object.keys(productSalesMap).map(pName => ({
    name: pName,
    qty: productSalesMap[pName].qty,
    revenue: productSalesMap[pName].revenue
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Last 7 Days Daily Revenue & Orders Trend
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const dayOrders = allOrders.filter(o => {
      const dt = new Date(o.createdAt);
      return dt >= dayStart && dt <= dayEnd;
    });

    const dayRev = dayOrders.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    last7Days.push({
      day: dayStr,
      revenue: dayRev,
      orders: dayOrders.length
    });
  }

  // Recent Activity Timeline
  const recentActivities = [];
  allOrders.slice(0, 5).forEach(o => {
    recentActivities.push({
      id: o._id,
      type: "ORDER",
      title: `Order #${o.orderNo || o._id.toString().slice(-6)}`,
      status: o.status,
      amount: o.grandTotal,
      time: o.createdAt
    });
  });
  allReturns.slice(0, 3).forEach(r => {
    recentActivities.push({
      id: r._id,
      type: "RETURN",
      title: `Return #${r.returnNo || "RET"}`,
      status: r.status,
      amount: (r.qty || 0) * (r.productId?.price || 0),
      time: r.createdAt
    });
  });
  recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        kpis: {
          ordersToday: ordersToday.length,
          ordersThisMonth: ordersThisMonth.length,
          ordersThisYear: ordersThisYear.length,
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          revenueToday,
          revenueThisMonth,
          revenueTotal,
          totalCustomers,
          activeStaff,
          totalProducts,
          stockValue,
          lowStockCount,
          outOfStockCount,
          returnProductsCount,
          returnProductsValue,
          todayCollection,
          averageOrderValue,
          orderCompletionRate,
          returnRate
        },
        charts: {
          weeklyTrend: last7Days,
          topCategories,
          topProducts,
          orderStatusDistribution: [
            { name: "Pending", count: pendingOrders },
            { name: "Completed", count: completedOrders },
            { name: "Cancelled", count: cancelledOrders }
          ]
        },
        recentActivities: recentActivities.slice(0, 8),
        latestOrders: allOrders.slice(0, 6)
      },
      "Enterprise dashboard statistics fetched successfully"
    )
  );
});

export const getStaffDashboardStats = asynchandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Parallel DB queries for maximum speed
  const [
    allOrders,
    todayOrders,
    products,
    todayReturns,
    payments,
    todayStockIns,
    usersCount,
  ] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(100).lean(),
    Order.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    Product.find({ isDeleted: false, isActive: true }).lean(),
    ReturnProduct.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    Payment.find().lean(),
    StockIn.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    User.countDocuments({ role: "USER" }),
  ]);

  // Status breakdown for Today
  const todayPlaced = todayOrders.filter((o) => o.status === "PLACED").length;
  const todayAccepted = todayOrders.filter((o) => o.status === "ACCEPTED" || o.status === "CONFIRMED").length;
  const todayPreparing = todayOrders.filter((o) => o.status === "PREPARING" || o.status === "IN_PROGRESS").length;
  const todayReady = todayOrders.filter((o) => o.status === "READY").length;
  const todayDelivered = todayOrders.filter((o) => o.status === "COMPLETED" || o.status === "DELIVERED").length;
  const todayCancelled = todayOrders.filter((o) => o.status === "CANCELLED").length;

  const todayRevenue = todayOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

  // Active Orders (Not COMPLETED, DELIVERED, CANCELLED)
  const activeOrdersCount = allOrders.filter(
    (o) => !["COMPLETED", "DELIVERED", "CANCELLED"].includes(o.status)
  ).length;

  // Stock Metrics
  const lowStockThreshold = 10;
  const lowStockItems = products.filter((p) => (p.stock || 0) <= lowStockThreshold);
  const outOfStockItems = products.filter((p) => (p.stock || 0) <= 0);

  // Payments Collection Today
  let todayCollection = 0;
  let cashPayments = 0;
  let upiPayments = 0;
  let onlinePayments = 0;

  payments.forEach((pDoc) => {
    (pDoc.entries || []).forEach((e) => {
      const eDate = new Date(e.date || 0);
      if (eDate >= todayStart && eDate <= todayEnd) {
        todayCollection += e.amount || 0;
        if (e.paymentMethod === "CASH") cashPayments += e.amount || 0;
        else if (e.paymentMethod === "UPI") upiPayments += e.amount || 0;
        else onlinePayments += e.amount || 0;
      }
    });
  });

  // Hourly Order distribution (00:00 to 23:00)
  const hourlyOrders = Array(24).fill(0);
  todayOrders.forEach((o) => {
    const hr = new Date(o.createdAt).getHours();
    hourlyOrders[hr] += 1;
  });

  // Category sales breakdown
  const categorySalesMap = {};
  allOrders.forEach((o) => {
    if (o.status !== "CANCELLED") {
      (o.items || []).forEach((it) => {
        const cat = it.category || "General";
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + (it.price || 0) * (it.qty || 0);
      });
    }
  });

  const categorySales = Object.keys(categorySalesMap).map((cat) => ({
    category: cat,
    sales: categorySalesMap[cat],
  }));

  // Build Recent Activity Feed
  const recentActivities = [];
  allOrders.slice(0, 5).forEach((o) => {
    recentActivities.push({
      type: "ORDER",
      title: `Order ${o.orderNo} (${o.status})`,
      time: o.createdAt,
      amount: o.grandTotal,
    });
  });
  todayStockIns.slice(0, 3).forEach((s) => {
    recentActivities.push({
      type: "STOCK",
      title: `Stock-in logged: ${s.carets} carets`,
      time: s.createdAt,
      amount: s.totalAmount,
    });
  });
  todayReturns.slice(0, 3).forEach((r) => {
    recentActivities.push({
      type: "RETURN",
      title: `Return logged: ${r.returnNo} (${r.status})`,
      time: r.createdAt,
      amount: 0,
    });
  });

  recentActivities.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        kpis: {
          todayOrdersCount: todayOrders.length,
          todayPlaced,
          todayAccepted,
          todayPreparing,
          todayReady,
          todayDelivered,
          todayCancelled,
          todayRevenue,
          activeOrdersCount,
          totalCustomersServed: usersCount,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          todayReturnsCount: todayReturns.length,
          todayCollection,
          cashPayments,
          upiPayments,
          onlinePayments,
          todayStockInsCount: todayStockIns.length,
        },
        charts: {
          hourlyOrders,
          categorySales,
          orderStatusDistribution: [
            { name: "Placed", count: todayPlaced },
            { name: "Accepted", count: todayAccepted },
            { name: "Preparing", count: todayPreparing },
            { name: "Ready", count: todayReady },
            { name: "Delivered", count: todayDelivered },
            { name: "Cancelled", count: todayCancelled },
          ],
        },
        recentActivities: recentActivities.slice(0, 8),
        latestOrders: allOrders.slice(0, 6),
        lowStockItems: lowStockItems.slice(0, 6),
      },
      "Staff dashboard analytics fetched"
    )
  );
});
