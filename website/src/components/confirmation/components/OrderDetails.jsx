// src/components/confirmation/components/OrderDetails.jsx
import React from "react";

const OrderDetails = ({
	orderDetails,
	formatDate,
	customerPhoneFromCheckout, // This prop might be redundant if orderDetails.guest_phone is reliable
}) => {
	if (!orderDetails) {
		return <p>Loading order details...</p>;
	}

	// Prioritize phone number from the fetched orderDetails
	// const effectivePhone =
	// 	orderDetails.guest_phone || customerPhoneFromCheckout || "Not provided";

	// Use the display field from the serializer
	const paymentMethod = orderDetails.payment_method_display || "N/A";
	const customerDisplayName =
		orderDetails.customer_name ||
		(orderDetails.guest_first_name && orderDetails.guest_last_name
			? `${orderDetails.guest_first_name} ${orderDetails.guest_last_name}`.trim()
			: "Guest");
	const customerDisplayEmail =
		orderDetails.guest_email || orderDetails.user?.email || "N/A";

	return (
		<div className="mb-6">
			<h3 className="font-semibold text-gray-800 mb-3">Order Details</h3>
			<div className="bg-gray-50 rounded-md p-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-gray-500">Order Date:</p>
						<p className="font-medium">{formatDate(orderDetails.created_at)}</p>
					</div>
					<div>
						<p className="text-gray-500">Order Type:</p>
						<p className="font-medium capitalize">
							{orderDetails.delivery_method || "Pickup"}{" "}
							{/* Assuming delivery_method is on orderDetails */}
						</p>
					</div>
					<div>
						<p className="text-gray-500">Payment Method:</p>
						<p className="font-medium capitalize">{paymentMethod}</p>
					</div>
					{/* <div>
						<p className="text-gray-500">Contact Phone:</p>
						<p className="font-medium">{effectivePhone}</p>
					</div> */}
					<div>
						<p className="text-gray-500">Customer Name:</p>
						<p className="font-medium text-gray-700">{customerDisplayName}</p>
					</div>
					<div>
						<p className="text-gray-500">Email:</p>
						<p className="font-medium text-gray-700">{customerDisplayEmail}</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderDetails;
