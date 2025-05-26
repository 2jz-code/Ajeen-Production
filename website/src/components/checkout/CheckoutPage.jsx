// src/components/checkout/CheckoutPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useCheckout from "./hooks/useCheckout";
import ProgressIndicator from "./components/ProgressIndicator";
import CartReview from "./components/CartReview";
import PaymentMethod from "./components/PaymentMethod";
// Navbar import removed

const CheckoutPage = () => {
	const navigate = useNavigate();
	const {
		cartItems,
		formData,
		step,
		isLoading,
		isProcessingOrder,
		error,
		pendingOrderId,
		subtotal,
		surchargeAmount,
		surchargePercentageDisplay,
		taxDisplay,
		tax,
		total,
		formatPrice,
		handleChange,
		nextStep,
		prevStep,
		// prepareOrderForPayment removed from destructuring as it's handled by useCheckout internally
		handlePaymentSuccess,
		setError,
	} = useCheckout();

	const renderStep = () => {
		switch (step) {
			case 1:
				return (
					<CartReview
						cartItems={cartItems}
						subtotal={subtotal}
						surchargeAmount={surchargeAmount}
						surchargePercentageDisplay={surchargePercentageDisplay}
						tax={tax}
						taxDisplay={taxDisplay}
						total={total}
						formatPrice={formatPrice}
						nextStep={nextStep}
					/>
				);
			case 2:
				return (
					<PaymentMethod
						formData={formData}
						handleChange={handleChange}
						isSubmitting={isProcessingOrder}
						isCreatingOrder={isProcessingOrder}
						pendingOrderId={pendingOrderId}
						prevStep={prevStep}
						subtotal={subtotal}
						surchargeAmount={surchargeAmount}
						surchargePercentageDisplay={surchargePercentageDisplay}
						tax={tax}
						taxDisplay={taxDisplay}
						deliveryFee={0}
						total={total}
						formatPrice={formatPrice}
						handlePaymentSuccess={handlePaymentSuccess}
						setError={setError}
						// createOrderBeforePayment prop removed as it's not used by PaymentMethod directly
					/>
				);
			default:
				return null;
		}
	};

	return (
		// Main page background: global --background (accent-light-beige)
		<div className="bg-background min-h-screen">
			{/* Navbar removed */}

			{/* Adjusted top padding as Navbar is removed. py-8 should be sufficient. */}
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
				{/* Checkout Header (simple back button and title) */}
				<div className="mb-8 flex items-center">
					<button
						onClick={() => navigate(-1)}
						// Back button: Dark green icon, hover primary beige background
						className="mr-3 p-2 rounded-md text-accent-dark-green hover:bg-primary-beige/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-background"
						aria-label="Go back"
					>
						<FaArrowLeft size={18} />
					</button>
					{/* Title: Dark Green */}
					<h1 className="text-2xl sm:text-3xl font-bold text-accent-dark-green">
						Checkout
					</h1>
				</div>

				{isLoading ? (
					// Loading spinner: Primary Green
					<div className="flex justify-center items-center h-64">
						<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green"></div>
					</div>
				) : (
					<>
						<ProgressIndicator step={step} />

						{error && (
							// Error message: Standard red theme
							<div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm shadow-sm">
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
