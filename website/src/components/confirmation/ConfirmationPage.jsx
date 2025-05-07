// src/components/confirmation/ConfirmationPage.jsx
import React from "react";
import { motion } from "framer-motion";
import { FaHome } from "react-icons/fa";
import useOrderDetails from "./hooks/useOrderDetails";
import OrderStatusIndicator from "./components/OrderStatusIndicator";
import OrderTimeline from "./components/OrderTimeline";
import OrderDetails from "./components/OrderDetails";
import OrderItems from "./components/OrderItems";
import ActionButtons from "./components/ActionButtons";
import HelpSection from "./components/HelpSection";
import { useAuth } from "../../contexts/AuthContext"; // Import useAuth

const ConfirmationPage = () => {
	// --- MODIFICATION START ---
	const { isAuthenticated, isLoading: authIsLoading, authChecked } = useAuth(); // Get auth state
	// --- MODIFICATION END ---

	const {
		orderDetails,
		liveStatus,
		isLoading: orderIsLoading, // Rename to avoid conflict
		error,
		navigate,
		formatPrice,
		formatDate,
		renderEstimatedTime,
	} = useOrderDetails(isAuthenticated); // Pass auth status to the hook

	// --- MODIFICATION START ---
	// Combined loading state
	const isLoading = authIsLoading || orderIsLoading;

	// Wait until authentication status is checked
	if (!authChecked) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
				<p className="text-gray-600">Checking status...</p>
			</div>
		);
	}
	// --- MODIFICATION END ---

	// Loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
				<p className="text-gray-600">Loading order details...</p>
			</div>
		);
	}

	// Error state (applies to both guests and logged-in users if order fetch fails)
	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
					{/* Error Icon */}
					<svg
						className="w-16 h-16 text-red-500 mx-auto mb-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<div className="flex justify-center space-x-4">
						<button
							onClick={() => navigate("/menu")}
							className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
						>
							View Menu
						</button>
						<button
							onClick={() => navigate("/")}
							className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
						>
							Go Home
						</button>
					</div>
				</div>
			</div>
		);
	}

	// --- MODIFICATION START: Conditional Rendering ---
	if (!isAuthenticated) {
		// Guest User View
		return (
			<div className="min-h-screen bg-gray-50">
				{/* Simple Header for Guest */}
				<div className="bg-white shadow-sm">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
						<div className="flex items-center justify-between">
							<h1 className="text-2xl font-bold text-gray-900">
								Order Submitted
							</h1>
							<button
								onClick={() => navigate("/")}
								className="flex items-center text-gray-600 hover:text-gray-900"
							>
								<FaHome className="mr-2" /> Home
							</button>
						</div>
					</div>
				</div>
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="bg-white rounded-lg shadow-md overflow-hidden p-8 text-center"
					>
						{/* Success Icon */}
						<svg
							className="w-16 h-16 text-green-500 mx-auto mb-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<h2 className="text-2xl font-bold text-gray-800 mb-2">
							Thank You For Your Order!
						</h2>
						<p className="text-gray-600 mb-6">
							Your order has been received. We'll start preparing it shortly.
						</p>
						<p className="text-gray-600 mb-6 text-lg font-bold">
							Est. Prep. Time: 10 - 20 minutes
						</p>
						{/* <p className="text-sm text-gray-500 mb-8">
							You can check your email for order details.
						</p> */}
						{/* Use ActionButtons component */}
						<ActionButtons navigate={navigate} />
					</motion.div>
					{/* Use HelpSection component */}
					<HelpSection />
				</div>
			</div>
		);
	}

	// Logged-in User View (Existing detailed view)
	// Ensure orderDetails is available before rendering the detailed view
	if (!orderDetails) {
		return (
			<div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
				<div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
					{/* Icon */}
					<svg
						className="w-16 h-16 text-blue-500 mx-auto mb-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">
						Order Placed
					</h2>
					<p className="text-gray-600 mb-6">
						We received your order, but details are still loading.
					</p>
					<div className="flex justify-center space-x-4">
						<button
							onClick={() => navigate("/menu")}
							className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
						>
							View Menu
						</button>
						<button
							onClick={() => navigate("/")}
							className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
						>
							Go Home
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Existing detailed view for logged-in users
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header for Logged-in User */}
			<div className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">
							Order Confirmation
						</h1>
						<button
							onClick={() => navigate("/")}
							className="flex items-center text-gray-600 hover:text-gray-900"
						>
							<FaHome className="mr-2" /> Home
						</button>
					</div>
				</div>
			</div>

			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="bg-white rounded-lg shadow-md overflow-hidden"
				>
					{/* Order Status Header */}
					<div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 text-center">
						<h2 className="text-xl font-bold mb-2">
							Thank you for your order,{" "}
							{orderDetails.customerName || "Customer"}!
						</h2>
						<p className="text-green-100">Order #{orderDetails.id}</p>
					</div>

					{/* Order Status Indicator */}
					<div className="p-6 text-center border-b border-gray-200">
						<OrderStatusIndicator status={liveStatus} />

						<div className="mt-6">
							<span className="text-sm text-gray-500">Estimated Time:</span>
							<p className="text-2xl font-bold text-green-500">
								{renderEstimatedTime()}
							</p>
						</div>
					</div>

					{/* Order Timeline */}
					<div className="px-6 py-4 border-b border-gray-200">
						<h3 className="font-medium text-gray-700 mb-4">Order Progress</h3>
						<OrderTimeline status={liveStatus} />
					</div>

					{/* Order Details Section */}
					<div className="p-6">
						{/* Order Details */}
						<OrderDetails
							orderDetails={orderDetails}
							formatDate={formatDate}
						/>

						{/* Order Items Table */}
						<OrderItems
							orderDetails={orderDetails}
							formatPrice={formatPrice}
						/>

						{/* Action Buttons */}
						<ActionButtons navigate={navigate} />
					</div>
				</motion.div>

				{/* Help Section */}
				<HelpSection />
			</div>
		</div>
	);
	// --- MODIFICATION END ---
};

export default ConfirmationPage;
