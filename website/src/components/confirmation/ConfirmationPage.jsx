// src/components/confirmation/ConfirmationPage.jsx
import React from "react";
import { motion } from "framer-motion";
import { FaHome, FaEnvelope, FaPhone } from "react-icons/fa";
import useOrderDetails from "./hooks/useOrderDetails";
import OrderStatusIndicator from "./components/OrderStatusIndicator";
import OrderTimeline from "./components/OrderTimeline";
import OrderDetails from "./components/OrderDetails";
import OrderItems from "./components/OrderItems";
import ActionButtons from "./components/ActionButtons";
import HelpSection from "./components/HelpSection";
import { useAuth } from "../../contexts/AuthContext";
// Navbar import removed
// import Navbar from "../Navbar";

const ConfirmationPage = () => {
	const { isAuthenticated, authChecked } = useAuth();
	const {
		orderDetails,
		customerDetailsFromState,
		liveStatus,
		isLoading: orderIsLoading,
		error,
		navigate,
		formatPrice,
		formatDate,
		renderEstimatedTime,
		orderId,
		isGuest,
	} = useOrderDetails(isAuthenticated);

	const isLoading = !authChecked || orderIsLoading;

	const displayEstimatedTime = () => {
		if (liveStatus === "completed" || liveStatus === "ready") {
			return "Your order is ready!";
		} else if (liveStatus === "cancelled") {
			return "Order cancelled";
		} else if (
			renderEstimatedTime &&
			typeof renderEstimatedTime === "function"
		) {
			const time = renderEstimatedTime();
			return time || "Calculating...";
		}
		return "15 - 25 Minutes";
	};

	// Common page header
	const PageHeader = ({ title }) => (
		// Header: Light Beige background, subtle bottom border
		<div className="bg-accent-light-beige shadow-sm border-b border-accent-subtle-gray/40 sticky top-0 z-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="flex items-center justify-between">
					{/* Title: Dark Green */}
					<h1 className="text-xl sm:text-2xl font-bold text-accent-dark-green">
						{title}
					</h1>
					{/* Home button: Dark Green icon & text, hover Primary Green */}
					<button
						onClick={() => navigate("/")}
						className="flex items-center text-accent-dark-green hover:text-primary-green transition-colors text-sm font-medium"
						aria-label="Go to homepage"
					>
						<FaHome className="mr-1.5" /> Home
					</button>
				</div>
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<div className="bg-background min-h-screen flex flex-col">
				{/* Page-specific header instead of Navbar */}
				<PageHeader title="Loading Order..." />
				<div className="flex-grow flex flex-col items-center justify-center p-4">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green mb-4"></div>
					<p className="text-accent-dark-brown">Loading order details...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-background min-h-screen flex flex-col">
				<PageHeader title="Order Error" />
				<div className="flex-grow flex flex-col items-center justify-center p-4">
					<div className="bg-accent-light-beige rounded-lg shadow-xl p-8 max-w-md w-full text-center border border-accent-subtle-gray/50">
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
						<h2 className="text-2xl font-bold text-accent-dark-green mb-2">
							Error
						</h2>
						<p className="text-red-600 mb-6">{error}</p>
						<div className="flex justify-center space-x-4">
							<button
								onClick={() => navigate("/menu")}
								className="px-5 py-2.5 bg-primary-green text-accent-light-beige rounded-md hover:bg-accent-dark-green transition-colors font-medium text-sm shadow-sm"
							>
								View Menu
							</button>
							<button
								onClick={() => navigate("/")}
								className="px-5 py-2.5 bg-primary-beige text-accent-dark-green rounded-md hover:bg-primary-beige/70 border border-accent-subtle-gray/70 transition-colors font-medium text-sm shadow-sm"
							>
								Go Home
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	const displayFirstName =
		isAuthenticated && orderDetails?.user?.first_name
			? orderDetails.user.first_name
			: customerDetailsFromState?.first_name;

	const displayOrderId = orderDetails?.id || orderId;
	const displayEmail =
		isAuthenticated && orderDetails?.user?.email
			? orderDetails.user.email
			: customerDetailsFromState?.email;
	const displayPhone =
		isAuthenticated && orderDetails?.user?.phone_number
			? orderDetails.user.phone_number
			: customerDetailsFromState?.phone;

	const pageTitle =
		isGuest ||
		(!isAuthenticated && customerDetailsFromState && !orderDetails?.items)
			? "Order Submitted!"
			: "Order Confirmation";

	if (
		isGuest ||
		(!isAuthenticated && customerDetailsFromState && !orderDetails?.items)
	) {
		return (
			<div className="bg-background min-h-screen flex flex-col">
				<PageHeader title={pageTitle} />
				{/* Adjusted top padding for content area */}
				<div className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="bg-primary-beige rounded-xl shadow-xl overflow-hidden p-6 md:p-8 border border-accent-subtle-gray/30"
					>
						<div className="text-center">
							<svg
								className="w-16 h-16 text-primary-green mx-auto mb-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2.5}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<h2 className="text-2xl md:text-3xl font-bold text-accent-dark-green mb-2">
								Thank You, {displayFirstName || "Valued Customer"}!
							</h2>
							<p className="text-accent-dark-brown mb-3">
								Your Order{" "}
								<span className="font-semibold text-primary-green">
									#{displayOrderId}
								</span>{" "}
								has been received.
							</p>
							{displayEmail && (
								<div className="flex items-center justify-center text-sm text-accent-dark-brown/80 mb-1">
									<FaEnvelope className="mr-2 text-accent-subtle-gray" />{" "}
									Confirmation sent to: {displayEmail}
								</div>
							)}
							{displayPhone && (
								<div className="flex items-center justify-center text-sm text-accent-dark-brown/80 mb-4">
									<FaPhone className="mr-2 text-accent-subtle-gray" /> Contact:{" "}
									{displayPhone}
								</div>
							)}
							<p className="text-accent-dark-brown mb-2 text-lg">
								We'll start preparing it shortly.
							</p>
							<p className="text-primary-green mb-6 text-xl font-bold">
								Est. Prep. Time: {displayEstimatedTime()}
							</p>
						</div>
						{orderDetails &&
							orderDetails.items &&
							orderDetails.items.length > 0 && (
								<div className="my-6 border-t border-b border-accent-subtle-gray/30 py-4">
									<h3 className="text-lg font-semibold text-accent-dark-green mb-3 text-center">
										Your Order Summary
									</h3>
									<OrderItems
										orderDetails={orderDetails}
										formatPrice={formatPrice}
									/>
								</div>
							)}
						<ActionButtons navigate={navigate} />
					</motion.div>
					<HelpSection />
				</div>
			</div>
		);
	}

	if (!orderDetails) {
		return (
			<div className="bg-background min-h-screen flex flex-col">
				<PageHeader title="Order Not Found" />
				<div className="flex-grow flex flex-col items-center justify-center p-4">
					<p className="text-accent-dark-brown">
						Order details are currently unavailable. Please try again later.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background min-h-screen flex flex-col">
			<PageHeader title={pageTitle} />
			{/* Adjusted top padding for content area */}
			<div className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="bg-primary-beige rounded-xl shadow-xl overflow-hidden border border-accent-subtle-gray/30"
				>
					<div className="bg-gradient-to-r from-primary-green to-accent-dark-green text-accent-light-beige p-6 text-center rounded-t-xl">
						<h2 className="text-xl sm:text-2xl font-bold mb-1">
							Thank you, {displayFirstName || "Valued Customer"}!
						</h2>
						<p className="text-sm opacity-90">
							Order{" "}
							<span className="font-semibold">
								#{orderDetails.id || displayOrderId}
							</span>{" "}
							Confirmed
						</p>
					</div>
					<div className="p-6 bg-accent-light-beige">
						<div className="text-center border-b border-accent-subtle-gray/50 pb-6 mb-6">
							<OrderStatusIndicator status={liveStatus} />
							<div className="mt-6">
								<span className="text-sm text-accent-dark-brown">
									Estimated Time:
								</span>
								<p className="text-2xl font-bold text-primary-green">
									{displayEstimatedTime()}
								</p>
							</div>
						</div>
						<div className="px-0 sm:px-2 py-4 border-b border-accent-subtle-gray/50 mb-6">
							<h3 className="font-semibold text-accent-dark-green mb-4 text-md">
								Order Progress
							</h3>
							<OrderTimeline status={liveStatus} />
						</div>
						<div className="space-y-6">
							<OrderDetails
								orderDetails={orderDetails}
								formatDate={formatDate}
								customerPhoneFromCheckout={customerDetailsFromState?.phone}
							/>
							<OrderItems
								orderDetails={orderDetails}
								formatPrice={formatPrice}
							/>
						</div>
						<div className="mt-8">
							<ActionButtons navigate={navigate} />
						</div>
					</div>
				</motion.div>
				<HelpSection />
			</div>
		</div>
	);
};

export default ConfirmationPage;
