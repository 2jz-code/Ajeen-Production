// src/components/checkout/components/PaymentMethod.jsx
import React from "react";
import { FaCreditCard, FaArrowLeft, FaStore } from "react-icons/fa";
import { StripeProvider } from "../../../contexts/StripeContext";
import OrderSummary from "./OrderSummary";
import PaymentForm from "./payment/PaymentForm";
import { useAuth } from "../../../contexts/AuthContext"; // Import useAuth to check status

const PaymentMethod = ({
	formData,
	handleChange,
	handleRadioChange,
	handleSubmit, // Used for Cash button
	isSubmitting,
	isCreatingOrder,
	pendingOrderId,
	prevStep,
	subtotal,
	tax,
	total,
	formatPrice,
	handlePaymentSuccess,
	setError,
	// No need to pass isAuthenticated, we can get it from context here
	// isAuthenticated,
}) => {
	const { isAuthenticated } = useAuth(); // Get auth status directly

	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			<h2 className="text-xl font-semibold mb-6 flex items-center">
				<FaStore className="mr-2 text-green-500" /> Pickup Information
			</h2>

			{/* Pickup Information - Conditionally Required */}
			{/* For guests, these fields are essential. For logged-in users, they are pre-filled but can be edited */}
			<div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="first_name" // Add htmlFor for accessibility
						className="block text-gray-700 text-sm font-medium mb-2"
					>
						First Name {!isAuthenticated && "*"} {/* Add asterisk for guests */}
					</label>
					<input
						id="first_name" // Add id
						type="text"
						name="first_name"
						value={formData.first_name}
						onChange={handleChange}
						required={!isAuthenticated} // Required only for guests
						readOnly={isAuthenticated} // Make read-only for logged-in users
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated
								? "bg-gray-100 cursor-not-allowed"
								: "border-gray-300" // Style differently if readOnly
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
						readOnly={isAuthenticated}
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated
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
						readOnly={isAuthenticated}
						className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							isAuthenticated
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
						Phone Number {!isAuthenticated && "*"}
					</label>
					<input
						id="phone"
						type="tel"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
						required={!isAuthenticated}
						// Allow phone number editing even if logged in? Or make readOnly too?
						// readOnly={isAuthenticated} // Uncomment if phone should also be read-only
						className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
							/*isAuthenticated ? 'bg-gray-100 cursor-not-allowed' :*/ "" // Example: Keep editable
						}`}
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

			<div className="mb-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Cash option */}
					<div
						className={`border rounded-lg p-4 cursor-pointer transition-colors ${
							formData.payment_method === "cash"
								? "border-green-500 bg-green-50"
								: "border-gray-200 hover:border-gray-300"
						}`}
						onClick={() => handleRadioChange("payment_method", "cash")}
					>
						<div className="flex items-center">
							<div
								className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
									formData.payment_method === "cash"
										? "border-green-500"
										: "border-gray-300"
								}`}
							>
								{formData.payment_method === "cash" && (
									<div className="w-3 h-3 rounded-full bg-green-500"></div>
								)}
							</div>
							<div>
								<p className="font-medium">Cash on Pickup</p>
								<p className="text-sm text-gray-500">
									Pay when you pick up your order
								</p>
							</div>
						</div>
					</div>

					{/* Card option */}
					<div
						className={`border rounded-lg p-4 cursor-pointer transition-colors ${
							formData.payment_method === "card"
								? "border-green-500 bg-green-50"
								: "border-gray-200 hover:border-gray-300"
						}`}
						onClick={() => handleRadioChange("payment_method", "card")}
					>
						<div className="flex items-center">
							<div
								className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
									formData.payment_method === "card"
										? "border-green-500"
										: "border-gray-300"
								}`}
							>
								{formData.payment_method === "card" && (
									<div className="w-3 h-3 rounded-full bg-green-500"></div>
								)}
							</div>
							<div>
								<p className="font-medium">Credit Card</p>
								<p className="text-sm text-gray-500">Pay securely online</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{formData.payment_method === "card" && (
				<div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-medium">Credit Card Information</h3>
						<div className="flex space-x-2">
							{/* Card logos */}
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png"
								alt="Visa"
								className="h-6"
							/>
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
								alt="Mastercard"
								className="h-6"
							/>
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png"
								alt="Amex"
								className="h-6"
							/>
						</div>
					</div>

					{isCreatingOrder ||
					(isSubmitting && formData.payment_method === "card") ? (
						<div className="flex flex-col items-center justify-center p-8">
							<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-4"></div>
							<p className="text-gray-600">Creating your order...</p>
						</div>
					) : (
						<StripeProvider>
							<PaymentForm
								orderId={pendingOrderId}
								amount={total}
								onPaymentSuccess={handlePaymentSuccess}
								onPaymentError={(errorMsg) => setError(errorMsg)}
							/>
						</StripeProvider>
					)}
				</div>
			)}

			{/* Order Summary */}
			<OrderSummary
				subtotal={subtotal}
				tax={tax}
				deliveryFee={0} // Set to 0 since delivery is not offered
				total={total}
				formatPrice={formatPrice}
			/>

			<div className="mt-8 flex justify-between">
				<button
					type="button"
					onClick={prevStep}
					className="text-gray-600 hover:text-gray-800 flex items-center"
				>
					<FaArrowLeft className="mr-2" /> Back to Cart
				</button>

				{/* Only show Place Order button for cash payments */}
				{formData.payment_method === "cash" && (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={isSubmitting}
						className={`${
							isSubmitting ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
						} text-white px-6 py-2 rounded-md transition-colors flex items-center`}
					>
						{isSubmitting ? (
							<>
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
							</>
						) : (
							<>Place Order</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};

export default PaymentMethod;
