import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import CartView from "../cart/CartView";
import RewardsRegistrationView from "../rewards/RewardsRegistrationView";
import TipSelectionView from "../tip/TipSelectionView";
import PaymentView from "../payment/PaymentView";
import ReceiptView from "../receipt/ReceiptView";
import CashFlowView from "../payment/CashFlowView";
import { Progress } from "@/components/ui/progress";

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
			onStepComplete(currentStep, stepDataFromChild);
		}
	};

	// Calculate progress based on current step
	const getStepProgress = () => {
		const steps = ["cart", "rewards", "tip", "payment", "receipt"];
		const currentIndex = steps.indexOf(currentStep);
		return currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
	};

	const renderStepContent = () => {
		const orderDataForView = {
			items: flowData?.cartData?.items || [],
			subtotal: flowData?.cartData?.subtotal || 0,
			tax: flowData?.cartData?.taxAmount || 0,
			total: flowData?.currentPaymentAmount || 0,
			baseForTipCalculation:
				flowData?.baseForTipCalculation || flowData?.currentPaymentAmount || 0,
			tipAmount: flowData?.tip?.tipAmount || 0,
			orderId: flowData?.orderId,
			discountAmount: flowData?.cartData?.discountAmount || 0,
			orderDiscount: flowData?.cartData?.orderDiscount,
			isSplitPayment: flowData?.isSplitPayment || false,
			splitDetails: flowData?.splitDetails,
			originalTotal: flowData?.cartData?.total || 0,
		};

		switch (currentStep) {
			case "cart":
				return <CartView cartData={flowData?.cartData} />;
			case "rewards":
				return <RewardsRegistrationView onComplete={handleStepComplete} />;
			case "tip":
				return (
					<TipSelectionView
						orderTotal={orderDataForView.baseForTipCalculation}
						orderData={orderDataForView}
						onComplete={handleStepComplete}
					/>
				);
			case "payment":
				if (flowData?.paymentMethod === "cash") {
					return (
						<CashFlowView
							orderData={orderDataForView}
							cashData={flowData?.cashData}
							isComplete={flowData?.cashPaymentComplete}
							onComplete={handleStepComplete}
						/>
					);
				}
				return (
					<PaymentView
						orderData={orderDataForView}
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
				return (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<p className="text-lg text-slate-600">
								Unknown step: {currentStep}
							</p>
						</div>
					</div>
				);
		}
	};

	return (
		<div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
			{/* Progress Bar */}
			<div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 p-4">
				<div className="max-w-md mx-auto">
					<Progress
						value={getStepProgress()}
						className="h-2"
					/>
					<p className="text-xs text-slate-500 text-center mt-2 capitalize">
						{currentStep.replace("_", " ")} Step
					</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-auto relative">
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
		</div>
	);
};

CustomerFlowView.propTypes = {
	flowData: PropTypes.shape({
		currentStep: PropTypes.string,
		cartData: PropTypes.object,
		baseForTipCalculation: PropTypes.number,
		splitDetails: PropTypes.object,
		tip: PropTypes.shape({
			tipAmount: PropTypes.number,
			tipPercentage: PropTypes.number,
		}),
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
