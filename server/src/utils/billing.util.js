const DeliveryRecord = require("../modules/deliveryRecords/deliveryRecord.model");
const Payment = require("../modules/payments/payment.model");
const Customer = require("../modules/customers/customer.model");

async function generateMonthlyBill(tenantId, customerId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const customer = await Customer.findOne({ _id: customerId, tenantId });

  if (!customer) {
    throw new Error("Customer not found");
  }

  // 1️⃣ Total Delivery Amount
  const deliveries = await DeliveryRecord.find({
    tenantId,
    customerId,
    date: { $gte: startDate, $lte: endDate },
    status: "DELIVERED",
  });

  let totalDeliveryAmount = 0;

  deliveries.forEach((record) => {
    totalDeliveryAmount += record.quantity * record.rate;
  });

  // 2️⃣ Total Payments
  const payments = await Payment.find({
    tenantId,
    customerId,
    date: { $gte: startDate, $lte: endDate },
  });

  let totalPayments = 0;

  payments.forEach((payment) => {
    totalPayments += payment.amount;
  });

  // 3️⃣ Final Calculation
  const finalAmount =
    customer.openingBalance +
    totalDeliveryAmount -
    totalPayments;

  return {
    customer: customer.name,
    openingBalance: customer.openingBalance,
    totalDeliveryAmount,
    totalPayments,
    finalAmount,
  };
}

module.exports = { generateMonthlyBill };