import { useEffect } from "react";

export default function BillViewModal({
  bill,
  customer,
  onClose,
  downloadBill,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!bill) return null;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN");

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toFixed(2)}`;

  const pendingAmount =
    Number(bill.totalAmount) - Number(bill.amountPaid);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-8 border-b bg-gray-50 rounded-t-3xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                INVOICE
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Generated on {formatDate(bill.createdAt)}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-8 border-b grid md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <p className="text-gray-500 text-xs uppercase mb-1">
              Billed To
            </p>
            <p className="font-semibold text-base">
              {customer?.name || "Customer"}
            </p>
            {customer?.phone && (
              <p>{customer.phone}</p>
            )}
          </div>

          <div className="md:text-right">
            <p>
              <span className="font-medium">Billing Period:</span>
            </p>
            <p>
              {formatDate(bill.fromDate)} —{" "}
              {formatDate(bill.toDate)}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8">
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-right">Qty</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {bill.deliveryItems?.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-4">
                      {formatDate(item.date)}
                    </td>
                    <td className="p-4 font-medium">
                      {item.productName}
                    </td>
                    <td className="p-4 text-right">
                      {item.quantity}
                    </td>
                    <td className="p-4 text-right">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="p-4 text-right font-semibold">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-10 max-w-md ml-auto space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Delivery Total
              </span>
              <span className="font-medium">
                {formatCurrency(bill.deliveryTotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">
                Amount Paid
              </span>
              <span className="font-medium text-green-600">
                {formatCurrency(bill.amountPaid)}
              </span>
            </div>

            <div className="flex justify-between border-t pt-4 text-lg font-bold">
              <span>Pending</span>
              <span className="text-red-600">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="mt-10 flex gap-4">
            <button
              onClick={() => downloadBill(bill._id)}
              className="flex-1 bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-sm font-semibold transition"
            >
              Download PDF
            </button>

            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}