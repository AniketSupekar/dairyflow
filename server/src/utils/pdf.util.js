const PDFDocument = require("pdfkit");

exports.generateBillPdf = (bill, customer) => {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));

  doc.fontSize(12);
  doc.text(`Customer: ${bill.customerId.name}`);
  doc.text(`From: ${bill.fromDate.toDateString()}`);
  doc.text(`To: ${bill.toDate.toDateString()}`);
  doc.moveDown();

  doc.text("Date | Product | Qty | Rate | Amount");
  doc.moveDown();

  bill.deliveryItems.forEach(item => {
    doc.text(
      `${item.date.toDateString()} | ${item.productName} | ${item.quantity} | ${item.rate} | ${item.amount}`
    );
  });

  doc.moveDown();
  doc.text(`Opening Balance: ₹${bill.openingBalance}`);
  doc.text(`Delivery Total: ₹${bill.deliveryTotal}`);
  doc.text(`Payment Total: ₹${bill.paymentTotal}`);
  doc.moveDown();
  doc.fontSize(14).text(`Closing Balance: ₹${bill.closingBalance}`);


  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
};