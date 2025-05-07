// src/components/checkout/components/payment/PaymentForm.jsx
import React, { useState, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import axiosInstance from "../../../../api/api";
import CardDetails from "./CardDetails";
import PaymentError from "./PaymentError";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";

const PaymentForm = ({ orderId, amount, onPaymentSuccess, onPaymentError }) => {
	const stripe = useStripe();
	const elements = useElements();
	const [error, setError] = useState(null);
	const [processing, setProcessing] = useState(false);
	const [cardComplete, setCardComplete] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState(null);
	const [debugInfo, setDebugInfo] = useState({
		stripeLoaded: false,
		orderIdPresent: false,
		isProcessing: false,
		buttonDisabled: true,
		timestamp: Date.now(),
	});

	// Debug effect: Log state changes and update debug info
	useEffect(() => {
		const isButtonDisabled = !stripe || processing || !orderId || !cardComplete;

		const newDebugInfo = {
			stripeLoaded: !!stripe,
			orderIdPresent: !!orderId,
			cardComplete: cardComplete,
			isProcessing: processing,
			buttonDisabled: isButtonDisabled,
			timestamp: Date.now(),
		};

		setDebugInfo(newDebugInfo);

		console.log("PaymentForm Debug Info:", {
			stripe: !!stripe,
			elements: !!elements,
			orderId: orderId,
			cardComplete: cardComplete,
			processing: processing,
			buttonDisabled: isButtonDisabled,
			timestamp: new Date().toISOString(),
		});
	}, [stripe, elements, orderId, processing, cardComplete]);

	// Function to handle payment submission
	const handlePayment = async () => {
		console.log("Payment button clicked!");

		if (!stripe || !elements) {
			setError("Stripe hasn't loaded yet. Please try again.");
			return;
		}

		if (!orderId) {
			setError("No order ID provided. Please try again.");
			return;
		}

		if (!cardComplete) {
			setError("Please complete your card details before proceeding.");
			return;
		}

		setProcessing(true);
		setPaymentStatus("processing");
		setError(null);

		try {
			// Get card element
			const cardElement = elements.getElement(CardElement);
			console.log("Card element retrieved:", !!cardElement);

			// Create payment method
			console.log("Creating payment method...");
			const { error: pmError, paymentMethod } =
				await stripe.createPaymentMethod({
					type: "card",
					card: cardElement,
				});

			if (pmError) {
				console.error("Payment method creation error:", pmError);
				throw new Error(pmError.message);
			}

			console.log("Payment method created successfully:", paymentMethod.id);

			// Process payment with backend
			console.log("Sending payment to backend...");
			const response = await axiosInstance.post("payments/process-payment/", {
				order_id: orderId,
				payment_method_id: paymentMethod.id,
			});

			console.log("Backend payment response:", response.data);

			if (response.data.status === "succeeded") {
				console.log("Payment succeeded!");
				setPaymentStatus("success");
				onPaymentSuccess && onPaymentSuccess(response.data);
			} else {
				throw new Error(
					`Payment not completed. Status: ${response.data.status}`
				);
			}
		} catch (err) {
			console.error("Payment processing error:", err);
			setError(
				err.message || "An error occurred while processing your payment."
			);
			setPaymentStatus("error");
			onPaymentError && onPaymentError(err.message);
		} finally {
			setProcessing(false);
		}
	};

	const handleCardChange = (event) => {
		setCardComplete(event.complete);
		if (event.error) {
			setError(event.error.message);
		} else {
			setError(null);
		}
	};

	return (
		<div className="stripe-payment-container">
			<CardDetails onChange={handleCardChange} />

			<PaymentError message={error} />

			{/* Success message */}
			{paymentStatus === "success" && (
				<div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start">
					<FaCheckCircle className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
					<div>
						<p className="font-medium">Payment Successful</p>
						<p className="text-sm">
							Your payment has been processed successfully. You will be
							redirected shortly.
						</p>
					</div>
				</div>
			)}

			{/* Information for pending orders */}
			{!orderId && (
				<div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md flex items-start">
					<FaInfoCircle className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
					<p className="text-sm">
						Creating your order... Please wait a moment.
					</p>
				</div>
			)}

			{/* Debug information display in development mode */}
			{process.env.NODE_ENV === "development" && (
				<div className="mb-4 p-2 bg-gray-100 text-xs text-gray-800 rounded">
					<div>
						<strong>Debug Info:</strong>
					</div>
					<div>Stripe Loaded: {debugInfo.stripeLoaded ? "✅" : "❌"}</div>
					<div>Order ID Present: {debugInfo.orderIdPresent ? "✅" : "❌"}</div>
					<div>Card Complete: {debugInfo.cardComplete ? "✅" : "❌"}</div>
					<div>Processing: {debugInfo.isProcessing ? "⏳" : "✅"}</div>
					<div>Button Disabled: {debugInfo.buttonDisabled ? "⚠️" : "✅"}</div>
					<div>Order ID: {orderId || "null"}</div>
					<div>
						Last Update: {new Date(debugInfo.timestamp).toLocaleTimeString()}
					</div>
				</div>
			)}

			<button
				type="button"
				onClick={handlePayment}
				disabled={!stripe || processing || !orderId || !cardComplete}
				className={`w-full py-2 px-4 rounded-md text-white font-medium ${
					!stripe || processing || !orderId || !cardComplete
						? "bg-gray-400 cursor-not-allowed"
						: "bg-green-500 hover:bg-green-600"
				}`}
			>
				{processing ? (
					<span className="flex items-center justify-center">
						<svg
							className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
						Processing...
					</span>
				) : (
					`Pay $${amount ? amount.toFixed(2) : "0.00"}`
				)}
			</button>

			{/* Security notice */}
			<div className="mt-4 text-xs text-gray-500 flex items-center justify-center">
				<svg
					className="w-4 h-4 mr-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
				Payments are secure and encrypted
			</div>
		</div>
	);
};

export default PaymentForm;
