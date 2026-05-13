import asyncHandler from "../Utils/asyncHandler.js";
import { sendError, sendSuccess } from "../Utils/apiResponse.js";
import Accounting from "../Models/Accounting.js";
import Carrier from "../Models/Carrier.js";
import DirectBill from "../Models/DirectBill.js";
import Document from "../Models/Document.js";
import Driver from "../Models/Driver.js";
import Factoring from "../Models/Factoring.js";
import Load from "../Models/Load.js";
import Settlement from "../Models/Settlement.js";
import Tracking from "../Models/Tracking.js";
import Truck from "../Models/Truck.js";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const chartDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const toNumber = (value) => Number(value || 0);
const round = (value, decimals = 2) => Number(toNumber(value).toFixed(decimals));

const parseDateRange = (query = {}) => {
  const range = {};

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (Number.isNaN(startDate.getTime())) return { error: "Invalid startDate" };
    startDate.setHours(0, 0, 0, 0);
    range.startDate = startDate;
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (Number.isNaN(endDate.getTime())) return { error: "Invalid endDate" };
    endDate.setHours(23, 59, 59, 999);
    range.endDate = endDate;
  }

  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    return { error: "startDate must be before endDate" };
  }

  return { range };
};

const buildDateMatch = (field, range = {}) => {
  if (!range.startDate && !range.endDate) return {};
  const dateMatch = {};
  if (range.startDate) dateMatch.$gte = range.startDate;
  if (range.endDate) dateMatch.$lte = range.endDate;
  return { [field]: dateMatch };
};

const count = (model, filter = {}) => model.countDocuments(filter);

const sumGroup = async (model, match, fields) => {
  const group = { _id: null };
  for (const [key, field] of Object.entries(fields)) {
    group[key] = { $sum: { $ifNull: [`$${field}`, 0] } };
  }

  const rows = await model.aggregate([{ $match: match }, { $group: group }]);
  return rows[0] || {};
};

const getWeekBounds = (date = new Date()) => {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const buildEmptyWeek = (metric) => chartDayLabels.map((day) => ({ day, [metric]: 0 }));

const getWeeklySales = async (range) => {
  let week = getWeekBounds(new Date());

  if (range.startDate || range.endDate) {
    week = {
      start: range.startDate || week.start,
      end: range.endDate || range.end,
    };
  } else {
    const currentWeekCount = await DirectBill.countDocuments({ invoiceDate: { $gte: week.start, $lte: week.end } });
    if (!currentWeekCount) {
      const latestBill = await DirectBill.findOne({ invoiceDate: { $ne: null } }).sort({ invoiceDate: -1 }).select("invoiceDate").lean();
      if (latestBill?.invoiceDate) week = getWeekBounds(latestBill.invoiceDate);
    }
  }

  const rows = await DirectBill.aggregate([
    { $match: { invoiceDate: { $gte: week.start, $lte: week.end } } },
    {
      $group: {
        _id: { $dayOfWeek: "$invoiceDate" },
        sales: { $sum: { $ifNull: ["$totalAmount", 0] } },
      },
    },
  ]);

  const values = new Map(rows.map((row) => [dayLabels[row._id - 1], round(row.sales)]));
  return chartDayLabels.map((day) => ({ day, sales: values.get(day) || 0 }));
};

const getWeeklyMargin = async (range) => {
  let week = getWeekBounds(new Date());

  if (range.startDate || range.endDate) {
    week = {
      start: range.startDate || week.start,
      end: range.endDate || range.end,
    };
  } else {
    const latestRecord = await Accounting.findOne({ createdAt: { $ne: null } }).sort({ createdAt: -1 }).select("createdAt").lean();
    if (latestRecord?.createdAt) week = getWeekBounds(latestRecord.createdAt);
  }

  const rows = await Accounting.aggregate([
    { $match: { createdAt: { $gte: week.start, $lte: week.end } } },
    {
      $project: {
        createdAt: 1,
        margin: {
          $subtract: [
            { $ifNull: ["$customerBilling.amount", 0] },
            { $ifNull: ["$carrierPayment.amount", 0] },
          ],
        },
      },
    },
    {
      $group: {
        _id: { $dayOfWeek: "$createdAt" },
        margin: { $sum: "$margin" },
      },
    },
  ]);

  const values = new Map(rows.map((row) => [dayLabels[row._id - 1], round(row.margin)]));
  return chartDayLabels.map((day) => ({ day, margin: values.get(day) || 0 }));
};

const getPlanSummary = async (range) => {
  const loadDateMatch = buildDateMatch("createdAt", range);
  const [
    totalLoads,
    openLoads,
    assignedLoads,
    inTransitLoads,
    deliveredLoads,
    completedLoads,
    cancelledLoads,
    needCover,
    readyForBilling,
  ] = await Promise.all([
    count(Load, loadDateMatch),
    count(Load, { ...loadDateMatch, status: "Open" }),
    count(Load, { ...loadDateMatch, status: "Assigned" }),
    count(Load, { ...loadDateMatch, status: "In Transit" }),
    count(Load, { ...loadDateMatch, status: "Delivered" }),
    count(Load, { ...loadDateMatch, status: "Completed" }),
    count(Load, { ...loadDateMatch, status: "Cancelled" }),
    count(Load, { ...loadDateMatch, coverStatus: "Need Cover" }),
    count(Load, { ...loadDateMatch, status: "Ready for Billing" }),
  ]);

  return {
    totalLoads,
    openLoads,
    assignedLoads,
    inTransitLoads,
    deliveredLoads,
    completedLoads,
    cancelledLoads,
    needCover,
    readyForBilling,
  };
};

const getShipSummary = async (range) => {
  const loadDateMatch = buildDateMatch("createdAt", range);
  const trackingDateMatch = buildDateMatch("createdAt", range);
  const [totalShipments, trackingRecords, inTransitLoads, deliveredShipments, onTimeDeliveries, delayedShipments, criticalShipments, progressRows] =
    await Promise.all([
      count(Load, loadDateMatch),
      count(Tracking, trackingDateMatch),
      count(Load, { ...loadDateMatch, status: "In Transit" }),
      count(Load, { ...loadDateMatch, status: { $in: ["Delivered", "Completed"] } }),
      count(Tracking, { ...trackingDateMatch, status: "On Time" }),
      count(Tracking, { ...trackingDateMatch, status: "Delayed" }),
      count(Tracking, { ...trackingDateMatch, status: "Critical" }),
      Tracking.aggregate([
        { $match: trackingDateMatch },
        { $group: { _id: null, avgProgress: { $avg: { $ifNull: ["$routeProgress", 0] } } } },
      ]),
    ]);

  return {
    totalShipments,
    activeShipments: trackingRecords || inTransitLoads,
    deliveredShipments,
    onTimeDeliveries,
    delayedShipments,
    criticalShipments,
    avgProgress: round(progressRows[0]?.avgProgress || 0),
  };
};

const getBillSummary = async (range) => {
  const directBillMatch = buildDateMatch("invoiceDate", range);
  const directBillTotal = await DirectBill.countDocuments(directBillMatch);

  if (directBillTotal) {
    const [summary, pendingBills, paidBills, overdueBills, disputedBills] = await Promise.all([
      sumGroup(DirectBill, directBillMatch, {
        totalBilled: "totalAmount",
        totalPaid: "paidAmount",
        totalBalance: "balanceDue",
      }),
      count(DirectBill, { ...directBillMatch, paymentStatus: "Pending" }),
      count(DirectBill, { ...directBillMatch, paymentStatus: "Paid" }),
      count(DirectBill, { ...directBillMatch, paymentStatus: "Overdue" }),
      count(DirectBill, { ...directBillMatch, $or: [{ disputeStatus: "Open" }, { billStatus: "Disputed" }] }),
    ]);

    return {
      totalBilled: round(summary.totalBilled),
      totalPaid: round(summary.totalPaid),
      totalBalance: round(summary.totalBalance),
      pendingBills,
      paidBills,
      overdueBills,
      disputedBills,
    };
  }

  const accountingMatch = buildDateMatch("createdAt", range);
  const [summary, pendingBills, paidBills, overdueBills, disputedBills] = await Promise.all([
    sumGroup(Accounting, accountingMatch, {
      totalBilled: "customerBilling.amount",
      totalPaid: "customerBilling.amount",
    }),
    count(Accounting, { ...accountingMatch, "customerBilling.status": { $in: ["Not Invoiced", "Invoiced"] } }),
    count(Accounting, { ...accountingMatch, "customerBilling.status": "Paid" }),
    count(Accounting, { ...accountingMatch, "customerBilling.status": "Overdue" }),
    count(Accounting, { ...accountingMatch, $or: [{ disputeStatus: "Open" }, { "customerBilling.status": "Disputed" }] }),
  ]);

  const totalBilled = round(summary.totalBilled);
  const totalPaid = round(summary.totalPaid);
  return {
    totalBilled,
    totalPaid,
    totalBalance: Math.max(0, round(totalBilled - totalPaid)),
    pendingBills,
    paidBills,
    overdueBills,
    disputedBills,
  };
};

const getBilling = async (range) => {
  const accountingMatch = buildDateMatch("createdAt", range);
  const [summaryRows, pendingInvoices, paidInvoices, openDisputes] = await Promise.all([
    Accounting.aggregate([
      { $match: accountingMatch },
      {
        $group: {
          _id: null,
          customerBilling: { $sum: { $ifNull: ["$customerBilling.amount", 0] } },
          carrierPay: { $sum: { $ifNull: ["$carrierPayment.amount", 0] } },
        },
      },
    ]),
    count(Accounting, { ...accountingMatch, "customerBilling.status": { $in: ["Not Invoiced", "Invoiced"] } }),
    count(Accounting, { ...accountingMatch, "customerBilling.status": "Paid" }),
    count(Accounting, { ...accountingMatch, disputeStatus: "Open" }),
  ]);

  const summary = summaryRows[0] || {};
  const customerBilling = round(summary.customerBilling);
  const carrierPay = round(summary.carrierPay);
  const grossMargin = round(customerBilling - carrierPay);

  return {
    customerBilling,
    carrierPay,
    grossMargin,
    marginPercent: customerBilling > 0 ? round((grossMargin / customerBilling) * 100) : 0,
    pendingInvoices,
    paidInvoices,
    openDisputes,
  };
};

const getTopCustomers = async (range) => {
  const directBillMatch = buildDateMatch("invoiceDate", range);
  const directBillCount = await DirectBill.countDocuments(directBillMatch);

  if (directBillCount) {
    const rows = await DirectBill.aggregate([
      { $match: directBillMatch },
      {
        $group: {
          _id: "$customerName",
          loads: { $sum: 1 },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          paidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          balanceDue: { $sum: { $ifNull: ["$balanceDue", 0] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    return rows.map((row) => ({
      customerName: row._id || "Unknown Customer",
      loads: row.loads || 0,
      revenue: round(row.revenue),
      paidAmount: round(row.paidAmount),
      balanceDue: round(row.balanceDue),
    }));
  }

  const accountingMatch = buildDateMatch("createdAt", range);
  const rows = await Accounting.aggregate([
    { $match: accountingMatch },
    {
      $group: {
        _id: "$customerName",
        loads: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$customerBilling.amount", 0] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  return rows.map((row) => ({
    customerName: row._id || "Unknown Customer",
    loads: row.loads || 0,
    revenue: round(row.revenue),
    paidAmount: 0,
    balanceDue: 0,
  }));
};

const getLeaderboard = async (range) => {
  const createdAtMatch = buildDateMatch("createdAt", range);
  const [drivers, carriers] = await Promise.all([
    Driver.find(createdAtMatch).sort({ completedLoads: -1, onTimeRate: -1 }).limit(10).lean(),
    Carrier.find(createdAtMatch).sort({ onTimeRate: -1, activeLoads: -1 }).limit(10).lean(),
  ]);

  const driverRows = drivers.map((driver) => ({
    name: driver.driverName,
    type: "Driver",
    loads: toNumber(driver.completedLoads) + toNumber(driver.assignedLoads),
    onTimeRate: toNumber(driver.onTimeRate),
    revenue: 0,
    status: driver.availabilityStatus || "Unknown",
  }));

  const carrierRows = carriers.map((carrier) => ({
    name: carrier.carrierName,
    type: "Carrier",
    loads: toNumber(carrier.activeLoads),
    onTimeRate: toNumber(carrier.onTimeRate),
    revenue: round((carrier.assignedLoads || []).reduce((sum, load) => sum + toNumber(load.amount), 0)),
    status: carrier.status || "Unknown",
  }));

  return [...driverRows, ...carrierRows]
    .sort((a, b) => b.loads - a.loads || b.onTimeRate - a.onTimeRate)
    .slice(0, 10);
};

const getTotalShipments = async (range) => {
  const total = await count(Load, buildDateMatch("createdAt", range));
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth] = await Promise.all([
    count(Load, { createdAt: { $gte: thisMonthStart, $lt: nextMonthStart } }),
    count(Load, { createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),
  ]);

  return {
    total,
    thisMonth,
    lastMonth,
    changePercent: lastMonth > 0 ? round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0,
  };
};

const getOperations = async (range) => {
  const createdAtMatch = buildDateMatch("createdAt", range);
  const [
    activeCarriers,
    activeDrivers,
    activeTrucks,
    availableDrivers,
    availableTrucks,
    documentsPending,
    documentsBlurry,
    trackingOnTime,
    trackingDelayed,
    trackingCritical,
  ] = await Promise.all([
    count(Carrier, { ...createdAtMatch, status: "Active" }),
    count(Driver, { ...createdAtMatch, availabilityStatus: { $in: ["Available", "On Load"] } }),
    count(Truck, { ...createdAtMatch, status: "Active" }),
    count(Driver, { ...createdAtMatch, availabilityStatus: "Available" }),
    count(Truck, { ...createdAtMatch, status: "Active", activeLoads: { $lte: 1 } }),
    count(Document, { ...createdAtMatch, status: "Pending Check" }),
    count(Document, { ...createdAtMatch, status: "Blurry" }),
    count(Tracking, { ...createdAtMatch, status: "On Time" }),
    count(Tracking, { ...createdAtMatch, status: "Delayed" }),
    count(Tracking, { ...createdAtMatch, status: "Critical" }),
  ]);

  return {
    activeCarriers,
    activeDrivers,
    activeTrucks,
    availableDrivers,
    availableTrucks,
    documentsPending,
    documentsBlurry,
    trackingOnTime,
    trackingDelayed,
    trackingCritical,
  };
};

const getFinancials = async (range) => {
  const directBillMatch = buildDateMatch("invoiceDate", range);
  const factoringMatch = buildDateMatch("submissionDate", range);
  const settlementMatch = buildDateMatch("settlementDate", range);

  const [
    directBills,
    factoring,
    settlements,
    factoringFunded,
    settlementsPendingApproval,
    settlementsPaid,
  ] = await Promise.all([
    sumGroup(DirectBill, directBillMatch, { totalDirectBills: "totalAmount" }),
    sumGroup(Factoring, factoringMatch, { totalFactoringAmount: "amount" }),
    sumGroup(Settlement, settlementMatch, {
      totalSettlementPay: "netPay",
      totalSettlementBalance: "balanceDue",
    }),
    count(Factoring, { ...factoringMatch, paymentStatus: { $in: ["Funded", "Paid"] } }),
    count(Settlement, { ...settlementMatch, approvalStatus: "Pending" }),
    count(Settlement, { ...settlementMatch, paymentStatus: "Paid" }),
  ]);

  return {
    totalDirectBills: round(directBills.totalDirectBills),
    totalFactoringAmount: round(factoring.totalFactoringAmount),
    totalSettlementPay: round(settlements.totalSettlementPay),
    totalSettlementBalance: round(settlements.totalSettlementBalance),
    factoringFunded,
    settlementsPendingApproval,
    settlementsPaid,
  };
};

const getRecentActivity = async (range) => {
  const createdAtMatch = buildDateMatch("createdAt", range);
  const directBillMatch = buildDateMatch("invoiceDate", range);
  const settlementMatch = buildDateMatch("settlementDate", range);
  const factoringMatch = buildDateMatch("submissionDate", range);

  const [loads, documents, directBills, settlements, factoring] = await Promise.all([
    Load.find(createdAtMatch).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
    Document.find(createdAtMatch).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
    DirectBill.find(directBillMatch).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
    Settlement.find(settlementMatch).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
    Factoring.find(factoringMatch).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
  ]);

  return [
    ...loads.map((load) => ({
      type: "Load",
      title: `Load ${load.loadNumber} updated`,
      description: `${load.customerName} load is ${load.status}`,
      createdAt: load.updatedAt || load.createdAt,
    })),
    ...documents.map((document) => ({
      type: "Document",
      title: `${document.documentType} document ${document.status}`,
      description: `${document.originalName || document.fileName} for ${document.loadNumber || document.relatedType}`,
      createdAt: document.updatedAt || document.createdAt,
    })),
    ...directBills.map((bill) => ({
      type: "Direct Bill",
      title: `Invoice ${bill.invoiceNumber} is ${bill.paymentStatus}`,
      description: `${bill.customerName} balance due ${round(bill.balanceDue)}`,
      createdAt: bill.updatedAt || bill.createdAt || bill.invoiceDate,
    })),
    ...settlements.map((settlement) => ({
      type: "Settlement",
      title: `Settlement ${settlement.settlementNumber} is ${settlement.status}`,
      description: `${settlement.carrierName} net pay ${round(settlement.netPay)}`,
      createdAt: settlement.updatedAt || settlement.createdAt || settlement.settlementDate,
    })),
    ...factoring.map((record) => ({
      type: "Factoring",
      title: `Factoring ${record.invoiceNumber} is ${record.factoringStatus}`,
      description: `${record.factoringCompany} net pay ${round(record.netPay)}`,
      createdAt: record.updatedAt || record.createdAt || record.submissionDate,
    })),
  ]
    .filter((activity) => activity.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
};

const buildDashboardData = async (range) => {
  const [
    planSummary,
    shipSummary,
    billSummary,
    weeklySales,
    weeklyMargin,
    billing,
    topCustomers,
    leaderboard,
    totalShipments,
    operations,
    financials,
    recentActivity,
  ] = await Promise.all([
    getPlanSummary(range),
    getShipSummary(range),
    getBillSummary(range),
    getWeeklySales(range),
    getWeeklyMargin(range),
    getBilling(range),
    getTopCustomers(range),
    getLeaderboard(range),
    getTotalShipments(range),
    getOperations(range),
    getFinancials(range),
    getRecentActivity(range),
  ]);

  return {
    planSummary,
    shipSummary,
    billSummary,
    weeklySales,
    weeklyMargin,
    billing,
    topCustomers,
    leaderboard,
    totalShipments,
    operations,
    financials,
    recentActivity,
  };
};

const withDateRange = async (req, res, callback) => {
  const { range, error } = parseDateRange(req.query);
  if (error) return sendError(res, error, 400);
  return callback(range || {});
};

export const getDashboardSummary = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const data = await buildDashboardData(range);
    return sendSuccess(res, "Dashboard summary fetched successfully", data);
  })
);

export const getDashboardStats = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const [planSummary, shipSummary, billSummary, operations, financials] = await Promise.all([
      getPlanSummary(range),
      getShipSummary(range),
      getBillSummary(range),
      getOperations(range),
      getFinancials(range),
    ]);
    return sendSuccess(res, "Dashboard stats fetched successfully", {
      planSummary,
      shipSummary,
      billSummary,
      operations,
      financials,
    });
  })
);

export const getDashboardCharts = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const [weeklySales, weeklyMargin] = await Promise.all([getWeeklySales(range), getWeeklyMargin(range)]);
    return sendSuccess(res, "Dashboard charts fetched successfully", { weeklySales, weeklyMargin });
  })
);

export const getDashboardTopCustomers = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const topCustomers = await getTopCustomers(range);
    return sendSuccess(res, "Top customers fetched successfully", { topCustomers });
  })
);

export const getDashboardLeaderboard = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const leaderboard = await getLeaderboard(range);
    return sendSuccess(res, "Dashboard leaderboard fetched successfully", { leaderboard });
  })
);

export const getDashboardBilling = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const billing = await getBilling(range);
    return sendSuccess(res, "Dashboard billing fetched successfully", { billing });
  })
);

export const getDashboardOperations = asyncHandler(async (req, res) =>
  withDateRange(req, res, async (range) => {
    const operations = await getOperations(range);
    return sendSuccess(res, "Dashboard operations fetched successfully", { operations });
  })
);
