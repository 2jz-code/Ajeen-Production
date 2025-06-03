"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
	CreditCard,
	Banknote,
	Settings,
	Scale,
	Calculator,
	Info,
	ReceiptIndianRupee, // Example for "Last Payment" icon
} from "lucide-react";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { formatPrice } from "../../../utils/numberUtils";
import { Decimal } from "decimal.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify"; // Added for toast notifications

const { pageVariants, pageTransition } = paymentAnimations;
const TAX_RATE = 0.0813; // Ensure this is consistent with your application's TAX_RATE

export const SplitPaymentView = ({
	state,
	orderBaseRemainingPreTaxPreSurcharge,
	handleNavigation,
	setState: setParentState,
	totalAmount, // Original full order total (tax-inclusive, pre-payment-flow surcharges/tip)
}) => {
	const [splitAmountInput, setSplitAmountInput] = useState("");
	const [splitMode, setSplitModeState] = useState("remaining");
	const [numberOfSplits, setNumberOfSplits] = useState(2);

	const baseRemainingForSplitCalculations = Number.parseFloat(
		orderBaseRemainingPreTaxPreSurcharge || 0
	);

	const displayTotalRemainingWithTax = useMemo(() => {
		return new Decimal(baseRemainingForSplitCalculations)
			.times(new Decimal(1).plus(TAX_RATE))
			.toNumber();
	}, [baseRemainingForSplitCalculations]);

	const equalSplitAmountBase = useMemo(() => {
		if (numberOfSplits <= 0 || baseRemainingForSplitCalculations <= 0) return 0;
		return Number.parseFloat(
			new Decimal(baseRemainingForSplitCalculations)
				.div(numberOfSplits)
				.toFixed(2, Decimal.ROUND_HALF_UP)
		);
	}, [baseRemainingForSplitCalculations, numberOfSplits]);

	const equalSplitAmountTaxInclusive = useMemo(() => {
		return new Decimal(equalSplitAmountBase)
			.times(new Decimal(1).plus(TAX_RATE))
			.toNumber();
	}, [equalSplitAmountBase]);

	// This is the current amount to be paid for THIS specific split step, tax-inclusive
	// It's derived from usePaymentFlow's state.currentStepAmount, which is correctly calculated
	// based on the split mode (custom amount user wants to pay, or calculated for equal/remaining)
	// const currentPaymentAmountForThisStepDisplay = useMemo(() => {
	// 	if (
	// 		state.currentStepAmount !== null &&
	// 		state.currentStepAmount !== undefined
	// 	) {
	// 		return state.currentStepAmount;
	// 	}
	// 	// Fallback for "Pay Remaining" if currentStepAmount isn't set yet for it.
	// 	// This ensures the "Pay Remaining" button shows the correct full remaining tax-inc value.
	// 	if (splitMode === "remaining") {
	// 		return displayTotalRemainingWithTax;
	// 	}
	// 	return 0; // Default or if logic is in an intermediate state
	// }, [state.currentStepAmount, splitMode, displayTotalRemainingWithTax]);

	const lastTransaction =
		state.transactions && state.transactions.length > 0
			? state.transactions[state.transactions.length - 1]
			: null;
	const lastTransactionAmount = lastTransaction ? lastTransaction.amount : 0;
	const lastTransactionMethod = lastTransaction ? lastTransaction.method : null;

	const epsilon = 0.01;

	useEffect(() => {
		if (state.splitMode && state.amountPaid > 0) {
			setParentState((prev) => ({
				...prev,
				nextSplitAmount: null,
				currentSplitMethod: null,
			}));
		}
	}, []);

	useEffect(() => {
		if (baseRemainingForSplitCalculations < epsilon && state.splitMode) {
			const timer = setTimeout(() => {
				handleNavigation("Completion", 1, {
					receiptPayload: { transactions: state.transactions },
				});
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [
		baseRemainingForSplitCalculations,
		state.splitMode,
		state.transactions,
		handleNavigation,
	]);

	useEffect(() => {
		setParentState((prev) => ({
			...prev,
			splitMode: true,
			splitDetails: {
				mode: splitMode,
				numberOfSplits: splitMode === "equal" ? numberOfSplits : null,
				initialRemainingAmountForSplit: baseRemainingForSplitCalculations,
				currentSplitIndex: prev.splitDetails?.currentSplitIndex || 0,
			},
		}));
	}, [
		splitMode,
		numberOfSplits,
		baseRemainingForSplitCalculations,
		setParentState,
	]);

	const handlePaymentMethodSelect = (paymentMethodForThisSplit) => {
		let amountForThisSplit_Base; // For "remaining" or "equal" (pre-tax, pre-surcharge)
		let amountUserWantsToPay_Inclusive; // For "custom" (total for this split)

		if (splitMode === "remaining") {
			amountForThisSplit_Base = baseRemainingForSplitCalculations;
			handleNavigation(paymentMethodForThisSplit, 1, {
				nextSplitAmount: amountForThisSplit_Base,
			});
		} else if (splitMode === "equal") {
			amountForThisSplit_Base = equalSplitAmountBase;
			handleNavigation(paymentMethodForThisSplit, 1, {
				nextSplitAmount: amountForThisSplit_Base,
			});
		} else {
			// custom
			amountUserWantsToPay_Inclusive = Number.parseFloat(splitAmountInput || 0);
			if (
				amountUserWantsToPay_Inclusive < epsilon ||
				amountUserWantsToPay_Inclusive > displayTotalRemainingWithTax + epsilon
			) {
				toast.error(
					`Custom amount must be between $0.01 and ${formatPrice(
						displayTotalRemainingWithTax
					)}.`
				);
				return;
			}
			handleNavigation(paymentMethodForThisSplit, 1, {
				nextSplitAmount: amountUserWantsToPay_Inclusive,
			});
		}
	};

	const splitOptions = [
		{ mode: "remaining", label: "Pay Full Remaining", icon: Settings },
		{ mode: "equal", label: "Split Equally", icon: Scale },
		{ mode: "custom", label: "Pay Custom Amount", icon: Calculator },
	];

	let payButtonLabelPrefix = "Pay";
	if (splitMode === "remaining") {
		payButtonLabelPrefix = `Pay ${formatPrice(displayTotalRemainingWithTax)}`;
	} else if (splitMode === "equal") {
		payButtonLabelPrefix = `Pay approx. ${formatPrice(
			equalSplitAmountTaxInclusive
		)}`;
	} else if (
		splitMode === "custom" &&
		parseFloat(splitAmountInput) > 0 &&
		parseFloat(splitAmountInput) <= displayTotalRemainingWithTax + epsilon
	) {
		payButtonLabelPrefix = `Pay ${formatPrice(parseFloat(splitAmountInput))}`;
	}

	return (
		<motion.div
			key="split-payment-ui"
			className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100"
			custom={state.direction}
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper className="space-y-3 p-3">
				<Card className="border-blue-100 bg-blue-50/50 shadow-none">
					<CardContent className="p-2.5 space-y-1.5">
						<div className="flex justify-between items-center">
							<span className="font-medium text-blue-700 text-xs flex items-center gap-1">
								<Info
									size={14}
									className="opacity-80"
								/>
								Total Order (tax-inc):
							</span>
							<span className="font-semibold text-sm text-blue-800">
								{formatPrice(totalAmount)}
							</span>
						</div>

						{lastTransaction && (
							<div className="flex justify-between items-center">
								<span className="text-xs text-slate-600 flex items-center gap-1">
									<ReceiptIndianRupee size={14} />{" "}
									{/* Or another suitable icon */}
									Last Payment Made:
								</span>
								<div className="flex items-center gap-1">
									<Badge
										variant="outline"
										className="bg-slate-100/80 text-slate-700 text-xs px-1.5 py-0.5 leading-tight border-slate-300"
									>
										{lastTransactionMethod
											? lastTransactionMethod.toUpperCase()
											: "N/A"}
									</Badge>
									<Badge
										variant="secondary"
										className="bg-emerald-100/80 text-emerald-800 text-xs px-1.5 py-0.5 leading-tight border-emerald-300"
									>
										{formatPrice(lastTransactionAmount)}
									</Badge>
								</div>
							</div>
						)}

						{/* <div className="flex justify-between items-center">
							<span className="font-medium text-blue-700 text-xs">
								Amount for This Payment (tax-inc):
							</span>
							<span className="font-semibold text-sm text-blue-800">
								{formatPrice(currentPaymentAmountForThisStepDisplay)}
							</span>
						</div> */}

						<div className="flex justify-between items-center">
							<span className="font-medium text-red-700 text-xs">
								Total Remaining on Order (tax-inc):
							</span>
							<span className="font-semibold text-sm text-red-700">
								{formatPrice(displayTotalRemainingWithTax)}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="px-3 pt-3 pb-2">
						<CardTitle className="text-sm">Split Options</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2.5 px-3 pb-3">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							{splitOptions.map((option) => (
								<Button
									key={option.mode}
									onClick={() => setSplitModeState(option.mode)}
									variant={splitMode === option.mode ? "default" : "outline"}
									className="h-auto p-2.5 flex flex-col items-center gap-1 text-xs"
									size="sm"
								>
									<option.icon className="h-4 w-4 mb-1" />
									<div className="text-center">
										<div className="font-medium text-xs leading-tight">
											{option.label}
										</div>
									</div>
								</Button>
							))}
						</div>

						<Card className="bg-slate-50/80">
							<CardContent className="p-3">
								{splitMode === "remaining" && (
									<div className="space-y-2">
										<p className="text-slate-600 text-xs">
											Pay the full remaining amount for the order.
										</p>
										<div className="flex justify-between items-center p-2 bg-white rounded-md border">
											<span className="font-medium text-xs">
												Amount (tax-inc):
											</span>
											<Badge
												variant="outline"
												className="text-xs px-1.5 py-0.5"
											>
												{formatPrice(displayTotalRemainingWithTax)}
											</Badge>
										</div>
									</div>
								)}
								{splitMode === "equal" && (
									<div className="space-y-2.5">
										<Label className="text-xs font-medium">
											Number of equal payments:
										</Label>
										<div className="grid grid-cols-4 gap-1.5">
											{[2, 3, 4, 5].map((num) => (
												<Button
													key={num}
													onClick={() => setNumberOfSplits(num)}
													variant={
														numberOfSplits === num ? "default" : "outline"
													}
													size="xs"
													className="h-7 px-2 text-xs"
												>
													{num}
												</Button>
											))}
										</div>
										<div className="p-2 bg-white rounded-md border">
											<div className="flex justify-between items-center">
												<span className="text-slate-600 text-xs">
													Each payment (tax-inc, approx.):
												</span>
												<Badge
													variant="outline"
													className="text-xs px-1.5 py-0.5"
												>
													{formatPrice(equalSplitAmountTaxInclusive)}
												</Badge>
											</div>
										</div>
									</div>
								)}
								{splitMode === "custom" && (
									<div className="space-y-2.5">
										<Label
											htmlFor="customSplitAmount"
											className="text-xs"
										>
											Amount to Pay this time
										</Label>
										<Input
											id="customSplitAmount"
											type="number"
											value={splitAmountInput}
											onChange={(e) => setSplitAmountInput(e.target.value)}
											placeholder="0.00"
											min="0.01"
											max={
												displayTotalRemainingWithTax > 0
													? displayTotalRemainingWithTax.toFixed(2)
													: "0.01"
											}
											step="0.01"
											className="text-right h-9 text-sm"
										/>
									</div>
								)}
							</CardContent>
						</Card>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="px-3 pt-3 pb-2">
						<CardTitle className="text-sm">
							{payButtonLabelPrefix} with:
						</CardTitle>
					</CardHeader>
					<CardContent className="px-3 pb-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
							<Button
								onClick={() => handlePaymentMethodSelect("Cash")}
								disabled={
									(splitMode === "custom" &&
										(!splitAmountInput ||
											Number.parseFloat(splitAmountInput || 0) <= 0 ||
											Number.parseFloat(splitAmountInput || 0) >
												displayTotalRemainingWithTax + epsilon)) ||
									(splitMode === "equal" && equalSplitAmountBase < epsilon) ||
									(splitMode === "remaining" &&
										baseRemainingForSplitCalculations < epsilon)
								}
								size="lg"
								className="h-11 flex items-center gap-2 text-sm py-2.5"
							>
								<Banknote className="h-5 w-5" /> Cash
							</Button>
							<Button
								onClick={() => handlePaymentMethodSelect("Credit")}
								disabled={
									(splitMode === "custom" &&
										(!splitAmountInput ||
											Number.parseFloat(splitAmountInput || 0) <= 0 ||
											Number.parseFloat(splitAmountInput || 0) >
												displayTotalRemainingWithTax + epsilon)) ||
									(splitMode === "equal" && equalSplitAmountBase < epsilon) ||
									(splitMode === "remaining" &&
										baseRemainingForSplitCalculations < epsilon)
								}
								size="lg"
								className="h-11 flex items-center gap-2 text-sm py-2.5"
							>
								<CreditCard className="h-5 w-5" /> Credit Card
							</Button>
						</div>
					</CardContent>
				</Card>

				{state.transactions.length > 0 && (
					<Card>
						<CardHeader className="px-3 pt-3 pb-2">
							<CardTitle className="text-sm">
								Payment History for this Order
							</CardTitle>
						</CardHeader>
						<CardContent className="px-3 pb-3">
							<div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
								{" "}
								{/* Added max-h and overflow */}
								{state.transactions.map((transaction, index) => (
									<div
										key={index}
										className="flex justify-between items-center p-2 bg-slate-50/70 rounded-md border"
									>
										<div className="flex items-center gap-2">
											{transaction.method === "cash" ? (
												<Banknote className="h-4 w-4 text-green-600" />
											) : (
												<CreditCard className="h-4 w-4 text-blue-600" />
											)}
											<span className="font-medium text-xs capitalize">
												{transaction.method}
											</span>
											<span className="text-xs text-muted-foreground">
												(Paid: {formatPrice(transaction.amount)}; Base:{" "}
												{formatPrice(transaction.baseAmountPaid)}; Tax:{" "}
												{formatPrice(transaction.taxAmount)}; Surcharge:{" "}
												{formatPrice(transaction.surchargeAmount)}; Tip:{" "}
												{formatPrice(transaction.tipAmount)})
											</span>
										</div>
										<Badge
											variant="secondary"
											className="text-xs px-1.5 py-0.5 whitespace-nowrap"
										>
											{formatPrice(transaction.amount)}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</ScrollableViewWrapper>
		</motion.div>
	);
};

SplitPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.array.isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
		currentStepAmount: PropTypes.number,
	}).isRequired,
	orderBaseRemainingPreTaxPreSurcharge: PropTypes.number.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired,
};

export default SplitPaymentView;
