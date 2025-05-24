"use client";

import { motion } from "framer-motion";
import { CreditCard, XCircle, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const { pageVariants, pageTransition } = paymentAnimations;

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
			return Number.parseFloat(state.currentStepAmount.toFixed(2));
		}
		if (!state.splitMode) {
			const overallRemaining = Math.max(0, remainingAmountProp);
			return Number.parseFloat(overallRemaining.toFixed(2));
		}
		console.warn(
			"CreditPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
		);
		const fallbackRemaining = Math.max(0, remainingAmountProp);
		return Number.parseFloat(fallbackRemaining.toFixed(2));
	}, [state.splitMode, state.currentStepAmount, remainingAmountProp]);

	const baseForTipCalculation = useMemo(() => {
		return Number.parseFloat(
			(state.currentBaseForTipCalc || currentPaymentAmount || 0).toFixed(2)
		);
	}, [state.currentBaseForTipCalc, currentPaymentAmount]);

	const tipForThisPayment = stepData?.tip?.tipAmount || 0;
	const amountChargedThisTxnNum = Number.parseFloat(
		new Decimal(baseForTipCalculation)
			.plus(new Decimal(tipForThisPayment))
			.toFixed(2)
	);
	const currentPaymentAmountNum = Number.parseFloat(
		new Decimal(currentPaymentAmount).toFixed(2)
	);
	const tipForThisPaymentNum = Number.parseFloat(
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
					total: currentPaymentAmountNum,
					isSplitPayment: state.splitMode,
					originalTotal: totalAmount,
					baseForTipCalculation: baseForTipCalculation,
				},
			};
			const startFlowArgs = {
				orderId: orderId,
				initialStep: "tip",
				paymentMethod: "credit",
				amountDue: currentPaymentAmountNum,
				baseForTipCalculation: baseForTipCalculation,
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
		baseForTipCalculation,
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
				amount: amountChargedThisTxnNum,
				timestamp: paymentInfo.timestamp || new Date().toISOString(),
				cardInfo: paymentInfo.cardInfo || { brand: "Card", last4: "****" },
				reader: paymentInfo.reader || null,
				splitPayment: state.splitMode,
				splitAmount: state.splitMode ? currentPaymentAmountNum : null,
				originalTotal: totalAmount,
				orderId: state.orderId,
				tipAmount: tipForThisPaymentNum,
			};
			const transactionDetails = {
				method: "credit",
				cardInfo: paymentInfo.cardInfo,
				transactionId: paymentInfo.transactionId,
				flowData: { ...stepData, payment: nestedPaymentObject },
				tipAmount: tipForThisPaymentNum,
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
							.toNumber();
						const amountPaidSoFarPreTaxPreSurcharge =
							paymentResult.newAmountPaid;
						const remainingAfterThisSplitPreTaxPreSurcharge = Math.max(
							0,
							orderTotalPreTaxPreSurcharge - amountPaidSoFarPreTaxPreSurcharge
						);

						resetFlowForSplitContinuation({
							amountPaid: amountPaidSoFarPreTaxPreSurcharge,
							remainingAmount: remainingAfterThisSplitPreTaxPreSurcharge,
							currentPaymentAmount: amountChargedThisTxnNum,
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
		viewProcessingState,
	]);

	const cancelCardPayment = async () => {
		if (viewProcessingState) return;
		setViewProcessingState(true);
		setError(null);
		try {
			const cancelResult = await cancelTerminalAction();
			if (cancelResult.success) {
				// Success
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

	return (
		<motion.div
			key="credit-payment"
			className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper className="space-y-3 p-3">
				{" "}
				{/* Further reduced space-y */}
				{/* Split payment indicator */}
				{state.splitMode && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="mb-1.5" // Adjusted margin-bottom
					>
						<Card className="border-amber-100 bg-amber-50/60 shadow-none">
							<CardContent className="p-1.5 px-2">
								{" "}
								{/* Reduced padding */}
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1">
										{" "}
										{/* Reduced gap */}
										<Badge
											variant="secondary"
											className="text-xxs px-1 py-0.5 bg-amber-100 text-amber-700"
										>
											Split
										</Badge>{" "}
										{/* Smaller Badge, text-xxs hypothetical */}
										<span className="text-amber-700 text-xs">
											{" "}
											{/* Smaller font */}
											Paying{" "}
											<strong>{formatPrice(currentPaymentAmountNum)}</strong>
										</span>
									</div>
									{!flowStarted && !viewProcessingState && (
										<Button
											variant="ghost" // Changed to ghost for less emphasis
											size="xs"
											onClick={() => handleNavigation("Split", -1)}
											className="h-6 px-1.5 py-0.5 text-xxs text-amber-700 hover:bg-amber-100" // Custom small button
										>
											Edit Split
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}
				{/* Error display */}
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						className="my-1"
					>
						<Alert
							variant="destructive"
							className="py-1.5 px-2.5 text-xs"
						>
							{" "}
							{/* Smaller Alert */}
							<XCircle className="h-3.5 w-3.5" /> {/* Smaller Icon */}
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					</motion.div>
				)}
				{/* ----- EXTREMELY SMALL "Amount Due This Payment" CARD ----- */}
				<Card className="border-blue-100 bg-blue-50/50 shadow-none">
					<CardContent className="p-1.5">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-1">
								<CreditCard className="h-3.5 w-3.5 text-blue-700" />
								<span className="text-xs font-medium text-blue-700">
									Due this payment:
								</span>
							</div>
							<span className="text-sm font-bold text-blue-800">
								{formatPrice(currentPaymentAmountNum)}
							</span>
						</div>
						<div className="text-xxs text-blue-600 text-right mt-0.5">
							{" "}
							{/* text-xxs is hypothetical */}
							(Inc. Tax & Surcharge)
						</div>
						{state.splitMode &&
							Math.abs(remainingAmountProp - currentPaymentAmountNum) >
								epsilon && (
								<div className="text-xxs text-blue-600 text-right mt-0.5">
									(Total Order Remaining: {formatPrice(remainingAmountProp)})
								</div>
							)}
					</CardContent>
				</Card>
				{/* ----- END OF EXTREMELY SMALL CARD ----- */}
				{/* Terminal Status Indicator */}
				<div className="my-1.5">
					{" "}
					{/* Added wrapper for margin control */}
					<TerminalStatusIndicator />
				</div>
				{/* Control Buttons / Status Display */}
				<div className="space-y-2.5">
					{" "}
					{/* Reduced space */}
					{!flowStarted ? (
						<Button
							onClick={startCreditPaymentFlow}
							disabled={viewProcessingState || currentPaymentAmountNum <= 0}
							className="w-full py-2.5 text-sm" /* Adjusted */
							size="lg"
						>
							<CreditCard className="mr-1 h-4 w-4" />{" "}
							{/* Adjusted Icon, margin */}
							{viewProcessingState ? "Starting..." : "Start Card Payment"}
						</Button>
					) : (
						<Card className="bg-slate-50/70">
							<CardContent className="p-2.5 text-center">
								{" "}
								{/* Reduced padding */}
								<div className="space-y-1.5">
									{" "}
									{/* Reduced space */}
									<div className="flex items-center justify-center gap-1">
										{" "}
										{/* Reduced gap */}
										<AlertCircle className="h-3.5 w-3.5 text-blue-600" />{" "}
										{/* Smaller Icon */}
										<span className="font-medium text-slate-700 text-xs">
											{" "}
											{/* Smaller font */}
											Customer Interaction Required
										</span>
									</div>
									<div className="flex items-center justify-center text-slate-700 text-xxs">
										{" "}
										{/* Smaller font, text-xxs hypothetical */}
										<div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></div>{" "}
										{/* Smaller dot */}
										<span>
											{customerFlowStep
												? `Waiting for: ${customerFlowStep
														.replace(/_/g, " ")
														.toUpperCase()}`
												: "Initializing Flow..."}
										</span>
									</div>
									<p className="text-xxs text-slate-500 leading-tight">
										{" "}
										{/* Smaller font, tighter leading - text-xxs hypothetical */}
										Guide customer through steps on their display.
									</p>
									<Button
										variant="destructive"
										onClick={cancelCardPayment}
										disabled={viewProcessingState}
										size="sm"
										className="h-7 px-2.5 py-1 text-xs" /* Adjusted */
									>
										{viewProcessingState
											? "Processing..."
											: "Cancel Payment Process"}
									</Button>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CreditPaymentView.propTypes = {
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
		currentBaseForTipCalc: PropTypes.number,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired,
};

export default CreditPaymentView;
