const Payment = require("./payment.model");

exports.createPayment = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId; // later from auth
    const { customerId, amount, paymentMode, date, note } = req.body;

    if (!customerId || !amount || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const payment = await Payment.create({
      tenantId,
      customerId,
      amount,
      paymentMode,
      date: new Date(date),
      note,
    });

    res.status(201).json({
      message: "Payment recorded successfully",
      payment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};