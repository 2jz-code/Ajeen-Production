// src/components/checkout/components/payment/PaymentForm.jsx
import React, { useState, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import axiosInstance from "../../../../api/api"; // Assuming path
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
	}, [stripe, elements, orderId, processing, cardComplete]);

	const handlePayment = async () => {
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
			const cardElement = elements.getElement(CardElement);
			const { error: pmError, paymentMethod } =
				await stripe.createPaymentMethod({
					type: "card",
					card: cardElement,
				});

			if (pmError) {
				console.error("Payment method creation error:", pmError);
				throw new Error(pmError.message);
			}

			const response = await axiosInstance.post("payments/process-payment/", {
				order_id: orderId,
				payment_method_id: paymentMethod.id,
			});

			if (response.data.status === "succeeded") {
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
		// Container for the payment form elements
		<div className="stripe-payment-container space-y-4">
			{/* CardDetails will be styled in its own file */}
			<CardDetails onChange={handleCardChange} />

			{/* PaymentError will be styled in its own file */}
			<PaymentError message={error} />

			{/* Success message: Light Primary Green bg, Primary Green text & icon */}
			{paymentStatus === "success" && (
				<div className="mb-4 bg-primary-green/10 border border-primary-green/30 text-primary-green px-4 py-3 rounded-md flex items-start text-sm shadow-sm">
					<FaCheckCircle className="text-primary-green mr-2 mt-0.5 flex-shrink-0" />
					<div>
						<p className="font-semibold">Payment Successful</p>
						<p>
							Your payment has been processed successfully. You will be
							redirected shortly.
						</p>
					</div>
				</div>
			)}

			{/* Information for pending orders: Primary Beige bg, Dark Brown text, Subtle Gray icon */}
			{!orderId && (
				<div className="mb-4 bg-primary-beige/70 border border-accent-subtle-gray/50 text-accent-dark-brown px-4 py-3 rounded-md flex items-start text-sm shadow-sm">
					<FaInfoCircle className="text-accent-subtle-gray mr-2 mt-0.5 flex-shrink-0" />
					<p>Creating your order... Please wait a moment.</p>
				</div>
			)}

			{/* Debug information display */}
			{/* {process.env.NODE_ENV === "development" && (
				// Debug box: Subtle Gray bg, Dark Brown text
				<div className="mb-4 p-3 bg-accent-subtle-gray/20 text-xs text-accent-dark-brown rounded-md border border-accent-subtle-gray/30">
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
			)} */}

			{/* Pay Button: Primary Green bg, Light Beige text. Disabled: Subtle Gray bg, Dark Brown text */}
			<button
				type="button"
				onClick={handlePayment}
				disabled={!stripe || processing || !orderId || !cardComplete}
				className={`w-full py-3 px-4 rounded-lg font-semibold text-base transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-accent-light-beige
					${
						!stripe || processing || !orderId || !cardComplete
							? "bg-accent-subtle-gray text-accent-dark-brown/70 cursor-not-allowed"
							: "bg-primary-green text-accent-light-beige hover:bg-accent-dark-green focus:ring-primary-green"
					}`}
			>
				{processing ? (
					<span className="flex items-center justify-center">
						<svg
							// Spinner color: Light Beige (same as button text)
							className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-light-beige"
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

			{/* Security notice: Dark Brown text (slightly transparent), Subtle Gray icon */}
			<div className="mt-4 text-xs text-accent-dark-brown/80 flex items-center justify-center">
				<svg
					className="w-4 h-4 mr-1.5 text-accent-subtle-gray" // Icon color
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
