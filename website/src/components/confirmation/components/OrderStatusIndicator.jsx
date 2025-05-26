// src/components/confirmation/components/OrderStatusIndicator.jsx
import React from "react";
import {
	FaReceipt,
	FaCog,
	FaCheck,
	FaTimes,
	FaHourglassHalf,
} from "react-icons/fa"; // Added FaHourglassHalf for default

const OrderStatusIndicator = ({ status }) => {
	const getStatusConfig = () => {
		switch (
			status?.toLowerCase() // Added optional chaining and toLowerCase for robustness
		) {
			case "pending":
				return {
					icon: <FaReceipt className="text-primary-green" />,
					label: "Order Received",
					// Icon container: Light tint of primary green, Text: Dark green, Message: Dark brown
					bgColor: "bg-primary-green/10", // Using a light tint of primary-green
					textColor: "text-accent-dark-green",
					messageColor: "text-accent-dark-brown",
					message:
						"We've received your order and will begin processing it shortly.",
				};
			case "preparing":
				return {
					icon: <FaCog className="text-accent-warm-brown animate-spin-slow" />,
					label: "Processing",
					// Icon container: Light tint of warm brown, Text: Warm brown, Message: Dark brown
					bgColor: "bg-accent-warm-brown/10",
					textColor: "text-accent-warm-brown",
					messageColor: "text-accent-dark-brown",
					message: "Our chefs are preparing your delicious food.",
				};
			case "ready":
			case "completed":
				return {
					icon: <FaCheck className="text-primary-green" />,
					label: "Ready for Pickup",
					// Icon container: Light tint of primary green, Text: Dark green, Message: Dark brown
					bgColor: "bg-primary-green/10",
					textColor: "text-accent-dark-green",
					messageColor: "text-accent-dark-brown",
					message: "Your order is ready! Come pick it up at our location.",
				};
			case "cancelled":
				return {
					icon: <FaTimes className="text-red-600" />, // Standard red
					label: "Cancelled",
					// Icon container: Light red, Text: Red, Message: Red
					bgColor: "bg-red-100", // Standard light red
					textColor: "text-red-700", // Standard darker red
					messageColor: "text-red-600",
					message: "This order has been cancelled.",
				};
			default: // Fallback for unknown statuses
				return {
					icon: <FaHourglassHalf className="text-accent-subtle-gray" />,
					label: "Status Unknown",
					// Icon container: Light subtle gray, Text: Dark brown, Message: Dark brown
					bgColor: "bg-accent-subtle-gray/20",
					textColor: "text-accent-dark-brown",
					messageColor: "text-accent-dark-brown",
					message: "Your order status is currently unavailable.",
				};
		}
	};

	const { icon, label, bgColor, textColor, messageColor, message } =
		getStatusConfig();

	return (
		<div className="flex flex-col items-center py-4">
			{" "}
			{/* Added some vertical padding */}
			{/* Icon container with dynamic background color */}
			<div
				className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${bgColor} flex items-center justify-center mb-4 shadow-md`}
			>
				<div className="text-3xl sm:text-4xl">{icon}</div>{" "}
				{/* Icon color is set within the icon component itself */}
			</div>
			{/* Label with dynamic text color */}
			<h3 className={`text-xl sm:text-2xl font-semibold mb-2 ${textColor}`}>
				{label}
			</h3>
			{/* Message with dynamic text color */}
			<p className={`text-sm sm:text-md ${messageColor} text-center max-w-xs`}>
				{message}
			</p>
		</div>
	);
};

export default OrderStatusIndicator;
