// File: combined/website/src/components/checkout/components/PaymentMethod.jsx
import React, { useEffect } from "react";
import { FaCreditCard, FaArrowLeft, FaStore } from "react-icons/fa";
import { StripeProvider } from "../../../contexts/StripeContext"; // Assuming correct path
import OrderSummary from "./OrderSummary";
import PaymentForm from "./payment/PaymentForm";
import { useAuth } from "../../../contexts/AuthContext";

const PaymentMethod = ({
	formData,
	handleChange,
	isSubmitting, // This is isProcessingOrder from useCheckout
	isCreatingOrder, // This is also isProcessingOrder
	pendingOrderId,
	prevStep,
	subtotal,
	surchargeAmount,
	surchargePercentageDisplay,
	taxDisplay,
	tax,
	total,
	formatPrice,
	handlePaymentSuccess,
	setError,
}) => {
	const { isAuthenticated } = useAuth();

	useEffect(() => {
		if (formData.payment_method !== "card") {
			console.warn(
				"PaymentMethod.jsx: formData.payment_method should be 'card'. Defaulting in useCheckout is recommended."
			);
		}
	}, [formData.payment_method]);

	return (
		// Main card: Primary Beige background, subtle border and shadow
		<div className="bg-primary-beige rounded-lg shadow-lg p-6 sm:p-8 border border-accent-subtle-gray/30">
			{/* Section Heading: Icon Primary Green, Text Dark Green */}
			<h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center text-accent-dark-green">
				<FaStore
					className="mr-3 text-primary-green"
					size={24}
				/>{" "}
				Pickup Information
			</h2>

			{/* Pickup Information Fields */}
			<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					{/* Label: Dark Green */}
					<label
						htmlFor="first_name"
						className="block text-sm font-medium text-accent-dark-green mb-1"
					>
						First Name {!isAuthenticated && "*"}
					</label>
					<input
						id="first_name"
						type="text"
						name="first_name"
						value={formData.first_name}
						onChange={handleChange}
						required={!isAuthenticated}
						readOnly={isAuthenticated && !!formData.first_name}
						// Input: White bg, Dark Brown text, Subtle Gray border, Primary Green focus
						// Readonly: Lighter Subtle Gray bg, Darker Brown text (slightly muted)
						className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
							isAuthenticated && !!formData.first_name
								? "bg-accent-subtle-gray/30 text-accent-dark-brown/70 cursor-not-allowed border-accent-subtle-gray/50"
								: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
						}`}
					/>
				</div>
				<div>
					<label
						htmlFor="last_name"
						className="block text-sm font-medium text-accent-dark-green mb-1"
					>
						Last Name {!isAuthenticated && "*"}
					</label>
					<input
						id="last_name"
						type="text"
						name="last_name"
						value={formData.last_name}
						onChange={handleChange}
						required={!isAuthenticated}
						readOnly={isAuthenticated && !!formData.last_name}
						className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
							isAuthenticated && !!formData.last_name
								? "bg-accent-subtle-gray/30 text-accent-dark-brown/70 cursor-not-allowed border-accent-subtle-gray/50"
								: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
						}`}
					/>
				</div>
			</div>
			<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-accent-dark-green mb-1"
					>
						Email {!isAuthenticated && "*"}
					</label>
					<input
						id="email"
						type="email"
						name="email"
						value={formData.email}
						onChange={handleChange}
						required={!isAuthenticated}
						readOnly={isAuthenticated && !!formData.email}
						className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
							isAuthenticated && !!formData.email
								? "bg-accent-subtle-gray/30 text-accent-dark-brown/70 cursor-not-allowed border-accent-subtle-gray/50"
								: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
						}`}
					/>
				</div>
				<div>
					<label
						htmlFor="phone"
						className="block text-sm font-medium text-accent-dark-green mb-1"
					>
						Phone Number *
					</label>
					<input
						id="phone"
						type="tel"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						required
						className="w-full px-3 py-2.5 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
					/>
				</div>
			</div>

			<div className="mb-6">
				<label
					htmlFor="notes"
					className="block text-sm font-medium text-accent-dark-green mb-1"
				>
					Special Instructions (optional)
				</label>
				<textarea
					id="notes" // Added id for label association
					name="notes"
					value={formData.notes}
					onChange={handleChange}
					rows="3"
					className="w-full px-3 py-2.5 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
					placeholder="Any special instructions for your order"
				></textarea>
			</div>

			{/* Pickup Details Box: Light Primary Green bg, Primary Green border, Dark Green/Brown text */}
			<div className="bg-primary-green/10 p-4 rounded-md mb-8 border border-primary-green/30">
				<div className="flex items-center">
					<FaStore className="text-primary-green mr-2" />
					<h3 className="font-semibold text-accent-dark-green">
						Pickup Details
					</h3>
				</div>
				<p className="text-sm text-accent-dark-brown mt-2">
					Your order will be available for pickup at our store:
					<strong className="text-accent-dark-green">
						{" "}
						2105 Cliff Rd Suite 300, Eagan, MN, 55124
					</strong>
				</p>
				<p className="text-sm text-accent-dark-brown mt-1">
					Pickup time:{" "}
					<strong className="text-accent-dark-green">15-20 minutes</strong>{" "}
					after placing your order
				</p>
			</div>

			{/* Section Heading: Icon Primary Green, Text Dark Green */}
			<h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center text-accent-dark-green">
				<FaCreditCard
					className="mr-3 text-primary-green"
					size={24}
				/>{" "}
				Payment Method
			</h2>

			{/* Payment method display: Light Primary Green bg, Primary Green border & text */}
			<div className="mb-6">
				<div className="border rounded-lg p-4 bg-primary-green/20 border-primary-green shadow-sm">
					<div className="flex items-center">
						<div className="w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 border-primary-green bg-primary-green">
							<div className="w-2 h-2 rounded-full bg-accent-light-beige"></div>
						</div>
						<div>
							<p className="font-semibold text-primary-green">Credit Card</p>
							<p className="text-sm text-primary-green/80">
								Pay securely online
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Stripe Payment Form Section: Light Beige bg, Subtle Gray border */}
			<div className="bg-accent-light-beige p-4 sm:p-6 rounded-md mb-6 border border-accent-subtle-gray/50">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold text-accent-dark-green">
						Credit Card Information
					</h3>
					{/* Card logos can be added here if desired */}
				</div>

				{isCreatingOrder ? (
					<div className="flex flex-col items-center justify-center p-8">
						{/* Spinner: Primary Green */}
						<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-green mb-4"></div>
						{/* Text: Dark Brown */}
						<p className="text-accent-dark-brown">Preparing for payment...</p>
					</div>
				) : pendingOrderId ? (
					<StripeProvider>
						<PaymentForm
							orderId={pendingOrderId}
							amount={total}
							onPaymentSuccess={handlePaymentSuccess}
							onPaymentError={(errorMsg) => setError(errorMsg)}
						/>
					</StripeProvider>
				) : (
					<div className="p-4 text-center text-accent-dark-brown">
						Please complete your pickup information above.
					</div>
				)}
			</div>

			{/* OrderSummary will be styled separately */}
			<OrderSummary
				subtotal={subtotal}
				surchargeAmount={surchargeAmount}
				surchargePercentageDisplay={surchargePercentageDisplay}
				tax={tax}
				deliveryFee={0}
				total={total}
				formatPrice={formatPrice}
				taxDisplay={taxDisplay}
			/>

			<div className="mt-8 flex justify-between items-center">
				{/* Back button: Primary Green text, hover Dark Green, hover bg Primary Beige */}
				<button
					type="button"
					onClick={prevStep}
					className="text-primary-green hover:text-accent-dark-green flex items-center px-4 py-2 rounded-md hover:bg-primary-beige/70 transition-colors font-medium text-sm"
				>
					<FaArrowLeft className="mr-2" /> Back to Cart Review
				</button>
				{/* The actual "Pay" button is part of PaymentForm, so no general button here */}
			</div>
		</div>
	);
};

export default PaymentMethod;
