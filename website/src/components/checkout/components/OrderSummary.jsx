// src/components/checkout/components/OrderSummary.jsx
import React from "react";

const OrderSummary = ({ subtotal, tax, total, formatPrice }) => {
	return (
		<div className="bg-gray-50 rounded-md p-4 mb-6 border border-gray-200">
			<h3 className="font-medium mb-3">Order Summary</h3>
			<div className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-gray-600">Subtotal</span>
					<span>${formatPrice(subtotal)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-600">Tax (10%)</span>
					<span>${formatPrice(tax)}</span>
				</div>
				<div className="border-t border-gray-200 pt-2 mt-2 font-medium flex justify-between">
					<span>Total</span>
					<span>${formatPrice(total)}</span>
				</div>
			</div>
		</div>
	);
};

export default OrderSummary;
