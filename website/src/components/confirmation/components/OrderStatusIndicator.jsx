// src/components/confirmation/components/OrderStatusIndicator.jsx
import React from "react";
import { FaReceipt, FaCog, FaCheck, FaTimes } from "react-icons/fa";

const OrderStatusIndicator = ({ status }) => {
	const getStatusConfig = () => {
		switch (status) {
			case "pending":
				return {
					icon: <FaReceipt className="text-green-500" />,
					label: "Order Received",
					color: "green",
					message:
						"We've received your order and will begin processing it shortly.",
				};
			case "preparing":
				return {
					icon: <FaCog className="text-blue-500 animate-spin-slow" />,
					label: "Processing",
					color: "blue",
					message: "Our chefs are preparing your delicious food.",
				};
			case "ready":
			case "completed":
				return {
					icon: <FaCheck className="text-green-500" />,
					label: "Ready for Pickup",
					color: "green",
					message: "Your order is ready! Come pick it up at our location.",
				};
			case "cancelled":
				return {
					icon: <FaTimes className="text-red-500" />,
					label: "Cancelled",
					color: "red",
					message: "This order has been cancelled.",
				};
			default:
				return {
					icon: <FaReceipt className="text-gray-500" />,
					label: "Processing",
					color: "gray",
					message: "Your order is being processed.",
				};
		}
	};

	const { icon, label, color, message } = getStatusConfig();

	return (
		<div className="flex flex-col items-center">
			<div
				className={`w-20 h-20 rounded-full bg-${color}-100 flex items-center justify-center mb-3`}
			>
				<div className="text-3xl">{icon}</div>
			</div>
			<h3 className="text-xl font-semibold mb-2">{label}</h3>
			<p className="text-gray-600 text-center max-w-xs">{message}</p>
		</div>
	);
};

export default OrderStatusIndicator;
