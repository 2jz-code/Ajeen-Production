// File: combined/website/src/components/checkout/components/PaymentMethod.jsx
import React, { useEffect } from "react"; // Added useEffect if not present
import { FaCreditCard, FaArrowLeft, FaStore } from "react-icons/fa";
import { StripeProvider } from "../../../contexts/StripeContext"; // Assuming correct path
import OrderSummary from "./OrderSummary";
import PaymentForm from "./payment/PaymentForm";
import { useAuth } from "../../../contexts/AuthContext";

const PaymentMethod = ({
	formData,
	handleChange,
	isSubmitting,
	isCreatingOrder,
	pendingOrderId,
	prevStep,
	subtotal,
	// Add these two props:
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

	// Ensure formData.payment_method is 'card' if controlled by parent.
	// This is best handled by initializing formData in useCheckout.jsx to 'card'.
	useEffect(() => {
		if (formData.payment_method !== "card") {
			console.warn(
				"PaymentMethod.jsx: formData.payment_method should be 'card'. Defaulting in useCheckout is recommended."
			);
			// If handleRadioChange was used to set parent state, this component shouldn't force it.
			// The parent (useCheckout) should ensure formData.payment_method is 'card'.
		}
	}, [formData.payment_method]);

	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			<h2 className="text-xl font-semibold mb-6 flex items-center">
				<FaStore className="mr-2 text-green-500" /> Pickup Information
			</h2>

			{/* Pickup Information Fields */}
			<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="first_name"
						className="block text-gray-700 text-sm font-medium mb-2"
					>
						First Name {!isAuthenticated && "*"}
					</label>
					<input
						id="first_name"
						type="text"
						name="first_name"
						value={formData.first_name}
						onChange={handleChange}
						required={!isAuthenticated} // Required for guests
						readOnly={isAuthenticated && !!formData.first_name} // ReadOnly if auth & prefilled
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated && !!formData.first_name
								? "bg-gray-100 cursor-not-allowed"
								: "border-gray-300"
						}`}
					/>
				</div>
				<div>
					<label
						htmlFor="last_name"
						className="block text-gray-700 text-sm font-medium mb-2"
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
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated && !!formData.last_name
								? "bg-gray-100 cursor-not-allowed"
								: "border-gray-300"
						}`}
					/>
				</div>
			</div>
			<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="email"
						className="block text-gray-700 text-sm font-medium mb-2"
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
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated && !!formData.email
								? "bg-gray-100 cursor-not-allowed"
								: "border-gray-300"
						}`}
					/>
				</div>
				<div>
					<label
						htmlFor="phone"
						className="block text-gray-700 text-sm font-medium mb-2"
					>
						Phone Number * {/* Now always required */}
					</label>
					<input
						id="phone"
						type="tel"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						required // Phone is now always required
						// Allow editing even for authenticated users if their profile phone might be outdated
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
					/>
				</div>
			</div>

			<div className="mb-6">
				<label className="block text-gray-700 text-sm font-medium mb-2">
					Special Instructions (optional)
				</label>
				<textarea
					name="notes"
					value={formData.notes}
					onChange={handleChange}
					rows="3"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
					placeholder="Any special instructions for your order"
				></textarea>
			</div>

			<div className="bg-green-50 p-4 rounded-md mb-6 border border-green-200">
				{/* ... (Pickup Details section remains the same) ... */}
				<div className="flex items-center">
					<FaStore className="text-green-500 mr-2" />
					<h3 className="font-medium">Pickup Details</h3>
				</div>
				<p className="text-sm text-gray-600 mt-2">
					Your order will be available for pickup at our store:
					<strong> 2105 Cliff Rd Suite 300, Eagan, MN, 55124</strong>
				</p>
				<p className="text-sm text-gray-600 mt-1">
					Pickup time: <strong>15-20 minutes</strong> after placing your order
				</p>
			</div>

			<h2 className="text-xl font-semibold mb-6 flex items-center">
				<FaCreditCard className="mr-2 text-green-500" /> Payment Method
			</h2>

			{/* Payment method display - Card is the only option */}
			<div className="mb-6">
				<div className="border rounded-lg p-4 bg-green-50 border-green-300 shadow-sm">
					<div className="flex items-center">
						<div className="w-5 h-5 rounded-full border flex items-center justify-center mr-3 border-green-500 bg-green-500">
							<div className="w-2 h-2 rounded-full bg-white"></div>{" "}
							{/* Inner dot for selected look */}
						</div>
						<div>
							<p className="font-medium text-green-700">Credit Card</p>
							<p className="text-sm text-green-600">Pay securely online</p>
						</div>
					</div>
				</div>
			</div>

			{/* Stripe Payment Form Section */}
			<div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-medium">Credit Card Information</h3>
					{/* ... (Card logos) ... */}
				</div>

				{isCreatingOrder ? ( // Show loader if order record is being created by useCheckout
					<div className="flex flex-col items-center justify-center p-8">
						<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-4"></div>
						<p className="text-gray-600">Preparing for payment...</p>
					</div>
				) : pendingOrderId ? ( // If orderId is ready, show Stripe form
					<StripeProvider>
						<PaymentForm
							orderId={pendingOrderId}
							amount={total} // useCheckout provides this calculated total
							onPaymentSuccess={handlePaymentSuccess}
							onPaymentError={(errorMsg) => setError(errorMsg)}
						/>
					</StripeProvider>
				) : (
					// Optional: State before orderId is ready but not actively creating (e.g., form not fully valid yet)
					<div className="p-4 text-center text-gray-500">
						Please complete your pickup information above.
					</div>
				)}
			</div>

			<OrderSummary
				subtotal={subtotal}
				// Pass the new props here:
				surchargeAmount={surchargeAmount}
				surchargePercentageDisplay={surchargePercentageDisplay}
				tax={tax}
				deliveryFee={0} // This was already present
				total={total}
				formatPrice={formatPrice}
				taxDisplay={taxDisplay}
			/>

			<div className="mt-8 flex justify-between">
				<button
					type="button"
					onClick={prevStep}
					className="text-gray-600 hover:text-gray-800 flex items-center px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
				>
					<FaArrowLeft className="mr-2" /> Back to Cart Review
				</button>
				{/* The actual "Pay" button is now part of PaymentForm (Stripe Elements) */}
				{/* No general "Place Order" button here anymore for card payments */}
			</div>
		</div>
	);
};

export default PaymentMethod;
