// src/features/customerDisplay/components/flow/CustomerFlowView.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import CartView from "../cart/CartView";
import RewardsRegistrationView from "../rewards/RewardsRegistrationView";
import TipSelectionView from "../tip/TipSelectionView";
import PaymentView from "../payment/PaymentView";
import ReceiptView from "../receipt/ReceiptView";
import CashFlowView from "../payment/CashFlowView";
// calculateCartTotals is not directly used here anymore for primary display,
// but kept if cartData prop structure relies on it.
// import { calculateCartTotals } from "../../../cart/utils/cartCalculations";

const CustomerFlowView = ({ flowData, onStepComplete }) => {
	const [currentStep, setCurrentStep] = useState(
		flowData?.currentStep || "cart"
	);

	useEffect(() => {
		if (flowData?.currentStep) {
			setCurrentStep(flowData.currentStep);
		}
	}, [flowData]);

	const handleStepComplete = (stepDataFromChild) => {
		if (onStepComplete) {
			// console.log(`[CustomerFlowView] Completing step: ${currentStep}`, stepDataFromChild);
			onStepComplete(currentStep, stepDataFromChild);
		}
	};

	const renderStepContent = () => {
		// console.log("[CustomerFlowView] Rendering step. Current flowData:", JSON.stringify(flowData, null, 2));

		// orderDataForView now primarily uses values directly from flowData,
		// which should be set correctly by usePaymentFlow and useCustomerFlow
		const orderDataForView = {
			items: flowData?.cartData?.items || [],
			subtotal: flowData?.cartData?.subtotal || 0, // Raw cart subtotal
			tax: flowData?.cartData?.taxAmount || 0, // Raw cart tax
			total: flowData?.currentPaymentAmount || 0, // Amount due for THIS step (base+surcharge+tax)
			baseForTipCalculation:
				flowData?.baseForTipCalculation || flowData?.currentPaymentAmount || 0, // Crucial for TipSelectionView
			tipAmount: flowData?.tip?.tipAmount || 0, // Accumulated or current tip
			orderId: flowData?.orderId,
			discountAmount: flowData?.cartData?.discountAmount || 0,
			orderDiscount: flowData?.cartData?.orderDiscount,
			isSplitPayment: flowData?.isSplitPayment || false,
			splitDetails: flowData?.splitDetails,
			originalTotal: flowData?.cartData?.total || 0, // Original total of the cart (subtotal-disc+tax)
		};
		// console.log("[CustomerFlowView] Constructed orderDataForView:", JSON.stringify(orderDataForView, null, 2));

		switch (currentStep) {
			case "cart":
				return <CartView cartData={flowData?.cartData} />;
			case "rewards":
				return <RewardsRegistrationView onComplete={handleStepComplete} />;
			case "tip":
				return (
					<TipSelectionView
						// Pass the specific base amount for tip calculation
						orderTotal={orderDataForView.baseForTipCalculation}
						orderData={orderDataForView} // Pass full object if needed for other display elements
						onComplete={handleStepComplete}
					/>
				);
			case "payment":
				if (flowData?.paymentMethod === "cash") {
					return (
						<CashFlowView
							orderData={orderDataForView} // Contains currentPaymentAmount as 'total' for this step
							cashData={flowData?.cashData}
							isComplete={flowData?.cashPaymentComplete}
							onComplete={handleStepComplete}
						/>
					);
				}
				return (
					<PaymentView // For credit card
						orderData={orderDataForView} // Contains currentPaymentAmount as 'total' and tipAmount
						onComplete={handleStepComplete}
					/>
				);
			case "receipt":
				return (
					<ReceiptView
						orderData={orderDataForView}
						paymentData={flowData?.payment}
						paymentMethod={flowData?.paymentMethod}
						onComplete={handleStepComplete}
					/>
				);
			default:
				return <div>Unknown step in CustomerFlowView: {currentStep}</div>;
		}
	};
	return (
		<div className="w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut" }}
			></motion.div>
			<div className="flex-1 overflow-auto relative z-10">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -15 }}
					transition={{ duration: 0.3 }}
					className="h-full"
				>
					{renderStepContent()}
				</motion.div>
			</div>
			<motion.div
				className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 w-full flex-shrink-0 z-10 shadow-sm"
				initial={{ scaleX: 0 }}
				animate={{ scaleX: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			></motion.div>
		</div>
	);
};

CustomerFlowView.propTypes = {
	flowData: PropTypes.shape({
		currentStep: PropTypes.string,
		cartData: PropTypes.object,
		baseForTipCalculation: PropTypes.number, // Added this
		splitDetails: PropTypes.object,
		tip: PropTypes.shape({
			tipAmount: PropTypes.number,
			tipPercentage: PropTypes.number,
		}), // Expect tip object
		payment: PropTypes.object,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		cashData: PropTypes.object,
		paymentMethod: PropTypes.string,
		cashPaymentComplete: PropTypes.bool,
		isSplitPayment: PropTypes.bool,
		currentPaymentAmount: PropTypes.number,
	}),
	onStepComplete: PropTypes.func,
};

export default CustomerFlowView;
