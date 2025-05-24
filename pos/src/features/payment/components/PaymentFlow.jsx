import { AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PaymentHeader } from "./PaymentHeader";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentStatus } from "./PaymentStatus";
import { usePaymentFlow } from "../hooks/usePaymentFlow";
import { PaymentViews } from "../views";
import { useCartActions } from "../../cart/hooks/useCartActions";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";

const TAX_RATE = 0.1;

export const PaymentFlow = ({ totalAmount, onBack }) => {
	const cartActions = useCartActions();

	const handleBackendComplete = useCallback(
		async (orderId, paymentPayload) => {
			try {
				if (!orderId || !paymentPayload) {
					console.error(
						"PAYMENT FLOW: Missing orderId or paymentPayload for completion!"
					);
					return null;
				}
				const result = await cartActions.completeOrder(orderId, paymentPayload);
				return result;
			} catch (error) {
				console.error(
					"PAYMENT FLOW: Error calling cartActions.completeOrder:",
					error
				);
				return null;
			}
		},
		[cartActions]
	);

	const handleNewOrderRequest = useCallback(async () => {
		try {
			useCartStore.getState().clearCart();
			onBack();
		} catch (error) {
			console.error(
				"Error handling new order request from PaymentFlow:",
				error
			);
		}
	}, [onBack]);

	const {
		state,
		setState,
		error,
		isCompleting,
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow,
		isPaymentComplete,
		handleStartNewOrder,
		getDisplayTotals,
	} = usePaymentFlow({
		totalAmount,
		onComplete: handleBackendComplete,
		onNewOrder: handleNewOrderRequest,
	});

	const handleBackNavigation = () => {
		const handledByHook = handleBack();
		if (!handledByHook) {
			onBack();
		}
	};

	const displayTotalsObject = getDisplayTotals();
	const CurrentView = PaymentViews[state.currentView];

	const orderBasePreTaxPreSurchargeTotal = useMemo(() => {
		return new Decimal(totalAmount || 0)
			.div(new Decimal(1).plus(TAX_RATE))
			.toNumber();
	}, [totalAmount]);

	const remainingBaseForSplitView = useMemo(() => {
		return Math.max(
			0,
			orderBasePreTaxPreSurchargeTotal - (state.amountPaid || 0)
		);
	}, [orderBasePreTaxPreSurchargeTotal, state.amountPaid]);

	return (
		<div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
			<PaymentHeader
				onBack={handleBackNavigation}
				title={`Payment - Order #${state.orderId || "..."}`}
			/>

			<div className="flex-1 relative overflow-hidden">
				<Card className="h-full rounded-none border-0 shadow-none bg-transparent">
					<div className="h-full relative overflow-hidden">
						<AnimatePresence
							initial={false}
							custom={state.direction}
							mode="wait"
						>
							<CurrentView
								key={state.currentView}
								state={state}
								setState={setState}
								remainingAmount={displayTotalsObject.displayRemainingOverall}
								orderBaseRemainingPreTaxPreSurcharge={remainingBaseForSplitView}
								handleNavigation={handleNavigation}
								handlePayment={processPayment}
								isPaymentComplete={isPaymentComplete}
								completePaymentFlow={completePaymentFlow}
								onStartNewOrder={handleStartNewOrder}
								totalAmount={totalAmount}
								isCompleting={isCompleting}
								paymentResult={
									state.currentView === "Completion"
										? state.completionResultData
										: undefined
								}
							/>
						</AnimatePresence>
					</div>
				</Card>

				<PaymentStatus
					error={error}
					isProcessing={isCompleting}
				/>
			</div>

			{state.currentView !== "Completion" && (
				<PaymentSummary
					subtotal={displayTotalsObject.displayCartSubtotal}
					taxAmount={displayTotalsObject.displayTaxAmount}
					discountAmount={displayTotalsObject.displayCartDiscountAmount}
					surchargeAmount={displayTotalsObject.displaySurchargeAmount}
					tipAmount={displayTotalsObject.displayTipAmount}
					grandTotal={displayTotalsObject.displayGrandTotal}
					amountPaid={displayTotalsObject.displayAmountPaidToBaseOrder}
					remainingAfterPayments={displayTotalsObject.displayRemainingOverall}
				/>
			)}
		</div>
	);
};

PaymentFlow.propTypes = {
	totalAmount: PropTypes.number.isRequired,
	onBack: PropTypes.func.isRequired,
};

export default PaymentFlow;
