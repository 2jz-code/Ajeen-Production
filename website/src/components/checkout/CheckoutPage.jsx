// src/components/checkout/CheckoutPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import useCheckout from "./hooks/useCheckout";
import ProgressIndicator from "./components/ProgressIndicator";
import CartReview from "./components/CartReview";
import PaymentMethod from "./components/PaymentMethod"; // This likely renders OrderSummary too or needs totals

const CheckoutPage = () => {
	const navigate = useNavigate();
	const {
		cartItems,
		formData,
		step,
		isLoading,
		// isSubmitting, // in useCheckout.jsx it is isCreatingOrder
		isCreatingOrder, // Corrected name
		error,
		pendingOrderId,
		// isCreatingOrder, // already listed
		subtotal,
		surchargeAmount, // Added
		surchargePercentageDisplay, // Added
		taxDisplay,
		tax,
		total,
		formatPrice,
		handleChange,
		// handleRadioChange, // Not used in useCheckout currently for payment_method fixed to 'card'
		nextStep,
		prevStep,
		// handleSubmit, // This is likely part of PaymentMethod or createOrderBeforePayment
		createOrderBeforePayment, // if PaymentMethod needs to call it directly.
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
						surchargeAmount={surchargeAmount} // Pass down
						surchargePercentageDisplay={surchargePercentageDisplay} // Pass down
						tax={tax}
						taxDisplay={taxDisplay}
						deliveryFee={0}
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
						// handleRadioChange={handleRadioChange} // if re-enabled or used for something else
						// handleSubmit={handleSubmit} // if PaymentMethod has its own internal submit distinct from createOrderBeforePayment
						isSubmitting={isCreatingOrder} // Pass isCreatingOrder as isSubmitting
						isCreatingOrder={isCreatingOrder}
						pendingOrderId={pendingOrderId}
						prevStep={prevStep}
						subtotal={subtotal}
						surchargeAmount={surchargeAmount} // Pass down
						surchargePercentageDisplay={surchargePercentageDisplay} // Pass down
						tax={tax}
						taxDisplay={taxDisplay}
						deliveryFee={0}
						total={total}
						formatPrice={formatPrice}
						handlePaymentSuccess={handlePaymentSuccess}
						setError={setError}
						createOrderBeforePayment={createOrderBeforePayment} // Pass if PaymentMethod needs it
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
