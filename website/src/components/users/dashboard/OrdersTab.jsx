// src/components/dashboard/OrdersTab.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaShoppingBag, FaExclamationTriangle, FaRedo } from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import { formatPrice, formatDate, getStatusColor } from "./utils/formatters";
// Import reorderPastOrder directly from API utilities
import { reorderPastOrder } from "./utils/api";

const OrdersTab = () => {
	const navigate = useNavigate();
	const { orderHistory, loadingOrders, orderError } = useDashboard();
	const [reorderingId, setReorderingId] = useState(null);
	const [reorderError, setReorderError] = useState(null);

	// Handle re-order function - direct implementation
	const handleReorder = async (orderId) => {
		setReorderingId(orderId);
		try {
			// console.log(`Starting reorder process for order ID: ${orderId}`);

			// Call the reorder API directly
			const response = await reorderPastOrder(orderId);
			// console.log("Reorder API response:", response);

			if (response && response.success) {
				// console.log("Reorder successful, navigating to checkout");
				// Navigate directly to checkout
				navigate("/checkout");
			} else {
				throw new Error("Reorder API did not return success status");
			}
		} catch (error) {
			console.error("Failed to reorder:", error);
			setReorderError(
				error.response?.data?.error || "Failed to reorder. Please try again."
			);
			alert("Sorry, we couldn't process your reorder. Please try again.");
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
				<h2 className="text-2xl font-bold">Order History</h2>
				<button
					onClick={() => navigate("/menu")}
					className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center"
				>
					<FaShoppingBag className="mr-2" /> Order Again
				</button>
			</div>

			{orderError && (
				<div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
					<FaExclamationTriangle className="mr-2" />
					{orderError}
				</div>
			)}

			{loadingOrders ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
				</div>
			) : orderHistory.length > 0 ? (
				<div className="space-y-6">
					{orderHistory.map((order) => (
						<motion.div
							key={order.id}
							className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
							whileHover={{
								y: -2,
								boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
							}}
							transition={{ duration: 0.2 }}
						>
							{/* Order Header */}
							<div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between">
								<div>
									<p className="text-sm text-gray-500">Order #{order.id}</p>
									<p className="font-medium">{formatDate(order.created_at)}</p>
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
								<h3 className="font-medium mb-3">Order Items</h3>
								<div className="space-y-3">
									{order.items.map((item, index) => (
										<div
											key={item.id || `${order.id}-${index}`}
											className="flex justify-between items-center"
										>
											<div className="flex items-center">
												<div className="w-12 h-12 bg-gray-100 rounded overflow-hidden mr-3">
													{item.image_url ? (
														<img
															src={item.image_url}
															alt={item.product_name}
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center text-gray-400">
															<FaShoppingBag />
														</div>
													)}
												</div>
												<div>
													<p className="font-medium">{item.product_name}</p>
													<p className="text-sm text-gray-500">
														Quantity: {item.quantity}
													</p>
												</div>
											</div>
											<p className="font-medium">
												${formatPrice(item.item_price * item.quantity)}
											</p>
										</div>
									))}
								</div>
							</div>

							{/* Order Summary */}
							<div className="bg-gray-50 p-4 border-t border-gray-200">
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Subtotal</span>
									<span>${formatPrice(order.subtotal) || "0.00"}</span>
								</div>
								<div className="flex justify-between text-sm mt-1">
									<span className="text-gray-600">Tax</span>
									<span>${formatPrice(order.tax) || "0.00"}</span>
								</div>
								{order.delivery_fee > 0 && (
									<div className="flex justify-between text-sm mt-1">
										<span className="text-gray-600">Delivery Fee</span>
										<span>${formatPrice(order.delivery_fee) || "0.00"}</span>
									</div>
								)}
								<div className="flex justify-between font-medium mt-2 pt-2 border-t border-gray-200">
									<span>Total</span>
									<span>${formatPrice(order.total_amount) || "0.00"}</span>
								</div>
							</div>

							{/* Order Actions */}
							<div className="p-4 border-t border-gray-200 flex justify-between items-center">
								<button
									onClick={() =>
										navigate("/confirmation", {
											state: { orderId: order.id },
										})
									}
									className="text-green-600 hover:text-green-700 font-medium text-sm"
								>
									View Order Details
								</button>

								{/* Add Reorder Button */}
								<button
									onClick={() => handleReorder(order.id)}
									disabled={reorderingId === order.id}
									className={`flex items-center px-4 py-2 rounded-md text-white text-sm ${
										reorderingId === order.id
											? "bg-gray-400 cursor-not-allowed"
											: "bg-green-500 hover:bg-green-600"
									} transition-colors`}
								>
									{reorderingId === order.id ? (
										<>
											<svg
												className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
											<FaRedo className="mr-2" /> Reorder
										</>
									)}
								</button>
							</div>
						</motion.div>
					))}
				</div>
			) : (
				<div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<FaShoppingBag
							className="text-green-500"
							size={24}
						/>
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">
						No orders yet
					</h3>
					<p className="text-gray-500 mb-6">
						You haven't placed any orders with us yet.
					</p>
					<button
						onClick={() => navigate("/menu")}
						className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
					>
						Browse Menu
					</button>
				</div>
			)}
		</motion.div>
	);
};

export default OrdersTab;
