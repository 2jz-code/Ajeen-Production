// src/components/checkout/components/payment/PaymentError.jsx
import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

const PaymentError = ({ message }) => {
	if (!message) return null;

	return (
		// Error message box: Light red background, red border, red text, red icon
		// Using standard Tailwind reds for common error visibility.
		// Your --destructive variable is HSL (15 80% 50%), which is a reddish-orange.
		// For a more standard "error red", Tailwind's reds are often clearer.
		// If you want to use your theme's destructive color, you'd replace these.
		<div
			className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md flex items-start text-sm shadow-sm"
			role="alert"
		>
			<FaExclamationTriangle className="text-red-500 mr-2.5 mt-0.5 flex-shrink-0 h-5 w-5" />{" "}
			{/* Adjusted icon size and margin */}
			<div>
				<p className="font-semibold">Payment Error</p> {/* Made title bolder */}
				<p>{message}</p>
			</div>
		</div>
	);
};

export default PaymentError;
