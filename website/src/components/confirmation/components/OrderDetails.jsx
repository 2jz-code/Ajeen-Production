// src/components/confirmation/components/OrderDetails.jsx
import React from "react";

// Assume customerPhoneFromCheckout is passed from ConfirmationPage as customerDetailsFromState?.phone
const OrderDetails = ({
	orderDetails,
	formatDate,
	customerPhoneFromCheckout,
}) => {
	if (!orderDetails) {
		return <p>Loading order details...</p>; // Or some other placeholder
	}

	const effectivePhone =
		orderDetails.guest_phone || customerPhoneFromCheckout || "Not provided";
	// Use the field name from your backend serializer for payment method
	const paymentMethod = orderDetails.payment_method_display || "N/A";

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
							{paymentMethod} {/* MODIFIED HERE */}
						</p>
					</div>
					<div>
						<p className="text-gray-500">Contact:</p>
						<p className="font-medium">
							{effectivePhone} {/* MODIFIED HERE */}
						</p>
					</div>
					{/* Display Customer Name and Email if available in orderDetails */}
					{(orderDetails.customer_name ||
						(orderDetails.guest_first_name &&
							orderDetails.guest_last_name)) && (
						<div>
							<p className="text-gray-500">Customer Name:</p>
							<p className="font-medium text-gray-700">
								{orderDetails.customer_name ||
									`${orderDetails.guest_first_name} ${orderDetails.guest_last_name}`.trim()}
							</p>
						</div>
					)}
					{(orderDetails.guest_email || orderDetails.user?.email) && (
						<div>
							<p className="text-gray-500">Email:</p>
							<p className="font-medium text-gray-700">
								{orderDetails.guest_email || orderDetails.user?.email}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default OrderDetails;
