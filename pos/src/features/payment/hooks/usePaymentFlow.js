// src/features/payment/hooks/usePaymentFlow.js
import { useState, useCallback, useEffect, useRef } from "react";
import { useCartStore } from "../../../store/cartStore";
import { Decimal } from "decimal.js";
import customerDisplayManager from "../../customerDisplay/utils/windowManager";
import { toast } from "react-toastify";
import { calculateCartTotals as getBaseCartTotals } from "../../cart/utils/cartCalculations";

const CARD_SURCHARGE_PERCENTAGE = 0.03;
const TAX_RATE = 0.1;

const calculateDisplayTotalsForUI = (
	initialOrderTotalNoTaxNoSurcharge, // (Cart Subtotal - Cart Discount)
	totalBaseAmountPaidToOrder, // Accumulated state.amountPaid (base paid)
	totalAccumulatedSurchargeFromTransactions,
	totalAccumulatedTaxFromTransactions,
	totalAccumulatedTip,
	currentSelectedPaymentMethod, // For previewing surcharge on remaining
	remainingBaseForFullOrderPaymentPreview // Remaining (Subtotal-Discount) base
) => {
	// console.log("[PaymentFlowHook] calculateDisplayTotalsForUI INPUTS:", {
	//     initialOrderTotalNoTaxNoSurcharge, totalBaseAmountPaidToOrder,
	//     totalAccumulatedSurchargeFromTransactions, totalAccumulatedTaxFromTransactions, totalAccumulatedTip,
	//     currentSelectedPaymentMethod, remainingBaseForFullOrderPaymentPreview
	// });

	const orderSubtotalPostDiscount_PreTax =
		parseFloat(initialOrderTotalNoTaxNoSurcharge) || 0;
	const paidToBaseOrderPortion = parseFloat(totalBaseAmountPaidToOrder) || 0;
	const accumulatedSurchargeFromTx =
		parseFloat(totalAccumulatedSurchargeFromTransactions) || 0;
	const accumulatedTaxFromTx =
		parseFloat(totalAccumulatedTaxFromTransactions) || 0;
	const tipPaid = parseFloat(totalAccumulatedTip) || 0;

	const cartStore = useCartStore.getState();
	const cartForTotals = cartStore.cart || [];
	const discountForTotals = cartStore.orderDiscount || null;
	const {
		subtotal: fullCartSubtotalDisplay,
		discountAmount: cartDiscountValDisplay,
	} = getBaseCartTotals(cartForTotals, discountForTotals);

	// Surcharge to display: already paid surcharge + potential surcharge on the remaining base if credit is selected
	let surchargeOnRemainingPreview = new Decimal(0);
	if (
		currentSelectedPaymentMethod === "credit" &&
		remainingBaseForFullOrderPaymentPreview > 0
	) {
		surchargeOnRemainingPreview = new Decimal(
			remainingBaseForFullOrderPaymentPreview
		).mul(CARD_SURCHARGE_PERCENTAGE);
	}
	const displaySurchargeToShow = new Decimal(accumulatedSurchargeFromTx)
		.plus(surchargeOnRemainingPreview)
		.toNumber();

	// Tax to display: already paid tax + potential tax on (remaining base + potential surcharge on remaining base)
	let taxOnRemainingAndSurchargePreview = new Decimal(0);
	if (remainingBaseForFullOrderPaymentPreview > 0) {
		const remainingTaxableBase = new Decimal(
			remainingBaseForFullOrderPaymentPreview
		).plus(surchargeOnRemainingPreview);
		taxOnRemainingAndSurchargePreview = remainingTaxableBase.mul(TAX_RATE);
	}
	const displayTaxToShow = new Decimal(accumulatedTaxFromTx)
		.plus(taxOnRemainingAndSurchargePreview)
		.toNumber();

	// Grand total for UI display: (Order Subtotal - Discount) + Total Display Surcharge + Total Display Tax + Total Tip Paid
	const displayGrandTotal = new Decimal(orderSubtotalPostDiscount_PreTax)
		.plus(new Decimal(displaySurchargeToShow))
		.plus(new Decimal(displayTaxToShow))
		.plus(new Decimal(tipPaid))
		.toNumber();

	// Remaining: Grand Total - (Base Paid + Surcharge Paid + Tax Paid + Tip Paid)
	const totalAmountAccountedForByTransactions = new Decimal(
		paidToBaseOrderPortion
	)
		.plus(new Decimal(accumulatedSurchargeFromTx))
		.plus(new Decimal(accumulatedTaxFromTx))
		.plus(new Decimal(tipPaid));

	const displayRemainingOverall = new Decimal(displayGrandTotal)
		.minus(totalAmountAccountedForByTransactions)
		.toNumber();

	const result = {
		displayCartSubtotal: fullCartSubtotalDisplay || 0,
		displayCartDiscountAmount: cartDiscountValDisplay || 0,
		displaySurchargeAmount: displaySurchargeToShow || 0,
		displayTaxAmount: displayTaxToShow || 0,
		displayTipAmount: tipPaid || 0,
		displayGrandTotal: displayGrandTotal || 0,
		displayAmountPaidToBaseOrder: paidToBaseOrderPortion || 0, // This is correct for "Amount Paid (towards order base)"
		displayRemainingOverall: Math.max(0, displayRemainingOverall || 0),
	};
	// console.log("[PaymentFlowHook] calculateDisplayTotalsForUI OUTPUT:", result);
	return result;
};

export const usePaymentFlow = ({ totalAmount, onComplete, onNewOrder }) => {
	// totalAmount prop is ( (Cart Subtotal - Discount) * (1 + TAX_RATE) ), pre-surcharge, pre-tip.
	// console.log("[PaymentFlowHook] Hook initialized. totalAmount prop (tax-inclusive, pre-surcharge):", totalAmount);

	const initialCartDiscountStore = useCartStore.getState().orderDiscount;
	const initialCartItemsStore = useCartStore.getState().cart || [];
	const { discountAmount: initialActualDiscountAmountFromStore } =
		getBaseCartTotals(initialCartItemsStore, initialCartDiscountStore);

	const [state, setState] = useState({
		orderId: useCartStore.getState().orderId,
		currentView: "InitialOptions",
		previousViews: [],
		paymentMethod: null,
		splitMode: false,
		amountPaid: 0, // Accumulates BASE amount paid towards (Subtotal - Discount)
		transactions: [],
		customAmount: "",
		direction: 1,
		splitDetails: null,
		nextSplitAmount: null,
		currentStepAmount: null,
		currentBaseForTipCalc: null,
		currentSplitMethod: null,
		totalTipAmount: 0,
		totalSurchargeAmount: 0, // Accumulated from COMPLETED transactions
		totalTaxAmount: 0, // Accumulated from COMPLETED transactions
		surchargePercentageForCurrentStep: 0,
		discountId: initialCartDiscountStore?.id,
		discountAmount: initialActualDiscountAmountFromStore || 0,
		completionResultData: null,
	});

	const [error, setError] = useState(null);
	const [isCompleting, setIsCompleting] = useState(false);
	const epsilon = 0.01;
	const isMountedRef = useRef(false);

	useEffect(() => {
		isMountedRef.current = true;
		const cartDiscountObj = useCartStore.getState().orderDiscount;
		const cartItemsList = useCartStore.getState().cart || [];
		const { discountAmount: currentActualDiscountAmount } = getBaseCartTotals(
			cartItemsList,
			cartDiscountObj
		);

		setState({
			orderId: useCartStore.getState().orderId,
			currentView: "InitialOptions",
			previousViews: [],
			paymentMethod: null,
			splitMode: false,
			amountPaid: 0,
			transactions: [],
			customAmount: "",
			direction: 1,
			splitDetails: null,
			nextSplitAmount: null,
			currentStepAmount: null,
			currentBaseForTipCalc: null,
			currentSplitMethod: null,
			totalTipAmount: 0,
			totalSurchargeAmount: 0,
			totalTaxAmount: 0,
			surchargePercentageForCurrentStep: 0,
			discountId: cartDiscountObj?.id,
			discountAmount: currentActualDiscountAmount || 0,
			completionResultData: null,
		});
		setError(null);
		setIsCompleting(false);
		return () => {
			isMountedRef.current = false;
		};
	}, [totalAmount]);

	const isPaymentCompleteInternal = useCallback(
		(paidBaseAmountPreTaxPreSurcharge) => {
			// totalAmount prop is ( (Subtotal - Discount) * (1 + TAX_RATE) )
			const orderBasePreTaxPreSurcharge = new Decimal(totalAmount || 0).div(
				new Decimal(1).plus(TAX_RATE)
			);
			return new Decimal(
				paidBaseAmountPreTaxPreSurcharge || 0
			).greaterThanOrEqualTo(orderBasePreTaxPreSurcharge.minus(epsilon));
		},
		[totalAmount, epsilon]
	);

	const resetSplitState = useCallback(() => {
		setState((prev) => ({
			...prev,
			nextSplitAmount: null,
			currentSplitMethod: null,
		}));
	}, []);

	const handleNavigation = useCallback(
		(nextView, direction = 1, options = {}) => {
			const currentTotalAmountWithTaxProp = totalAmount || 0;
			const currentAmountPaidToOrderBasePreTax = state.amountPaid || 0;
			const isFullyPaid = isPaymentCompleteInternal(
				currentAmountPaidToOrderBasePreTax
			);
			const currentView = state.currentView;

			if (
				state.splitMode &&
				isFullyPaid &&
				direction < 0 &&
				(currentView === "Cash" || currentView === "Credit") &&
				nextView !== "Completion"
			) {
				setState((prev) => ({
					...prev,
					currentView: "Completion",
					previousViews: [...prev.previousViews, prev.currentView],
					direction: 1,
					currentStepAmount: null,
					nextSplitAmount: null,
					currentBaseForTipCalc: null,
					completionResultData:
						options.receiptPayload ?? prev.completionResultData,
				}));
				return;
			}

			setState((prev) => {
				let newPaymentMethod = prev.paymentMethod;
				let newSplitMode = prev.splitMode;
				let newNextSplitAmount = prev.nextSplitAmount;
				let newCurrentStepAmount = null;
				let newCurrentBaseForTipCalc = null;
				let newSplitDetails = prev.splitDetails;
				let newReceiptPayload = prev.completionResultData;
				let newStepSurchargePercentage = 0;

				if (direction > 0) {
					let baseAmountForThisStep_PreTaxPreSurcharge;
					const orderBasePreTaxPreSurchargeTotal = new Decimal(
						currentTotalAmountWithTaxProp
					).div(new Decimal(1).plus(TAX_RATE));

					if (options.nextSplitAmount !== undefined) {
						baseAmountForThisStep_PreTaxPreSurcharge =
							parseFloat(options.nextSplitAmount) || 0;
					} else if (!prev.splitMode) {
						baseAmountForThisStep_PreTaxPreSurcharge = Math.max(
							0,
							orderBasePreTaxPreSurchargeTotal
								.minus(prev.amountPaid || 0)
								.toNumber()
						);
					} else {
						baseAmountForThisStep_PreTaxPreSurcharge = 0;
						if (nextView === "Cash" || nextView === "Credit")
							console.warn(
								"Split mode nav to payment without nextSplitAmount."
							);
					}

					let surchargeOnThisStep = new Decimal(0);
					if (nextView === "Credit") {
						newPaymentMethod = "credit";
						newStepSurchargePercentage = CARD_SURCHARGE_PERCENTAGE;
						surchargeOnThisStep = new Decimal(
							baseAmountForThisStep_PreTaxPreSurcharge
						).mul(newStepSurchargePercentage);
					} else if (nextView === "Cash") {
						newPaymentMethod = "cash";
						newStepSurchargePercentage = 0;
					} else {
						newPaymentMethod = null;
						newStepSurchargePercentage = 0;
					}

					const amountWithSurchargeForStep = new Decimal(
						baseAmountForThisStep_PreTaxPreSurcharge
					).plus(surchargeOnThisStep);
					const taxOnThisStep = amountWithSurchargeForStep.mul(TAX_RATE);
					const amountWithSurchargeAndTaxForStep =
						amountWithSurchargeForStep.plus(taxOnThisStep);

					newCurrentStepAmount = parseFloat(
						amountWithSurchargeAndTaxForStep.toFixed(2)
					);
					newCurrentBaseForTipCalc = newCurrentStepAmount;

					if (nextView !== "Cash" && nextView !== "Credit") {
						newCurrentStepAmount = null;
						newCurrentBaseForTipCalc = null;
					}
					newNextSplitAmount = null;

					if (nextView === "Split") {
						newSplitMode = true;
						if (!prev.splitDetails) {
							const initialRemainingForSplit = orderBasePreTaxPreSurchargeTotal
								.minus(prev.amountPaid || 0)
								.toNumber();
							newSplitDetails = {
								mode: "remaining",
								currentSplitIndex: 0,
								initialRemainingAmountForSplit: Math.max(
									0,
									initialRemainingForSplit
								),
							};
						}
					}
					if (
						newSplitMode &&
						(nextView === "Cash" || nextView === "Credit") &&
						newSplitDetails
					) {
						newSplitDetails = {
							...newSplitDetails,
							currentPaymentMethodForSplitStep: newPaymentMethod,
						};
					}

					if (nextView === "Completion")
						newReceiptPayload = options.receiptPayload ?? null;
					else newReceiptPayload = null;

					if (
						prev.currentView === "Split" &&
						isPaymentCompleteInternal(prev.amountPaid || 0) &&
						nextView !== "Completion"
					) {
						return {
							...prev,
							currentView: "Completion",
							previousViews: [...prev.previousViews, prev.currentView],
							direction: 1,
							nextSplitAmount: null,
							currentStepAmount: null,
							currentBaseForTipCalc: null,
							completionResultData:
								options.receiptPayload ?? prev.completionResultData,
						};
					}
					return {
						...prev,
						currentView: nextView,
						previousViews: [...prev.previousViews, prev.currentView],
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
						nextSplitAmount: newNextSplitAmount,
						currentStepAmount: newCurrentStepAmount,
						currentBaseForTipCalc: newCurrentBaseForTipCalc,
						surchargePercentageForCurrentStep: newStepSurchargePercentage,
						completionResultData: newReceiptPayload,
					};
				} else {
					// Backward navigation
					const previousViewsArray = [...prev.previousViews];
					const lastView = previousViewsArray.pop() || "InitialOptions";
					let finalStepSurchargePercentage =
						prev.surchargePercentageForCurrentStep;

					if (lastView === "InitialOptions" || lastView === "Split") {
						newPaymentMethod = null;
						finalStepSurchargePercentage = 0;
					}
					if (lastView === "InitialOptions") {
						newSplitMode = false;
						newSplitDetails = null;
					}
					if (lastView === "Split") resetSplitState();

					return {
						...prev,
						currentView: lastView,
						previousViews: previousViewsArray,
						direction,
						paymentMethod: newPaymentMethod,
						splitMode: newSplitMode,
						splitDetails: newSplitDetails,
						nextSplitAmount: null,
						currentStepAmount: null,
						currentBaseForTipCalc: null,
						surchargePercentageForCurrentStep: finalStepSurchargePercentage,
						completionResultData: null,
					};
				}
			});
		},
		[
			state.amountPaid,
			state.splitMode,
			state.currentView,
			state.previousViews,
			state.splitDetails,
			state.paymentMethod,
			isPaymentCompleteInternal,
			resetSplitState,
			totalAmount,
		]
	);

	const handleBack = useCallback(() => {
		const fromView = state.currentView;
		if (fromView === "InitialOptions") return false;
		if (fromView === "Cash" || fromView === "Credit" || fromView === "Split") {
			try {
				customerDisplayManager.showCart();
			} catch (err) {
				console.error("NAV BACK: Error calling showCart:", err);
			}
			if (state.splitMode && fromView !== "Split") {
				handleNavigation("Split", -1);
			} else {
				handleNavigation("InitialOptions", -1);
			}
			return true;
		}
		handleNavigation(null, -1);
		return true;
	}, [state.currentView, state.splitMode, handleNavigation]);

	const processPayment = useCallback(
		async (amountChargedByTerminal, paymentDetails = {}) => {
			let calculatedNewAmountPaid = state.amountPaid || 0;
			let finalUpdatedTransactions = state.transactions || [];
			let isNowFullyPaid = false;

			try {
				const method =
					paymentDetails.method || state.paymentMethod || "unknown";
				const tipThisTransaction = paymentDetails?.tipAmount ?? 0;
				let surchargePaidThisTransaction = new Decimal(0);
				let taxPaidThisTransaction = new Decimal(0);
				let baseAmountPaidThisTransactionDecimal;

				const amountNetOfTip = new Decimal(amountChargedByTerminal).minus(
					new Decimal(tipThisTransaction)
				);

				if (method === "credit") {
					const currentStepSurchargePct =
						state.surchargePercentageForCurrentStep || 0;
					const denominator = new Decimal(1)
						.plus(currentStepSurchargePct)
						.times(new Decimal(1).plus(TAX_RATE));
					if (denominator.isZero()) {
						throw new Error("Invalid tax/surcharge rates for credit payment.");
					}
					baseAmountPaidThisTransactionDecimal =
						amountNetOfTip.div(denominator);
					surchargePaidThisTransaction =
						baseAmountPaidThisTransactionDecimal.mul(currentStepSurchargePct);
					taxPaidThisTransaction = baseAmountPaidThisTransactionDecimal
						.plus(surchargePaidThisTransaction)
						.mul(TAX_RATE);
				} else {
					const denominator = new Decimal(1).plus(TAX_RATE);
					if (denominator.isZero()) {
						throw new Error("Invalid tax rate for cash payment.");
					}
					baseAmountPaidThisTransactionDecimal =
						amountNetOfTip.div(denominator);
					taxPaidThisTransaction = amountNetOfTip.minus(
						baseAmountPaidThisTransactionDecimal
					);
				}
				const validatedBaseAmount = Math.max(
					0,
					parseFloat(baseAmountPaidThisTransactionDecimal.toFixed(2))
				);

				const newTransaction = {
					method: method,
					amount: parseFloat(amountChargedByTerminal.toFixed(2)),
					baseAmountPaid: validatedBaseAmount,
					tipAmount: parseFloat(tipThisTransaction.toFixed(2)),
					surchargeAmount: parseFloat(surchargePaidThisTransaction.toFixed(2)),
					taxAmount: parseFloat(taxPaidThisTransaction.toFixed(2)),
					status: "completed",
					timestamp: new Date().toISOString(),
					...(method === "cash" && {
						cashTendered: paymentDetails.cashTendered,
						change: paymentDetails.change,
					}),
					...(method === "credit" && {
						cardInfo: paymentDetails.cardInfo || {},
						transactionId: paymentDetails.transactionId || null,
						flowData: paymentDetails.flowData,
					}),
					...(state.splitMode &&
						state.splitDetails && {
							splitDetailsContext: {
								mode: state.splitDetails.mode,
								numberOfSplits: state.splitDetails.numberOfSplits,
								currentSplitIndex: state.splitDetails.currentSplitIndex ?? 0,
								stepAmountTarget: state.currentStepAmount,
								baseAmountForSplitStep: parseFloat(
									baseAmountPaidThisTransactionDecimal.toFixed(2)
								),
								surchargeForSplitStep: parseFloat(
									surchargePaidThisTransaction.toFixed(2)
								),
								taxForSplitStep: parseFloat(taxPaidThisTransaction.toFixed(2)),
							},
						}),
				};

				setState((prev) => {
					const baseAmountTx = newTransaction.baseAmountPaid || 0;
					const tipAmountTx = newTransaction.tipAmount || 0;
					const surchargeAmountTx = newTransaction.surchargeAmount || 0;
					const taxAmountTx = newTransaction.taxAmount || 0;

					calculatedNewAmountPaid = new Decimal(prev.amountPaid || 0)
						.plus(new Decimal(baseAmountTx))
						.toNumber();
					const calculatedNewTotalTip = new Decimal(prev.totalTipAmount || 0)
						.plus(new Decimal(tipAmountTx))
						.toNumber();
					const calculatedNewTotalSurcharge = new Decimal(
						prev.totalSurchargeAmount || 0
					)
						.plus(new Decimal(surchargeAmountTx))
						.toNumber();
					const calculatedNewTotalTax = new Decimal(prev.totalTaxAmount || 0)
						.plus(new Decimal(taxAmountTx))
						.toNumber();

					finalUpdatedTransactions = [
						...(prev.transactions || []),
						newTransaction,
					];
					isNowFullyPaid = isPaymentCompleteInternal(calculatedNewAmountPaid);

					let updatedOverallSplitDetails = prev.splitDetails;
					if (prev.splitMode && updatedOverallSplitDetails) {
						const currentSplitIndex =
							updatedOverallSplitDetails.currentSplitIndex ?? 0;
						updatedOverallSplitDetails = {
							...updatedOverallSplitDetails,
							currentSplitIndex: currentSplitIndex + 1,
							remainingAmount: Math.max(
								0,
								new Decimal(totalAmount || 0)
									.div(new Decimal(1).plus(TAX_RATE))
									.minus(new Decimal(calculatedNewAmountPaid))
									.toNumber()
							),
							completedSplits: [
								...(updatedOverallSplitDetails.completedSplits || []),
								{
									method: newTransaction.method,
									amount: newTransaction.baseAmountPaid,
									tip: newTransaction.tipAmount,
									surcharge: newTransaction.surchargeAmount,
									tax: newTransaction.taxAmount,
									index: currentSplitIndex,
									timestamp: newTransaction.timestamp,
								},
							],
						};
					}

					return {
						...prev,
						amountPaid: calculatedNewAmountPaid,
						totalTipAmount: calculatedNewTotalTip,
						totalSurchargeAmount: calculatedNewTotalSurcharge,
						totalTaxAmount: calculatedNewTotalTax,
						transactions: finalUpdatedTransactions,
						splitDetails: updatedOverallSplitDetails,
						currentSplitMethod: null,
						currentStepAmount:
							isNowFullyPaid || !prev.splitMode ? null : prev.currentStepAmount,
						currentBaseForTipCalc:
							isNowFullyPaid || !prev.splitMode
								? null
								: prev.currentBaseForTipCalc,
					};
				});
				const finalIsNowFullyPaid = isPaymentCompleteInternal(
					calculatedNewAmountPaid
				);
				return {
					success: true,
					newAmountPaid: calculatedNewAmountPaid,
					updatedTransactions: finalUpdatedTransactions,
					isNowComplete: finalIsNowFullyPaid,
				};
			} catch (errorCatch) {
				console.error("PROCESS PAYMENT: Error:", errorCatch);
				setError(errorCatch.message || "Processing failed");
				return {
					success: false,
					error: errorCatch.message || "Processing failed",
				};
			}
		},
		[
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.currentStepAmount,
			state.currentBaseForTipCalc,
			state.surchargePercentageForCurrentStep,
			state.transactions,
			state.totalTipAmount,
			state.amountPaid,
			state.totalSurchargeAmount,
			state.totalTaxAmount,
			totalAmount,
			isPaymentCompleteInternal,
		]
	);

	const completePaymentFlow = useCallback(
		async (finalTransactions) => {
			setIsCompleting(true);
			setError(null);
			const currentTotalAmountWithTaxProp = totalAmount || 0; // This is ( (Subtotal-Discount) * (1+TAX_RATE) )

			if (!finalTransactions || !Array.isArray(finalTransactions)) {
				setError("Internal error: Transaction data missing.");
				setIsCompleting(false);
				return null;
			}

			const currentBasePaidFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.baseAmountPaid || 0),
				0
			);
			const currentTotalTipFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.tipAmount || 0),
				0
			);
			const currentTotalSurchargeFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.surchargeAmount || 0),
				0
			);
			const currentTotalTaxFromTxns = finalTransactions.reduce(
				(sum, tx) => sum + (tx.taxAmount || 0),
				0
			);

			const isFullyPaidBase = isPaymentCompleteInternal(
				currentBasePaidFromTxns
			);
			if (!isFullyPaidBase) {
				setError(
					"Base order amount (Subtotal - Discount) not fully covered by payments."
				);
				setIsCompleting(false);
				return null;
			}

			const orderId = state.orderId || useCartStore.getState().orderId;
			if (!orderId) {
				setError("Order ID missing.");
				setIsCompleting(false);
				return null;
			}

			// This is (Cart Subtotal - Discount)
			const subtotalForPayload = new Decimal(currentTotalAmountWithTaxProp)
				.div(new Decimal(1).plus(TAX_RATE))
				.toNumber();

			const grandTotalForBackend = new Decimal(subtotalForPayload)
				.plus(new Decimal(currentTotalSurchargeFromTxns))
				.plus(new Decimal(currentTotalTaxFromTxns))
				.plus(new Decimal(currentTotalTipFromTxns))
				.toNumber();

			const paymentPayload = {
				transactions: finalTransactions,
				subtotal: parseFloat(subtotalForPayload.toFixed(2)),
				tax_amount: parseFloat(currentTotalTaxFromTxns.toFixed(2)),
				discount_id: state.discountId,
				discount_amount: parseFloat((state.discountAmount || 0).toFixed(2)),
				surcharge_amount: parseFloat(currentTotalSurchargeFromTxns.toFixed(2)),
				surcharge_percentage:
					currentTotalSurchargeFromTxns > 0 && subtotalForPayload > 0
						? CARD_SURCHARGE_PERCENTAGE
						: 0,
				tip_amount: parseFloat(currentTotalTipFromTxns.toFixed(2)),
				total_amount: parseFloat(grandTotalForBackend.toFixed(2)),
				payment_method: state.splitMode ? "split" : state.paymentMethod,
				splitPayment: state.splitMode,
				splitDetails: state.splitMode ? state.splitDetails : null,
				completed_at: new Date().toISOString(),
				totalPaid: parseFloat(grandTotalForBackend.toFixed(2)),
				baseAmountPaid: parseFloat(
					new Decimal(currentBasePaidFromTxns).toFixed(2)
				),
				totalTipAmount: parseFloat(
					new Decimal(currentTotalTipFromTxns).toFixed(2)
				),
			};

			try {
				if (typeof onComplete !== "function")
					throw new Error("onComplete prop is not a function.");
				const backendOrderData = await onComplete(orderId, paymentPayload);

				if (backendOrderData) {
					const finalCompletionResult = {
						...backendOrderData,
						paymentMethodUsed: state.splitMode ? "split" : state.paymentMethod,
					};
					setState((prev) => ({
						...prev,
						completionResultData: finalCompletionResult,
					}));
					useCartStore.getState().clearCart();
					useCartStore.getState().clearLocalOrderDiscountState();
					useCartStore.getState().setRewardsProfile(null);
					setIsCompleting(false);
					return finalCompletionResult;
				} else {
					setError("Failed to finalize order with backend.");
					setIsCompleting(false);
					return null;
				}
			} catch (errorCatch) {
				console.error(
					"usePaymentFlow: Error calling onComplete prop:",
					errorCatch
				);
				const errorMsg =
					errorCatch?.message || "Error completing order via onComplete.";
				setError(errorMsg);
				toast.error(`Completion Failed: ${errorMsg}`);
				setState((prev) => ({ ...prev, completionResultData: null }));
				setIsCompleting(false);
				return null;
			}
		},
		[
			state.orderId,
			state.paymentMethod,
			state.splitMode,
			state.splitDetails,
			state.discountId,
			state.discountAmount,
			isPaymentCompleteInternal,
			onComplete,
			totalAmount,
		]
	);

	const handleStartNewOrder = useCallback(async () => {
		try {
			await onNewOrder?.();
			const cartDiscount = useCartStore.getState().orderDiscount;
			const cartItems = useCartStore.getState().cart || [];
			const { discountAmount: currentDiscountAmountVal } = getBaseCartTotals(
				cartItems,
				cartDiscount
			);
			setState({
				orderId: useCartStore.getState().orderId,
				currentView: "InitialOptions",
				previousViews: [],
				paymentMethod: null,
				splitMode: false,
				amountPaid: 0,
				transactions: [],
				customAmount: "",
				direction: 1,
				splitDetails: null,
				nextSplitAmount: null,
				currentStepAmount: null,
				currentBaseForTipCalc: null,
				currentSplitMethod: null,
				totalTipAmount: 0,
				totalSurchargeAmount: 0,
				totalTaxAmount: 0,
				surchargePercentageForCurrentStep: 0,
				discountId: cartDiscount?.id,
				discountAmount: currentDiscountAmountVal || 0,
				completionResultData: null,
			});
			setIsCompleting(false);
			useCartStore.getState().clearLocalOrderDiscountState();
			useCartStore.getState().setRewardsProfile(null);
		} catch (errorStartNew) {
			console.error(
				"Error starting new order in payment flow hook:",
				errorStartNew
			);
		}
	}, [onNewOrder]);

	const isPaymentCompletePublic = useCallback(() => {
		return isPaymentCompleteInternal(state.amountPaid);
	}, [state.amountPaid, isPaymentCompleteInternal]);

	return {
		state,
		setState,
		error,
		isCompleting,
		handleNavigation,
		handleBack,
		processPayment,
		completePaymentFlow,
		isPaymentComplete: isPaymentCompletePublic,
		handleStartNewOrder,
		resetSplitState,
		getDisplayTotals: () => {
			const orderBasePreTaxPreSurcharge = new Decimal(totalAmount || 0).div(
				new Decimal(1).plus(TAX_RATE)
			);
			const remainingBaseForFullOrderPaymentPreview = Math.max(
				0,
				orderBasePreTaxPreSurcharge.minus(state.amountPaid || 0).toNumber()
			);

			return calculateDisplayTotalsForUI(
				orderBasePreTaxPreSurcharge.toNumber(), // Pass (Subtotal - Discount)
				state.amountPaid || 0,
				state.totalSurchargeAmount || 0,
				state.totalTaxAmount || 0,
				state.totalTipAmount || 0,
				state.paymentMethod, // Current selected method for preview
				remainingBaseForFullOrderPaymentPreview // Remaining base for preview
			);
		},
	};
};
