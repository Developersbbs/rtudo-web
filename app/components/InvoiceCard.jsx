import { BsCalendarDate, BsCashCoin, BsReceipt } from "react-icons/bs";
import { FaRupeeSign } from "react-icons/fa";

const InvoiceCard = ({ plan }) => (
  <div className="border rounded-xl p-4 my-4 bg-gray-50 dark:bg-[var(--card-background)] shadow-sm">
    <h3 className="text-lg font-bold text-[var(--color-primary)] mb-3 flex items-center gap-2">
      <BsReceipt className="text-[var(--color-primary)]" /> Invoice
    </h3>

    <div className="text-sm space-y-1 text-[var(--text-color)]">
      <p className="flex items-center gap-2">
        <BsCalendarDate />
        <strong>Start Date:</strong>{" "}
        {plan.createdAt?.seconds
          ? new Date(plan.createdAt.seconds * 1000).toLocaleDateString()
          : "N/A"}
      </p>

      <p className="flex items-center gap-2">
        <FaRupeeSign />
        <strong>Amount:</strong> ₹{plan.amount}
      </p>

      <p className="flex items-center gap-2">
        <BsCashCoin />
        <strong>Plan:</strong> {plan.plan.toUpperCase()}
      </p>

      <p className="flex items-center gap-2">
        <strong>Status:</strong> {plan.status}
      </p>

      <p className="flex items-center gap-2 break-all">
        <strong>Order ID:</strong> {plan.razorpay_order_id}
      </p>
    </div>
  </div>
);
