// src/components/checkout/components/payment/PaymentError.jsx
import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";

const PaymentError = ({ message }) => {
	if (!message) return null;

	return (
		<div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
			<FaExclamationTriangle className="text-red-500 mr-2 mt-0.5 flex-shrink-0" />
			<div>
				<p className="font-medium">Payment Error</p>
				<p className="text-sm">{message}</p>
			</div>
		</div>
	);
};

export default PaymentError;
