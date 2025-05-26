// src/components/dashboard/OrdersTab.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaShoppingBag, FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import { formatPrice, formatDate, getStatusColor } from "./utils/formatters";
import { reorderPastOrder } from "./utils/api"; // Assuming this path is correct

const OrdersTab = () => {
	const navigate = useNavigate();
	const { orderHistory, loadingOrders, orderError } = useDashboard();
	const [reorderingId, setReorderingId] = useState(null);
	// eslint-disable-next-line no-unused-vars
	const [reorderError, setReorderError] = useState(null); // Keep for potential future use

	const handleReorder = async (orderId) => {
		setReorderingId(orderId);
		setReorderError(null); // Clear previous errors
		try {
			const response = await reorderPastOrder(orderId);
			if (response && response.success) {
				// Check for a success flag from API
				navigate("/checkout");
			} else {
				// If API returns error in a specific structure, handle it
				const errorMessage =
					response?.message || "Reorder failed. Please try again.";
				setReorderError(errorMessage);
				alert(errorMessage);
			}
		} catch (error) {
			console.error("Failed to reorder:", error);
			const errorMessage =
				error.response?.data?.error || "Failed to reorder. Please try again.";
			setReorderError(errorMessage);
			alert(errorMessage);
		} finally {
			setReorderingId(null);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="flex items-center justify-between mb-6">
				{/* Heading: Dark Green */}
				<h2 className="text-2xl font-bold text-accent-dark-green">
					Order History
				</h2>
				{/* Button: Primary Green background, Light Beige text */}
				<button
					onClick={() => navigate("/menu")}
					className="px-4 py-2 bg-primary-green text-accent-light-beige rounded-md hover:bg-accent-dark-green transition-colors flex items-center text-sm font-medium shadow-sm"
				>
					<FaShoppingBag className="mr-2" /> Order Again
				</button>
			</div>

			{orderError && (
				// Error message: Standard red theme
				<div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md flex items-center text-sm">
					<FaExclamationTriangle className="mr-2" />
					{orderError}
				</div>
			)}

			{loadingOrders ? (
				// Loading state: Primary Beige card, Primary Green spinner
				<div className="bg-primary-beige rounded-lg shadow-sm p-8 flex justify-center items-center border border-accent-subtle-gray/30">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green"></div>
				</div>
			) : orderHistory.length > 0 ? (
				<div className="space-y-6">
					{orderHistory.map((order) => (
						<motion.div
							key={order.id}
							// Order card: Primary Beige background, subtle border
							className="bg-primary-beige rounded-lg shadow-sm overflow-hidden border border-accent-subtle-gray/30"
							whileHover={{
								y: -2,
								boxShadow:
									"0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)", // Softer shadow
							}}
							transition={{ duration: 0.2 }}
						>
							{/* Order Header: Light Beige background, Subtle Gray border */}
							<div className="p-4 bg-accent-light-beige/70 border-b border-accent-subtle-gray/50 flex flex-col sm:flex-row sm:items-center justify-between">
								<div>
									{/* Text: Dark Brown and Dark Green */}
									<p className="text-sm text-accent-dark-brown">
										Order #{order.id}
									</p>
									<p className="font-medium text-accent-dark-green text-sm">
										{formatDate(order.created_at)}
									</p>
								</div>
								<div className="mt-2 sm:mt-0 flex items-center">
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
											order.status
										)}`}
									>
										{order.status || "Processing"}
									</span>
								</div>
							</div>

							{/* Order Items */}
							<div className="p-4">
								{/* Heading: Dark Green */}
								<h3 className="font-semibold text-accent-dark-green mb-3 text-md">
									Order Items
								</h3>
								<div className="space-y-3">
									{order.items.map((item, index) => (
										<div
											key={item.id || `${order.id}-${index}`}
											className="flex justify-between items-center"
										>
											<div className="flex items-center">
												{/* Image placeholder: Subtle Gray background */}
												<div className="w-12 h-12 bg-accent-subtle-gray/50 rounded overflow-hidden mr-3">
													{item.image_url ? (
														<img
															src={item.image_url}
															alt={item.product_name}
															className="w-full h-full object-cover"
														/>
													) : (
														// Icon: Dark Brown
														<div className="w-full h-full flex items-center justify-center text-accent-dark-brown/70">
															<FaShoppingBag />
														</div>
													)}
												</div>
												<div>
													{/* Item name: Dark Green, Quantity text: Dark Brown */}
													<p className="font-medium text-accent-dark-green text-sm">
														{item.product_name}
													</p>
													<p className="text-xs text-accent-dark-brown">
														Quantity: {item.quantity}
													</p>
												</div>
											</div>
											{/* Price: Dark Green */}
											<p className="font-medium text-accent-dark-green text-sm">
												${formatPrice(item.item_price * item.quantity)}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Order Summary: Light Beige background, Subtle Gray border */}
							<div className="bg-accent-light-beige/70 p-4 border-t border-accent-subtle-gray/50">
								{/* Text: Dark Brown, Totals: Dark Green */}
								<div className="flex justify-between text-xs">
									<span className="text-accent-dark-brown">Subtotal</span>
									<span className="text-accent-dark-green">
										${formatPrice(order.subtotal) || "0.00"}
									</span>
								</div>
								<div className="flex justify-between text-xs mt-1">
									<span className="text-accent-dark-brown">Tax</span>
									<span className="text-accent-dark-green">
										${formatPrice(order.tax) || "0.00"}
									</span>
								</div>
								{order.delivery_fee > 0 && (
									<div className="flex justify-between text-xs mt-1">
										<span className="text-accent-dark-brown">Delivery Fee</span>
										<span className="text-accent-dark-green">
											${formatPrice(order.delivery_fee) || "0.00"}
										</span>
									</div>
								)}
								<div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t border-accent-subtle-gray/30">
									<span className="text-accent-dark-green">Total</span>
									<span className="text-accent-dark-green">
										${formatPrice(order.total_amount) || "0.00"}
									</span>
								</div>
							</div>

							{/* Order Actions: Subtle Gray border */}
							<div className="p-4 border-t border-accent-subtle-gray/50 flex justify-between items-center">
								{/* Link: Primary Green */}
								<button
									onClick={() =>
										navigate("/confirmation", {
											state: { orderId: order.id },
										})
									}
									className="text-primary-green hover:text-accent-dark-green font-medium text-xs"
								>
									View Order Details
								</button>

								{/* Reorder Button: Warm Brown background, Light Beige text */}
								<button
									onClick={() => handleReorder(order.id)}
									disabled={reorderingId === order.id}
									className={`flex items-center px-3 py-1.5 rounded-md text-accent-light-beige text-xs font-medium ${
										reorderingId === order.id
											? "bg-accent-subtle-gray cursor-not-allowed"
											: "bg-accent-warm-brown hover:bg-opacity-80"
									} transition-colors shadow-sm`}
								>
									{reorderingId === order.id ? (
										<>
											<svg
												className="animate-spin -ml-1 mr-2 h-3 w-3 text-accent-light-beige"
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											Reordering...
										</>
									) : (
										<>
											<FaRedo className="mr-1.5 h-3 w-3" /> Reorder
										</>
									)}
								</button>
							</div>
						</motion.div>
					))}
				</div>
			) : (
				// "No orders yet" card: Primary Beige background, subtle border
				<div className="bg-primary-beige rounded-lg shadow-sm p-8 text-center border border-accent-subtle-gray/30">
					{/* Icon wrapper: Lighter Primary Green, Icon: Primary Green */}
					<div className="w-16 h-16 bg-primary-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<FaShoppingBag
							className="text-primary-green"
							size={28} // Slightly larger icon
						/>
					</div>
					{/* Text: Dark Green and Dark Brown */}
					<h3 className="text-lg font-semibold text-accent-dark-green mb-2">
						No orders yet
					</h3>
					<p className="text-accent-dark-brown mb-6 text-sm">
						You haven't placed any orders with us yet.
					</p>
					{/* Button: Primary Green background, Light Beige text */}
					<button
						onClick={() => navigate("/menu")}
						className="inline-flex items-center px-4 py-2 bg-primary-green text-accent-light-beige rounded-md hover:bg-accent-dark-green transition-colors text-sm font-medium shadow-sm"
					>
						Browse Menu
					</button>
				</div>
			)}
		</motion.div>
	);
};

export default OrdersTab;
