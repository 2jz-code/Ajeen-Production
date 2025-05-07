// src/components/confirmation/components/OrderDetails.jsx
import React from "react";

const OrderDetails = ({ orderDetails, formatDate }) => {
	return (
		<div className="mb-6">
			<h3 className="font-semibold text-gray-800 mb-3">Order Details</h3>
			<div className="bg-gray-50 rounded-md p-4">
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-gray-500">Order Date:</p>
						<p className="font-medium">{formatDate(orderDetails.created_at)}</p>
					</div>
					<div>
						<p className="text-gray-500">Order Type:</p>
						<p className="font-medium capitalize">
							{orderDetails.delivery_method || "Pickup"}
						</p>
					</div>
					<div>
						<p className="text-gray-500">Payment Method:</p>
						<p className="font-medium capitalize">
							{orderDetails.payment_method || "Cash"}
						</p>
					</div>
					<div>
						<p className="text-gray-500">Contact:</p>
						<p className="font-medium">
							{orderDetails.phone || "Not provided"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderDetails;
