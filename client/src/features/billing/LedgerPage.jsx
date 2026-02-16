import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../api/axios";

const LedgerPage = () => {
  const { customerId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await axios.get(`/billing/ledger/${customerId}`);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLedger();
  }, [customerId]);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Ledger</h2>
      <p>Opening Balance: ₹{data.openingBalance}</p>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.ledger.map((entry, index) => (
            <tr key={index}>
              <td>{new Date(entry.date).toLocaleDateString()}</td>
              <td>{entry.type}</td>
              <td>
                {entry.amount > 0
                  ? `+ ₹${entry.amount}`
                  : `- ₹${Math.abs(entry.amount)}`}
              </td>
              <td>₹{entry.runningBalance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Final Balance: ₹{data.finalBalance}</h3>
    </div>
  );
};

export default LedgerPage;