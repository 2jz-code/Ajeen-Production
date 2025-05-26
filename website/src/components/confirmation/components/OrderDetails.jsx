// src/components/confirmation/components/OrderDetails.jsx
import React from "react";

const OrderDetails = ({
	orderDetails,
	formatDate,
	// customerPhoneFromCheckout, // This prop is available but not explicitly used if orderDetails has the phone
}) => {
	if (!orderDetails) {
		return <p className="text-accent-dark-brown">Loading order details...</p>; // Styled fallback
	}

	const paymentMethod = orderDetails.payment_method_display || "N/A";
	const customerDisplayName =
		orderDetails.customer_name || // For authenticated users
		(orderDetails.guest_first_name && orderDetails.guest_last_name // For guest users
			? `${orderDetails.guest_first_name} ${orderDetails.guest_last_name}`.trim()
			: "Guest");
	const customerDisplayEmail =
		orderDetails.guest_email || orderDetails.user?.email || "N/A";
	// Assuming phone number is consistently available as guest_phone or user.phone_number from backend
	const customerDisplayPhone =
		orderDetails.guest_phone ||
		orderDetails.user?.phone_number ||
		"Not Provided";

	return (
		<div className="mb-6">
			{/* Heading: Dark Green */}
			<h3 className="font-semibold text-accent-dark-green text-lg mb-3">
				Order Details
			</h3>
			{/* Details Container: Primary Beige background, subtle border and shadow */}
			<div className="bg-primary-beige rounded-lg shadow-sm p-4 sm:p-6 border border-accent-subtle-gray/40">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
					<div>
						{/* Label: Dark Brown */}
						<p className="text-accent-dark-brown">Order Date:</p>
						{/* Value: Dark Green, medium weight */}
						<p className="font-medium text-accent-dark-green">
							{formatDate(orderDetails.created_at)}
						</p>
					</div>
					<div>
						<p className="text-accent-dark-brown">Order Type:</p>
						<p className="font-medium text-accent-dark-green capitalize">
							{orderDetails.delivery_method || "Pickup"}
						</p>
					</div>
					<div>
						<p className="text-accent-dark-brown">Payment Method:</p>
						<p className="font-medium text-accent-dark-green capitalize">
							{paymentMethod}
						</p>
					</div>
					<div>
						<p className="text-accent-dark-brown">Customer Name:</p>
						<p className="font-medium text-accent-dark-green">
							{customerDisplayName}
						</p>
					</div>
					<div>
						<p className="text-accent-dark-brown">Email:</p>
						<p className="font-medium text-accent-dark-green">
							{customerDisplayEmail}
						</p>
					</div>
					{customerDisplayPhone !== "Not Provided" && ( // Only show phone if available
						<div>
							<p className="text-accent-dark-brown">Contact Phone:</p>
							<p className="font-medium text-accent-dark-green">
								{customerDisplayPhone}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default OrderDetails;
