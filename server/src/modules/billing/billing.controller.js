const { generateMonthlyBill } = require("../../utils/billing.util");
const { successResponse } = require("../../utils/response.util");

exports.generateBill = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId; // later from auth
    const { customerId, month, year } = req.query;

    if (!customerId || !month || !year) {
      return errorResponse(res, "Missing parameters", 400);
    }

    const bill = await generateMonthlyBill(
      tenantId,
      customerId,
      parseInt(month),
      parseInt(year)
    );

    return successResponse(res, "Bill generated successfully", bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};