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
			<ScrollableViewWrapper className="space-y-3 p-3">
				{" "}
				{/* Further reduced space-y */}
				{/* Printer Status */}
				<div className="flex items-center justify-between">
					<Badge
						variant={isPrinterConnected ? "default" : "destructive"}
						className="text-xs px-1.5 py-0.5"
					>
						{" "}
						{/* Adjusted Badge */}
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
						className="my-1"
					>
						<Alert
							variant="destructive"
							className="py-1.5 px-2.5 text-xs"
						>
							{" "}
							{/* Smaller Alert */}
							<XCircle className="h-3.5 w-3.5" /> {/* Smaller Icon */}
							<AlertDescription>{displayError}</AlertDescription>
						</Alert>
					</motion.div>
				)}
				{/* ----- EXTREMELY SMALL "Amount Due This Step" CARD ----- */}
				<Card className="border-blue-100 bg-blue-50/50 shadow-none">
					<CardContent className="p-1.5">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-1">
								<DollarSign className="h-3.5 w-3.5 text-blue-700" />
								<span className="text-xs font-medium text-blue-700">
									Due this step:
								</span>
							</div>
							<span className="text-sm font-bold text-blue-800">
								{formatPrice(currentPaymentAmount)}
							</span>
						</div>
						{state.splitMode &&
							Math.abs(remainingAmountProp - currentPaymentAmount) >
								epsilon && (
								<div className="text-xxs text-blue-600 text-right mt-0.5">
									{" "}
									{/* text-xxs is hypothetical, use text-xs and adjust if needed */}
									(Total Order Remaining: {formatPrice(remainingAmountProp)})
								</div>
							)}
					</CardContent>
				</Card>
				{/* ----- END OF EXTREMELY SMALL CARD ----- */}
				{/* Quick Amounts */}
				<Card>
					<CardHeader className="pb-1.5 pt-2 px-2.5">
						{" "}
						{/* Reduced padding */}
						<CardTitle className="text-xs font-medium text-slate-600">
							Quick Amounts
						</CardTitle>
					</CardHeader>
					<CardContent className="px-2.5 pb-2">
						{" "}
						{/* Reduced padding */}
						<div className="grid grid-cols-3 gap-1.5">
							{" "}
							{/* Reduced gap */}
							<Button
								onClick={() => handlePresetAmount(currentPaymentAmount)}
								disabled={paymentInProgress || currentPaymentAmount < epsilon}
								className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs py-1 px-1.5 h-auto" /* Adjusted */
								variant="outline"
								size="sm"
							>
								{formatPrice(currentPaymentAmount)}
							</Button>
							{[5, 10, 20, 50, 100].map((amount) => (
								<Button
									key={amount}
									onClick={() => handlePresetAmount(amount)}
									disabled={paymentInProgress || currentPaymentAmount < epsilon}
									variant="outline"
									size="sm"
									className="text-xs py-1 px-1.5 h-auto" /* Adjusted */
								>
									${amount}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
				{/* Custom Amount */}
				<Card>
					<CardHeader className="pb-1.5 pt-2 px-2.5">
						{" "}
						{/* Reduced padding */}
						<CardTitle className="text-xs font-medium text-slate-600 flex items-center gap-1">
							{" "}
							{/* Smaller font, gap */}
							<Calculator className="h-3 w-3" /> {/* Smaller Icon */}
							Custom Amount
						</CardTitle>
					</CardHeader>
					<CardContent className="px-2.5 pb-2">
						{" "}
						{/* Reduced padding */}
						<div className="grid grid-cols-2 gap-1.5">
							{" "}
							{/* Reduced gap */}
							<div className="relative">
								<DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />{" "}
								{/* Smaller Icon, adjusted position */}
								<Input
									type="number"
									className="pl-6 text-right text-xs h-8" /* Adjusted */
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
								size="sm"
								className="h-8 text-xs" /* Adjusted */
							>
								{paymentInProgress ? "Processing..." : "Pay"}
							</Button>
						</div>
						{state.customAmount &&
							!isCustomAmountValid() &&
							Number.parseFloat(state.customAmount) >= 0 && (
								<div className="text-xs text-red-500 mt-1">
									{" "}
									{/* Smaller font, margin */}
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
						className="my-1" /* Reduced margin */
					>
						<Card className="border-emerald-100 bg-emerald-50/60">
							<CardContent className="p-2 space-y-1">
								{" "}
								{/* Reduced padding, space */}
								<div className="flex justify-between items-center text-xs">
									<span className="font-medium text-emerald-700">
										Cash Tendered (Last):
									</span>
									<span className="font-semibold text-emerald-800">
										{formatPrice(latestCashDisplay.cashTendered)}
									</span>
								</div>
								<Separator className="bg-emerald-200/70 my-0.5" />{" "}
								{/* Adjusted Separator */}
								<div className="flex justify-between items-center">
									<span className="font-semibold text-sm text-emerald-800">
										{" "}
										{/* Font from base to sm */}
										Change Due (Last):
									</span>
									<span className="font-semibold text-sm text-emerald-800">
										{" "}
										{/* Font from base to sm */}
										{formatPrice(latestCashDisplay.change)}
									</span>
								</div>
								{remainingAmountProp > epsilon && (
									<>
										<Separator className="bg-emerald-200/70 my-0.5" />{" "}
										{/* Adjusted Separator */}
										<div className="flex justify-between items-center text-xxs text-emerald-600">
											{" "}
											{/* Hypothetical text-xxs */}
											<span>Remaining Order Balance:</span>
											<span>{formatPrice(remainingAmountProp)}</span>
										</div>
									</>
								)}
							</CardContent>
						</Card>
					</motion.div>
				)}
				{/* Complete Payment Button */}
				<div className="pt-2">
					{" "}
					{/* Reduced padding-top */}
					<Button
						onClick={handlePaymentCompletionAndPrint}
						disabled={!canCompleteCurrentStep()}
						className="w-full py-2.5 text-sm" /* Adjusted */
						size="lg"
					>
						<CheckCircle className="mr-1 h-4 w-4" />{" "}
						{/* Adjusted Icon, margin */}
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
