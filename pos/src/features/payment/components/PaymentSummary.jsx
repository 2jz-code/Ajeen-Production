// src/features/payment/components/PaymentSummary.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { formatPrice } from "../../../utils/numberUtils"; // Assuming you have this

export const PaymentSummary = ({
  subtotal,
  taxAmount,
  discountAmount,
  surchargeAmount,
  tipAmount,
  grandTotal,
  amountPaid, // This is base amount paid towards original cart total
  remainingAfterPayments, // This is what's left of (cart total + surcharge for current step)
}) => {
  console.log("[PaymentSummary] Props received:", {
    subtotal,
    taxAmount,
    discountAmount,
    surchargeAmount,
    tipAmount,
    grandTotal,
    amountPaid,
    remainingAfterPayments,
  });
  return (
    <motion.footer
      className="border-t border-slate-200 p-4 bg-white space-y-1" // Reduced vertical spacing
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between text-slate-600 text-sm">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-emerald-600 text-sm">
          <span>Discount</span>
          <span>-{formatPrice(discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-slate-600 text-sm">
        <span>Tax</span>
        <span>{formatPrice(taxAmount)}</span>
      </div>
      {surchargeAmount > 0 && (
        <div className="flex justify-between text-orange-600 text-sm">
          <span>Surcharge</span>
          <span>{formatPrice(surchargeAmount)}</span>
        </div>
      )}
      {tipAmount > 0 && (
        <div className="flex justify-between text-sky-600 text-sm">
          <span>Tip</span>
          <span>{formatPrice(tipAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-semibold text-slate-800 pt-1.5 mt-1.5 border-t border-slate-100">
        <span>Total Due</span>
        <span>{formatPrice(grandTotal)}</span>
      </div>
      {amountPaid > 0 && (
        <>
          <div className="flex justify-between text-green-600 font-medium text-sm pt-1 mt-1 border-t border-dotted border-slate-200">
            <span>Amount Paid (towards order)</span>
            <span>{formatPrice(amountPaid)}</span>
          </div>
          <div className="flex justify-between text-blue-700 font-bold text-lg pt-1">
            <span>REMAINING</span>
            <span>{formatPrice(remainingAfterPayments)}</span>
          </div>
        </>
      )}
    </motion.footer>
  );
};

PaymentSummary.propTypes = {
  subtotal: PropTypes.number.isRequired,
  taxAmount: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  surchargeAmount: PropTypes.number.isRequired,
  tipAmount: PropTypes.number.isRequired,
  grandTotal: PropTypes.number.isRequired,
  amountPaid: PropTypes.number.isRequired,
  remainingAfterPayments: PropTypes.number.isRequired,
};
