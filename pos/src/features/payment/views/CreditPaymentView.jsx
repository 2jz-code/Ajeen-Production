// src/features/payment/views/CreditPaymentView.jsx
import { motion } from "framer-motion";
import { CreditCardIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../../features/customerDisplay/hooks/useCustomerFlow";
import { formatPrice } from "../../../utils/numberUtils";
import TerminalStatusIndicator from "../components/TerminalStatusIndicator";
import { useCartStore } from "../../../store/cartStore";
import { useTerminal } from "../hooks/useTerminal";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
import { toast } from "react-toastify";

const { pageVariants, pageTransition } = paymentAnimations;

const commonPropTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.array.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number,
		currentStepAmount: PropTypes.number,
		currentBaseForTipCalc: PropTypes.number, // Added this to propTypes
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired,
};

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CreditPaymentView = ({
	state,
	remainingAmount: remainingAmountProp,
	handlePayment,
	completePaymentFlow,
	handleNavigation,
	totalAmount,
}) => {
	const [error, setError] = useState(null);
	const [viewProcessingState, setViewProcessingState] = useState(false);
	const [flowStarted, setFlowStarted] = useState(false);

	const { cancelTerminalAction } = useTerminal();
	const {
		flowActive,
		currentStep: customerFlowStep,
		startFlow,
		completeFlow: completeCustomerDisplayFlow,
		stepData,
		resetFlowForSplitContinuation,
	} = useCustomerFlow();

	const paymentProcessedRef = useRef(false);
	const completionProcessedRef = useRef(false);
	const isMountedRef = useRef(false);
	const epsilon = 0.01;

	const currentPaymentAmount = useMemo(() => {
		if (
			state.splitMode &&
			state.currentStepAmount !== null &&
			state.currentStepAmount !== undefined &&
			state.currentStepAmount >= 0
		) {
			return parseFloat(state.currentStepAmount.toFixed(2));
		}
		if (!state.splitMode) {
			const overallRemaining = Math.max(0, remainingAmountProp);
			return parseFloat(overallRemaining.toFixed(2));
		}
		console.warn(
			"CreditPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
		);
		const fallbackRemaining = Math.max(0, remainingAmountProp);
		return parseFloat(fallbackRemaining.toFixed(2));
	}, [state.splitMode, state.currentStepAmount, remainingAmountProp]);

	// This is the amount (base + surcharge + tax) that the tip will be calculated on
	const baseForTipCalculation = useMemo(() => {
		return parseFloat(
			(state.currentBaseForTipCalc || currentPaymentAmount || 0).toFixed(2)
		);
	}, [state.currentBaseForTipCalc, currentPaymentAmount]);

	const tipForThisPayment = stepData?.tip?.tipAmount || 0;
	const amountChargedThisTxnNum = parseFloat(
		new Decimal(baseForTipCalculation) // Tip is added to the baseForTipCalculation
			.plus(new Decimal(tipForThisPayment))
			.toFixed(2)
	);
	const currentPaymentAmountNum = parseFloat(
		// This is base + surcharge + tax for the step
		new Decimal(currentPaymentAmount).toFixed(2)
	);
	const tipForThisPaymentNum = parseFloat(
		new Decimal(tipForThisPayment).toFixed(2)
	);

	useEffect(() => {
		isMountedRef.current = true;
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;
		setError(null);
		setFlowStarted(false);
		setViewProcessingState(false);
		return () => {
			isMountedRef.current = false;
		};
	}, [totalAmount]);

	const startCreditPaymentFlow = useCallback(async () => {
		if (flowStarted || viewProcessingState || !isMountedRef.current) return;
		setViewProcessingState(true);
		setError(null);
		paymentProcessedRef.current = false;
		completionProcessedRef.current = false;
		try {
			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) throw new Error("Order ID missing");

			const payloadForDisplay = {
				orderData: {
					total: currentPaymentAmountNum, // Amount for this step (base+surcharge+tax)
					isSplitPayment: state.splitMode,
					originalTotal: totalAmount, // Overall order original total (subtotal-discount)
					// Pass the correct base for tip calculation to the customer display
					baseForTipCalculation: baseForTipCalculation,
				},
			};
			const startFlowArgs = {
				orderId: orderId,
				initialStep: "tip",
				paymentMethod: "credit",
				amountDue: currentPaymentAmountNum, // Amount for this step (base+surcharge+tax)
				baseForTipCalculation: baseForTipCalculation, // Explicitly pass this
				isSplitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null,
				payload: payloadForDisplay,
			};
			startFlow(startFlowArgs);
			setFlowStarted(true);
		} catch (err) {
			console.error("CREDIT VIEW: Error starting customer display flow:", err);
			setError(err.message || "Failed to start payment process.");
			setFlowStarted(false);
		} finally {
			if (isMountedRef.current) setViewProcessingState(false);
		}
	}, [
		state.orderId,
		state.splitMode,
		state.splitDetails,
		currentPaymentAmountNum,
		baseForTipCalculation, // Use this for tip base
		totalAmount,
		flowStarted,
		viewProcessingState,
		startFlow,
	]);

	useEffect(() => {
		const receiptStepSignalledComplete = stepData.receiptComplete === true;
		const paymentSuccess = stepData.payment?.status === "success";

		if (
			customerFlowStep === "receipt" &&
			receiptStepSignalledComplete &&
			paymentSuccess &&
			!paymentProcessedRef.current
		) {
			paymentProcessedRef.current = true;
			setViewProcessingState(true);

			const paymentInfo = stepData.payment;
			const nestedPaymentObject = {
				status: "success",
				transactionId: paymentInfo.transactionId,
				amount: amountChargedThisTxnNum, // Total charged including tip
				timestamp: paymentInfo.timestamp || new Date().toISOString(),
				cardInfo: paymentInfo.cardInfo || { brand: "Card", last4: "****" },
				reader: paymentInfo.reader || null,
				splitPayment: state.splitMode,
				splitAmount: state.splitMode ? currentPaymentAmountNum : null, // Base + Surcharge + Tax for step
				originalTotal: totalAmount, // Original order total (subtotal-discount)
				orderId: state.orderId,
				tipAmount: tipForThisPaymentNum,
			};
			const transactionDetails = {
				method: "credit",
				cardInfo: paymentInfo.cardInfo,
				transactionId: paymentInfo.transactionId,
				flowData: { ...stepData, payment: nestedPaymentObject },
				tipAmount: tipForThisPaymentNum, // Ensure tip is included here
			};

			handlePayment(amountChargedThisTxnNum, transactionDetails)
				.then((paymentResult) => {
					if (!isMountedRef.current) return;
					if (!paymentResult || !paymentResult.success) {
						throw new Error(
							paymentResult?.error || "Failed to record payment transaction."
						);
					}
					const { isNowComplete, updatedTransactions } = paymentResult;
					if (isNowComplete && !completionProcessedRef.current) {
						completionProcessedRef.current = true;
						(async () => {
							let finalizationErrorOccurred = false;
							try {
								const completedOrderData = await completePaymentFlow(
									updatedTransactions
								);
								if (!isMountedRef.current) return;
								if (completedOrderData) {
									const receiptPayload =
										completedOrderData.receipt_payload || null;
									handleNavigation("Completion", 1, {
										receiptPayload: receiptPayload,
									});
								} else {
									finalizationErrorOccurred = true;
									toast.error("Failed to finalize order.");
								}
							} catch (finalizationError) {
								if (!isMountedRef.current) return;
								setError(
									finalizationError.message || "Error finalizing order."
								);
								toast.error(
									`Error: ${finalizationError.message || "Finalization failed"}`
								);
								finalizationErrorOccurred = true;
							} finally {
								if (isMountedRef.current) {
									if (finalizationErrorOccurred)
										completionProcessedRef.current = false;
									setViewProcessingState(false);
								}
							}
						})();
					} else if (
						state.splitMode &&
						!isNowComplete &&
						!completionProcessedRef.current
					) {
						completionProcessedRef.current = true;
						completeCustomerDisplayFlow();
						setFlowStarted(false);
						const orderTotalPreTaxPreSurcharge = new Decimal(totalAmount)
							.div(new Decimal(1).plus(0.1))
							.toNumber(); // Assuming TAX_RATE is 0.10
						const amountPaidSoFarPreTaxPreSurcharge =
							paymentResult.newAmountPaid; // This is base (pre-tax, pre-surcharge)
						const remainingAfterThisSplitPreTaxPreSurcharge = Math.max(
							0,
							orderTotalPreTaxPreSurcharge - amountPaidSoFarPreTaxPreSurcharge
						);

						resetFlowForSplitContinuation({
							amountPaid: amountPaidSoFarPreTaxPreSurcharge, // Pass the base amount paid
							remainingAmount: remainingAfterThisSplitPreTaxPreSurcharge, // Pass remaining base
							currentPaymentAmount: amountChargedThisTxnNum, // Amount of this transaction
						});
						setTimeout(() => {
							if (isMountedRef.current) {
								handleNavigation("Split", -1);
								completionProcessedRef.current = false;
								paymentProcessedRef.current = false;
							}
						}, 50);
						setViewProcessingState(false);
					} else if (completionProcessedRef.current) {
						if (viewProcessingState) setViewProcessingState(false);
					} else {
						setError("Unexpected payment state after processing.");
						completionProcessedRef.current = false;
						paymentProcessedRef.current = false;
						setViewProcessingState(false);
					}
				})
				.catch((err) => {
					if (!isMountedRef.current) return;
					setError(err.message || "Error processing payment.");
					paymentProcessedRef.current = false;
					completionProcessedRef.current = false;
					completeCustomerDisplayFlow();
					setFlowStarted(false);
					setViewProcessingState(false);
				});
		}
	}, [
		customerFlowStep,
		stepData.receiptComplete,
		stepData.payment?.status,
		stepData.payment?.transactionId,
		handlePayment,
		completePaymentFlow,
		handleNavigation,
		completeCustomerDisplayFlow,
		resetFlowForSplitContinuation,
		state.orderId,
		state.splitMode,
		state.splitDetails,
		totalAmount,
		amountChargedThisTxnNum,
		currentPaymentAmountNum,
		tipForThisPaymentNum,
		viewProcessingState, // Added viewProcessingState
	]);

	// Cancel Payment (remains the same)
	const cancelCardPayment = async () => {
		if (viewProcessingState) return;
		setViewProcessingState(true);
		setError(null);
		// console.log("CREDIT VIEW: Attempting to cancel credit payment flow...");
		try {
			// console.log("CREDIT VIEW: Calling cancelTerminalAction...");
			const cancelResult = await cancelTerminalAction();
			if (cancelResult.success) {
				// console.log("CREDIT VIEW: cancelTerminalAction request sent.");
			} else {
				console.warn(
					"CREDIT VIEW: cancelTerminalAction failed.",
					cancelResult.error
				);
				setError(
					`Cancellation failed: ${
						cancelResult.error || "Could not reach service"
					}. Check terminal.`
				);
			}
			if (flowActive) {
				// console.log("CREDIT VIEW: Resetting customer display flow.");
				completeCustomerDisplayFlow();
			}
			handleNavigation(state.splitMode ? "Split" : "InitialOptions", -1);
			customerDisplayManager.showCart();
		} catch (err) {
			console.error("CREDIT VIEW: Error during cancellation:", err);
			setError("Failed to execute cancellation cleanly.");
		} finally {
			if (isMountedRef.current) {
				setViewProcessingState(false);
				setFlowStarted(false);
				paymentProcessedRef.current = false;
				completionProcessedRef.current = false;
			}
		}
	};

	// --- Render Logic ---
	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 p-4 space-y-3"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper>
				{/* Split payment indicator */}
				{state.splitMode && (
					<motion.div
						className="p-3 bg-amber-50 text-amber-700 rounded-lg mb-3 flex items-center justify-between text-sm shadow-sm"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<span>
							Split Payment: Paying{" "}
							<b>{formatPrice(currentPaymentAmountNum)}</b>
						</span>
						{!flowStarted && !viewProcessingState && (
							<button
								onClick={() => handleNavigation("Split", -1)}
								className="px-2 py-0.5 bg-white text-amber-700 border border-amber-200 rounded-md text-xs hover:bg-amber-50"
							>
								Back
							</button>
						)}
					</motion.div>
				)}

				{/* Error display */}
				{error && (
					<motion.div
						className="p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm shadow-sm border border-red-200"
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" /> {error}
					</motion.div>
				)}

				{/* Amount display */}
				<div className="p-3 bg-blue-50 text-blue-700 rounded-lg shadow-sm border border-blue-100">
					<div className="font-medium text-sm mb-0.5 text-blue-800">
						Amount Due This Payment (Inc. Tax & Surcharge)
					</div>
					<div className="text-xl font-bold text-blue-900">
						{formatPrice(currentPaymentAmountNum)}
					</div>
					{state.splitMode &&
						Math.abs(remainingAmountProp - currentPaymentAmountNum) >
							epsilon && (
							<div className="text-xs mt-0.5 opacity-80 text-blue-600">
								Total Order Remaining (Inc. Tax & Surcharge):{" "}
								{formatPrice(remainingAmountProp)}
							</div>
						)}
				</div>

				{/* Terminal Status Indicator */}
				<TerminalStatusIndicator />

				{/* Control Buttons / Status Display */}
				<div className="mt-4">
					{/* Show Start Button or Waiting Status */}
					{!flowStarted ? (
						<PaymentButton
							icon={CreditCardIcon}
							label={viewProcessingState ? "Starting..." : "Start Card Payment"}
							variant="primary"
							onClick={startCreditPaymentFlow}
							disabled={viewProcessingState || currentPaymentAmountNum <= 0}
							className="w-full py-3 text-lg"
						/>
					) : (
						<div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
							<div className="text-sm font-medium text-slate-600 mb-2">
								Customer Interaction Required
							</div>
							<div className="flex items-center justify-center text-slate-800">
								<div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
								<span>
									{customerFlowStep
										? `Waiting for: ${customerFlowStep
												.replace(/_/g, " ")
												.toUpperCase()}`
										: "Initializing Flow..."}
								</span>
							</div>
							<p className="text-xs text-slate-500 mt-2">
								Guide customer through steps on their display.
							</p>
							<button
								onClick={cancelCardPayment}
								className="mt-4 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
								disabled={viewProcessingState}
							>
								{viewProcessingState
									? "Processing..."
									: "Cancel Payment Process"}
							</button>
						</div>
					)}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = commonPropTypes;
export default CreditPaymentView;
