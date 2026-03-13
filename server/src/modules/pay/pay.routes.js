/**
 * modules/pay/pay.routes.js
 *
 * GET /api/pay?pa=upiid&pn=DairyName&am=500&tn=Milk+Bill
 *
 * This endpoint exists solely to give WhatsApp a tappable HTTPS link.
 * WhatsApp only hyperlinks http:// and https:// URLs — raw upi:// links
 * appear as plain unclickable text. This route receives the UPI params,
 * then does a 302 redirect to the upi:// deep link which opens the
 * customer's default UPI app (PhonePe / GPay / Paytm etc.) with
 * all fields pre-filled.
 *
 * No auth required — this is a public redirect (like a payment link).
 */

const router = require("express").Router();

router.get("/", (req, res) => {
  const { pa, pn, am, tn } = req.query;

  // pa (payee address / UPI ID) is mandatory
  if (!pa) {
    return res.status(400).send("Missing UPI ID (pa)");
  }

  // Build the upi:// deep link — standard UPI intent format
  // All major apps (PhonePe, GPay, Paytm, BHIM) support this
  const params = new URLSearchParams();
  params.set("pa", pa);
  if (pn) params.set("pn", pn);
  if (am) params.set("am", am);
  params.set("cu", "INR");
  if (tn) params.set("tn", tn);

  const upiDeepLink = `upi://pay?${params.toString()}`;

  // 302 so it's not cached — each payment link stays fresh
  res.redirect(302, upiDeepLink);
});

module.exports = router;