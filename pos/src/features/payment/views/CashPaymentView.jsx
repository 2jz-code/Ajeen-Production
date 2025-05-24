"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useReceiptPrinter } from "../../../hooks/useReceiptPrinter";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import { useCartStore } from "../../../store/cartStore";
import { formatPrice } from "../../../utils/numberUtils";
import { XCircle, DollarSign, Calculator, CheckCircle } from "lucide-react";
import { Decimal } from "decimal.js";
import { toast } from "react-toastify";
import { openDrawerWithAgent } from "../../../api/services/localHardwareService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const { pageVariants, pageTransition } = paymentAnimations;

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const CashPaymentView = ({
	state,
	remainingAmount: remainingAmountProp,
	handlePayment,
	setState: setParentState,
	completePaymentFlow,
	handleNavigation,
	totalAmount,
	isPaymentComplete,
}) => {
	const {
		isProcessing: isPrinterProcessing,
		error: printerError,
		isConnected: isPrinterConnected,
	} = useReceiptPrinter();

	const [error, setError] = useState(null);
	const [paymentInProgress, setPaymentInProgress] = useState(false);
	const displayError = printerError || error;
	const [hasBeenMounted, setHasBeenMounted] = useState(false);
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
			"CashPaymentView: currentStepAmount not set in split mode, falling back to overall remaining amount."
		);
		const fallbackRemaining = Math.max(0, remainingAmountProp);
		return Number.parseFloat(fallbackRemaining.toFixed(2));
	}, [state.splitMode, state.currentStepAmount, remainingAmountProp]);

	useEffect(() => {
		isMountedRef.current = true;
		setHasBeenMounted(true);
		return () => {
			isMountedRef.current = false;
			if (hasBeenMounted) {
				try {
					if (typeof customerDisplayManager.showWelcome === "function") {
						const cart = useCartStore.getState().cart;
						if (cart && cart.length > 0) {
							customerDisplayManager.showCart();
						} else {
							customerDisplayManager.showWelcome();
						}
					} else {
						console.warn(
							"customerDisplayManager methods not found on unmount."
						);
					}
				} catch (err) {
					console.error("Error resetting customer display on unmount:", err);
				}
			}
		};
	}, [hasBeenMounted]);

	useEffect(() => {
		if (currentPaymentAmount === undefined) {
			console.warn(
				"Initial currentPaymentAmount not ready, delaying display update slightly."
			);
		}
		const initialCashData = {
			cashTendered: 0,
			change: 0,
			amountPaid: state.amountPaid || 0,
			remainingAmount: currentPaymentAmount,
			isFullyPaid: currentPaymentAmount < epsilon,
			isSplitPayment: state.splitMode,
		};
		const initialOrderData = {
			subtotal: null,
			tax: null,
			total: currentPaymentAmount,
			discountAmount: null,
			isSplitPayment: state.splitMode,
			originalTotal: state.splitMode ? totalAmount : currentPaymentAmount,
		};
		const initialMessageContent = {
			currentStep: "payment",
			paymentMethod: "cash",
			cashData: initialCashData,
			orderData: initialOrderData,
			displayMode: "flow",
			isSplitPayment: state.splitMode,
			splitDetails: state.splitDetails,
			orderId: state.orderId,
		};
		try {
			customerDisplayManager.sendDirectCashUpdateMessage(initialMessageContent);
		} catch (err) {
			console.error("Error sending initial cash state:", err);
		}
	}, []);

	useEffect(() => {
		if (state.splitMode) {
			const amountForThisStep = currentPaymentAmount;
			if (amountForThisStep === undefined || amountForThisStep < 0) {
				console.error(
					"Cannot start customer flow, invalid amount for step:",
					amountForThisStep
				);
				return;
			}
			const cashDataForFlow = {
				cashTendered: 0,
				change: 0,
				amountPaid: state.amountPaid || 0,
				remainingAmount: amountForThisStep,
				isFullyPaid: amountForThisStep < epsilon,
				isSplitPayment: true,
			};
			const orderDataForFlow = {
				total: amountForThisStep,
				isSplitPayment: true,
				originalTotal: totalAmount,
			};
			customerDisplayManager.startCustomerFlow({
				orderId: state.orderId,
				initialStep: "payment",
				paymentMethod: "cash",
				amountDue: amountForThisStep,
				isSplitPayment: true,
				splitDetails: state.splitDetails,
				payload: {
					cashData: cashDataForFlow,
					orderData: orderDataForFlow,
				},
			});
		}
	}, [
		state.splitMode,
		state.orderId,
		state.splitDetails,
		state.amountPaid,
		currentPaymentAmount,
		totalAmount,
	]);

	const getLatestTransaction = useCallback(() => {
		if (!state.transactions || state.transactions.length === 0) return null;
		return state.transactions[state.transactions.length - 1];
	}, [state.transactions]);

	const getLatestCashDetails = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		return {
			cashTendered:
				latestTransaction?.method === "cash"
					? latestTransaction?.cashTendered || 0
					: 0,
			change:
				latestTransaction?.method === "cash"
					? latestTransaction?.change || 0
					: 0,
		};
	}, [getLatestTransaction]);

	const shouldShowChangeCalculation = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		return (
			latestTransaction &&
			latestTransaction.method === "cash" &&
			typeof latestTransaction.cashTendered === "number" &&
			latestTransaction.cashTendered > 0
		);
	}, [getLatestTransaction]);

	const handlePresetAmount = async (amountTendered) => {
		setError(null);
		setPaymentInProgress(true);
		const requiredAmount = currentPaymentAmount;
		try {
			const amountToApply = Math.min(amountTendered, requiredAmount);
			const changeDue = Math.max(
				0,
				new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
			);
			const paymentResult = await handlePayment(amountToApply, {
				method: "cash",
				cashTendered: amountTendered,
				change: changeDue,
			});
			if (!paymentResult || !paymentResult.success) {
				throw new Error(paymentResult?.error || "Payment processing failed");
			}
			const updatedAmountPaidOverall = paymentResult.newAmountPaid;
			const stepRemainingAfterPayment = Math.max(
				0,
				new Decimal(requiredAmount).minus(amountToApply).toNumber()
			);
			const cashDataForDisplay = {
				cashTendered: amountTendered,
				change: changeDue,
				amountPaid: updatedAmountPaidOverall,
				remainingAmount:
					stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isFullyPaid: paymentResult.isNowComplete,
				isSplitPayment: state.splitMode,
			};
			const orderDataForDisplay = {
				total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isSplitPayment: state.splitMode,
				originalTotal: state.splitMode ? totalAmount : requiredAmount,
			};
			const messageContent = {
				currentStep: "payment",
				paymentMethod: "cash",
				displayMode: "flow",
				cashData: cashDataForDisplay,
				orderData: orderDataForDisplay,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId: state.orderId,
			};
			customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
		} catch (err) {
			setError(err.message || "Failed to process preset amount");
			console.error("Preset amount payment error:", err);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	const handleCustomAmount = async () => {
		const amountTendered = Number.parseFloat(state.customAmount);
		const requiredAmount = currentPaymentAmount;
		if (!amountTendered || isNaN(amountTendered) || amountTendered <= 0) {
			setError("Please enter a valid positive amount");
			return;
		}
		if (
			new Decimal(amountTendered).lessThan(
				new Decimal(requiredAmount).minus(epsilon)
			)
		) {
			setError(`Amount must be at least ${formatPrice(requiredAmount)}`);
			return;
		}
		setError(null);
		setPaymentInProgress(true);
		try {
			const amountToApply = Math.min(amountTendered, requiredAmount);
			const changeDue = Math.max(
				0,
				new Decimal(amountTendered).minus(new Decimal(amountToApply)).toNumber()
			);
			const paymentResult = await handlePayment(amountToApply, {
				method: "cash",
				cashTendered: amountTendered,
				change: changeDue,
			});
			if (!paymentResult || !paymentResult.success) {
				throw new Error(paymentResult?.error || "Payment processing failed");
			}
			if (setParentState)
				setParentState((prev) => ({ ...prev, customAmount: "" }));
			const updatedAmountPaidOverall = paymentResult.newAmountPaid;
			const stepRemainingAfterPayment = Math.max(
				0,
				new Decimal(requiredAmount).minus(amountToApply).toNumber()
			);
			const cashDataForDisplay = {
				cashTendered: amountTendered,
				change: changeDue,
				amountPaid: updatedAmountPaidOverall,
				remainingAmount:
					stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isFullyPaid: paymentResult.isNowComplete,
				isSplitPayment: state.splitMode,
			};
			const orderDataForDisplay = {
				total: stepRemainingAfterPayment < epsilon ? 0 : requiredAmount,
				isSplitPayment: state.splitMode,
				originalTotal: state.splitMode ? totalAmount : requiredAmount,
			};
			const messageContent = {
				currentStep: "payment",
				paymentMethod: "cash",
				displayMode: "flow",
				cashData: cashDataForDisplay,
				orderData: orderDataForDisplay,
				isSplitPayment: state.splitMode,
				splitDetails: state.splitDetails,
				orderId: state.orderId,
			};
			customerDisplayManager.sendDirectCashUpdateMessage(messageContent);
		} catch (err) {
			setError(err.message || "Failed to process custom amount");
			console.error("Custom amount payment error:", err);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	const canCompleteCurrentStep = useCallback(() => {
		const latestTransaction = getLatestTransaction();
		const hasValidTenderInfo =
			latestTransaction?.method === "cash" &&
			typeof latestTransaction.cashTendered === "number";
		if (!hasValidTenderInfo) return false;
		const requiredAmountForThisStep = currentPaymentAmount;
		const tenderedInLastTx = latestTransaction.cashTendered;
		const tenderedMetRequirement = new Decimal(
			tenderedInLastTx
		).greaterThanOrEqualTo(
			new Decimal(requiredAmountForThisStep).minus(epsilon)
		);
		return tenderedMetRequirement && !isPrinterProcessing && !paymentInProgress;
	}, [
		state.transactions,
		currentPaymentAmount,
		isPrinterProcessing,
		paymentInProgress,
		epsilon,
		getLatestTransaction,
	]);

	const handlePaymentCompletionAndPrint = async () => {
		setError(null);
		if (!canCompleteCurrentStep()) {
			console.warn(
				"CashPaymentView: Complete button clicked but canCompleteCurrentStep is false."
			);
			setError(
				"Button should be disabled. Please ensure payment step is fully processed."
			);
			return;
		}
		setPaymentInProgress(true);

		try {
			const currentTransactions = state.transactions || [];
			const recalculatedAmountPaidOverall = currentTransactions.reduce(
				(sum, tx) => {
					const basePaid =
						typeof tx.baseAmountPaid === "number" && !isNaN(tx.baseAmountPaid)
							? tx.baseAmountPaid
							: 0;
					return new Decimal(sum).plus(new Decimal(basePaid)).toNumber();
				},
				0
			);

			if (typeof isPaymentComplete !== "function") {
				console.error(
					"CashPaymentView Error: isPaymentComplete prop is not a function!",
					isPaymentComplete
				);
				setError("Internal error: Payment completion check unavailable.");
				setPaymentInProgress(false);
				return;
			}
			const isOrderFullyPaid = isPaymentComplete(recalculatedAmountPaidOverall);

			if (state.splitMode && !isOrderFullyPaid) {
				customerDisplayManager.showCart();
				setTimeout(() => {
					if (isMountedRef.current) handleNavigation("Split", -1);
				}, 50);
			} else if (isOrderFullyPaid) {
				try {
					await openDrawerWithAgent();
				} catch (drawerError) {
					console.error(
						"CashPaymentView: Error opening cash drawer:",
						drawerError
					);
					toast.error(
						drawerError.message ||
							"Failed to open cash drawer. Please check agent."
					);
				}

				const completedOrderData = await completePaymentFlow(
					currentTransactions
				);

				if (completedOrderData) {
					const receiptPayload = completedOrderData.receipt_payload || null;
					handleNavigation("Completion", 1, { receiptPayload });
				} else {
					setError(
						"Failed to finalize order with backend. Please review and try again or contact support."
					);
				}
			} else {
				console.warn(
					"CashPaymentView (Warn): Complete button pressed but order not fully paid (checked with hook's logic) and not intermediate split.",
					{
						recalculatedAmountPaid: recalculatedAmountPaidOverall,
						totalOrderAmountPropForView: totalAmount,
						stateAmountPaidFromHook: state.amountPaid,
					}
				);
				setError(
					"Cannot complete: Payment (base amount) is not sufficient for the order's base amount."
				);
			}
		} catch (err) {
			console.error(
				"CashPaymentView: Error during payment completion/continuation:",
				err
			);
			setError(err.message || "Failed processing completion/continuation");
			toast.error(`Error: ${err.message || "Completion failed"}`);
		} finally {
			if (isMountedRef.current) setPaymentInProgress(false);
		}
	};

	const isCustomAmountValid = () => {
		const amount = Number.parseFloat(state.customAmount);
		return (
			!isNaN(amount) &&
			amount > 0 &&
			new Decimal(amount).greaterThanOrEqualTo(
				new Decimal(currentPaymentAmount).minus(epsilon)
			)
		);
	};

	const latestCashDisplay = getLatestCashDetails();

	return (
		<motion.div
			key="cash-payment-ui"
			className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100"
			custom={state.direction}
			{...commonMotionProps}
		>
			<ScrollableViewWrapper className="space-y-6 p-6">
				{/* Printer Status */}
				<div className="flex items-center justify-between">
					<Badge variant={isPrinterConnected ? "default" : "destructive"}>
						Printer:{" "}
						{isPrinterConnected
							? isPrinterProcessing
								? "Busy..."
								: "Connected"
							: "Disconnected"}
					</Badge>
				</div>

				{/* Error Display */}
				{displayError && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
					>
						<Alert variant="destructive">
							<XCircle className="h-4 w-4" />
							<AlertDescription>{displayError}</AlertDescription>
						</Alert>
					</motion.div>
				)}

				{/* Amount Due Card */}
				<Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
					<CardHeader className="pb-3">
						<CardTitle className="text-blue-800 flex items-center gap-2">
							<DollarSign className="h-5 w-5" />
							Amount Due This Step
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-blue-900 mb-2">
							{formatPrice(currentPaymentAmount)}
						</div>
						{state.splitMode &&
							Math.abs(remainingAmountProp - currentPaymentAmount) >
								epsilon && (
								<div className="text-sm text-blue-600">
									Total Order Remaining: {formatPrice(remainingAmountProp)}
								</div>
							)}
					</CardContent>
				</Card>

				{/* Quick Amounts */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-slate-600">
							Quick Amounts
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-3">
							<Button
								onClick={() => handlePresetAmount(currentPaymentAmount)}
								disabled={paymentInProgress || currentPaymentAmount < epsilon}
								className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
								variant="outline"
							>
								{formatPrice(currentPaymentAmount)}
							</Button>
							{[5, 10, 20, 50, 100].map((amount) => (
								<Button
									key={amount}
									onClick={() => handlePresetAmount(amount)}
									disabled={paymentInProgress || currentPaymentAmount < epsilon}
									variant="outline"
								>
									${amount}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Custom Amount */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
							<Calculator className="h-4 w-4" />
							Custom Amount
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3">
							<div className="relative">
								<DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
								<Input
									type="number"
									className="pl-10 text-right"
									placeholder="Enter amount"
									min={
										currentPaymentAmount > epsilon
											? currentPaymentAmount.toFixed(2)
											: "0.01"
									}
									step="0.01"
									value={state.customAmount}
									onChange={(e) =>
										setParentState((prev) => ({
											...prev,
											customAmount: e.target.value,
										}))
									}
									disabled={paymentInProgress || currentPaymentAmount < epsilon}
									onKeyPress={(e) => {
										if (
											e.key === "Enter" &&
											!paymentInProgress &&
											isCustomAmountValid()
										) {
											handleCustomAmount();
										}
									}}
								/>
							</div>
							<Button
								onClick={handleCustomAmount}
								disabled={
									paymentInProgress ||
									!state.customAmount ||
									!isCustomAmountValid() ||
									currentPaymentAmount < epsilon
								}
							>
								{paymentInProgress ? "Processing..." : "Pay"}
							</Button>
						</div>
						{state.customAmount &&
							!isCustomAmountValid() &&
							Number.parseFloat(state.customAmount) >= 0 && (
								<div className="text-sm text-red-500 mt-2">
									Amount must be at least {formatPrice(currentPaymentAmount)}
								</div>
							)}
					</CardContent>
				</Card>

				{/* Change Calculation */}
				{shouldShowChangeCalculation() && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
							<CardContent className="pt-6">
								<div className="space-y-3">
									<div className="flex justify-between items-center text-sm">
										<span className="font-medium text-emerald-800">
											Cash Tendered (Last):
										</span>
										<span className="font-semibold text-emerald-900">
											{formatPrice(latestCashDisplay.cashTendered)}
										</span>
									</div>
									<Separator className="bg-emerald-200" />
									<div className="flex justify-between items-center">
										<span className="font-bold text-lg text-emerald-900">
											Change Due (Last):
										</span>
										<span className="font-bold text-lg text-emerald-900">
											{formatPrice(latestCashDisplay.change)}
										</span>
									</div>
									{remainingAmountProp > epsilon && (
										<>
											<Separator className="bg-emerald-200" />
											<div className="flex justify-between items-center text-sm text-emerald-700">
												<span>Remaining Order Balance:</span>
												<span>{formatPrice(remainingAmountProp)}</span>
											</div>
										</>
									)}
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}

				{/* Complete Payment Button */}
				<div className="pt-4">
					<Button
						onClick={handlePaymentCompletionAndPrint}
						disabled={!canCompleteCurrentStep()}
						className="w-full py-6 text-lg"
						size="lg"
					>
						<CheckCircle className="mr-2 h-5 w-5" />
						{state.splitMode && !isPaymentComplete(state.amountPaid)
							? "Continue Split"
							: "Complete Payment"}
					</Button>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CashPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		transactions: PropTypes.array.isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
		nextSplitAmount: PropTypes.number,
		currentStepAmount: PropTypes.number,
		currentSplitMethod: PropTypes.string,
		totalTipAmount: PropTypes.number,
		totalSurchargeAmount: PropTypes.number,
		totalTaxAmount: PropTypes.number,
		surchargePercentageForCurrentStep: PropTypes.number,
		currentBaseForTipCalc: PropTypes.number,
		completionResultData: PropTypes.object,
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired,
	totalAmount: PropTypes.number.isRequired,
	handlePayment: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	completePaymentFlow: PropTypes.func.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	isPaymentComplete: PropTypes.func.isRequired,
};

export default CashPaymentView;
