// src/components/checkout/CheckoutPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useCheckout from "./hooks/useCheckout";
import ProgressIndicator from "./components/ProgressIndicator";
import CartReview from "./components/CartReview";
import PaymentMethod from "./components/PaymentMethod";

const CheckoutPage = () => {
	const navigate = useNavigate();
	const {
		cartItems,
		formData,
		step,
		isLoading,
		isSubmitting,
		error,
		pendingOrderId,
		isCreatingOrder,
		subtotal,
		tax,
		total,
		formatPrice,
		handleChange,
		handleRadioChange,
		nextStep,
		prevStep,
		handleSubmit,
		handlePaymentSuccess,
		setError,
	} = useCheckout();

	// Render current step based on state
	const renderStep = () => {
		switch (step) {
			case 1: // Review Cart
				return (
					<CartReview
						cartItems={cartItems}
						subtotal={subtotal}
						tax={tax}
						deliveryFee={0} // Set to 0 since delivery is not offered
						total={total}
						formatPrice={formatPrice}
						nextStep={nextStep}
					/>
				);
			case 2: // Payment & Pickup
				return (
					<PaymentMethod
						formData={formData}
						handleChange={handleChange}
						handleRadioChange={handleRadioChange}
						handleSubmit={handleSubmit}
						isSubmitting={isSubmitting}
						isCreatingOrder={isCreatingOrder}
						pendingOrderId={pendingOrderId}
						prevStep={prevStep}
						subtotal={subtotal}
						tax={tax}
						deliveryFee={0} // Set to 0 since delivery is not offered
						total={total}
						formatPrice={formatPrice}
						handlePaymentSuccess={handlePaymentSuccess}
						setError={setError}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="bg-gray-50 min-h-screen">
			<div className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center">
						<button
							onClick={() => navigate(-1)}
							className="mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors"
						>
							<FaArrowLeft className="text-gray-600" />
						</button>
						<h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
					</div>
				</div>
			</div>

			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{isLoading ? (
					<div className="flex justify-center items-center h-64">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
					</div>
				) : (
					<>
						<ProgressIndicator step={step} />

						{error && (
							<div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
								{error}
							</div>
						)}

						{renderStep()}
					</>
				)}
			</div>
		</div>
	);
};

export default CheckoutPage;
