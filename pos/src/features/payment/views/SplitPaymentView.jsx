// src/features/payment/views/SplitPaymentView.jsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
	CreditCardIcon,
	BanknotesIcon,
	AdjustmentsHorizontalIcon,
	ScaleIcon,
	VariableIcon,
} from "@heroicons/react/24/solid";
import PaymentButton from "../PaymentButton";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { formatPrice } from "../../../utils/numberUtils";
import { Decimal } from "decimal.js";

const { pageVariants, pageTransition } = paymentAnimations;
const TAX_RATE = 0.1; // Ensure this matches usePaymentFlow

export const SplitPaymentView = ({
	state,
	// remainingAmount, // This was displayRemainingOverall (base+surcharge+tax remaining)
	orderBaseRemainingPreTaxPreSurcharge, // NEW PROP: (Subtotal-Discount) remaining
	handleNavigation,
	setState: setParentState, // Renamed to avoid conflict
	totalAmount, // Original (Subtotal-Discount)*(1+TAX_RATE)
}) => {
	const [splitAmountInput, setSplitAmountInput] = useState(""); // For custom amount input
	const [splitMode, setSplitModeState] = useState("remaining"); // "remaining", "equal", "custom"
	const [numberOfSplits, setNumberOfSplits] = useState(2);

	// The amount SplitPaymentView should operate on is the pre-tax, pre-surcharge base remaining
	const baseRemainingForSplitCalculations = parseFloat(
		orderBaseRemainingPreTaxPreSurcharge || 0
	);

	const equalSplitAmountBase = useMemo(() => {
		if (numberOfSplits <= 0 || baseRemainingForSplitCalculations <= 0) return 0;
		return parseFloat(
			(baseRemainingForSplitCalculations / numberOfSplits).toFixed(2)
		);
	}, [baseRemainingForSplitCalculations, numberOfSplits]);

	// This is the tax-inclusive, pre-surcharge amount remaining for the whole order
	const displayTotalRemainingWithTax = useMemo(() => {
		return new Decimal(baseRemainingForSplitCalculations)
			.times(new Decimal(1).plus(TAX_RATE))
			.toNumber();
	}, [baseRemainingForSplitCalculations]);

	const epsilon = 0.01;
	useEffect(() => {
		if (state.splitMode && state.amountPaid > 0) {
			setParentState((prev) => ({
				...prev,
				nextSplitAmount: null,
				currentSplitMethod: null,
			}));
		}
	}, []); // Run once on mount

	useEffect(() => {
		// If the pre-tax, pre-surcharge base remaining is effectively zero, payment is complete
		if (baseRemainingForSplitCalculations < epsilon && state.splitMode) {
			const timer = setTimeout(() => {
				handleNavigation("Completion", 1);
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [baseRemainingForSplitCalculations, state.splitMode, handleNavigation]);

	useEffect(() => {
		setParentState((prev) => ({
			...prev,
			splitMode: true, // Ensure parent knows we are in split mode
			splitDetails: {
				mode: splitMode,
				numberOfSplits: splitMode === "equal" ? numberOfSplits : null,
				// Custom amount here is the pre-tax, pre-surcharge base
				customAmount:
					splitMode === "custom" ? parseFloat(splitAmountInput || 0) : null,
				initialRemainingAmountForSplit: baseRemainingForSplitCalculations, // Store initial base for this split session
				currentSplitIndex: prev.splitDetails?.currentSplitIndex || 0,
			},
		}));
	}, [
		splitMode,
		numberOfSplits,
		splitAmountInput,
		baseRemainingForSplitCalculations,
		setParentState,
	]);

	const handlePaymentMethodSelect = (method) => {
		let amountForThisSplit_PreTaxPreSurcharge;
		if (splitMode === "remaining") {
			amountForThisSplit_PreTaxPreSurcharge = baseRemainingForSplitCalculations;
		} else if (splitMode === "equal") {
			amountForThisSplit_PreTaxPreSurcharge = equalSplitAmountBase;
		} else {
			// custom
			amountForThisSplit_PreTaxPreSurcharge = parseFloat(splitAmountInput || 0);
			const epsilon = 0.01;
			if (
				amountForThisSplit_PreTaxPreSurcharge < epsilon ||
				amountForThisSplit_PreTaxPreSurcharge >
					baseRemainingForSplitCalculations + epsilon
			) {
				console.error("Invalid custom split amount.");
				return;
			}
		}
		amountForThisSplit_PreTaxPreSurcharge = parseFloat(
			amountForThisSplit_PreTaxPreSurcharge.toFixed(2)
		);

		handleNavigation(method, 1, {
			nextSplitAmount: amountForThisSplit_PreTaxPreSurcharge,
		});
	};

	return (
		<motion.div
			key="split-payment-ui"
			className="absolute inset-0 p-4 flex flex-col bg-slate-50"
			custom={state.direction}
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper className="flex-grow space-y-4 mb-4">
				<div className="text-center">
					<h3 className="text-xl font-semibold text-slate-800 mb-1">
						Split Payment
					</h3>
					<p className="text-slate-500 text-sm">
						Choose how to split the payment
					</p>
				</div>
				<motion.div
					className="p-4 bg-blue-50 text-blue-700 rounded-lg space-y-2 shadow border border-blue-100"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					<div className="flex justify-between items-center">
						<span className="font-medium text-blue-800">
							Total Order (Inc. Tax):
						</span>
						<span className="font-bold text-lg text-blue-900">
							{formatPrice(totalAmount)}{" "}
							{/* This is the original tax-inclusive order total */}
						</span>
					</div>
					{state.amountPaid > 0 && ( // state.amountPaid is sum of base pre-tax pre-surcharge paid
						<div className="flex justify-between items-center text-sm text-emerald-700">
							<span>Base Amount Paid:</span>
							<span className="font-medium">
								{formatPrice(state.amountPaid)}
							</span>
						</div>
					)}
					<div className="flex justify-between items-center text-lg text-blue-900 border-t border-blue-100 pt-2 mt-2">
						<span className="font-semibold">
							Remaining (Inc. Tax, Pre-Surcharge):
						</span>
						<span className="font-bold">
							{formatPrice(displayTotalRemainingWithTax)}
						</span>
					</div>
					<div className="text-xs text-blue-600 text-right">
						(Remaining Base Pre-Tax:{" "}
						{formatPrice(baseRemainingForSplitCalculations)})
					</div>
				</motion.div>

				<div className="space-y-4">
					<h4 className="text-base font-semibold text-slate-700 border-b pb-2">
						Split Options
					</h4>
					<div className="flex flex-col sm:flex-row gap-2">
						{[
							{
								mode: "remaining",
								label: "Pay Remaining",
								icon: AdjustmentsHorizontalIcon,
							},
							{ mode: "equal", label: "Equal Split", icon: ScaleIcon },
							{ mode: "custom", label: "Custom Amount", icon: VariableIcon },
						].map(({ mode: btnMode, label, icon: Icon }) => (
							<button
								key={btnMode}
								onClick={() => setSplitModeState(btnMode)}
								className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
									splitMode === btnMode
										? "bg-blue-600 border-blue-600 text-white shadow-sm"
										: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
								}`}
							>
								<Icon className="h-4 w-4" />
								<span>{label}</span>
							</button>
						))}
					</div>

					<div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm min-h-[100px]">
						{splitMode === "remaining" && (
							<div className="space-y-2 text-sm">
								<p className="text-slate-600">Pay the full remaining amount.</p>
								<div className="flex justify-between font-medium text-slate-800">
									<span>Amount to pay (pre-tax, pre-surcharge):</span>
									<span>{formatPrice(baseRemainingForSplitCalculations)}</span>
								</div>
							</div>
						)}
						{splitMode === "equal" && (
							<div className="space-y-3">
								<label className="block text-sm font-medium text-slate-700">
									Number of equal payments:
								</label>
								<div className="grid grid-cols-4 gap-2">
									{[2, 3, 4, 5].map((num) => (
										<button
											key={num}
											onClick={() => setNumberOfSplits(num)}
											className={`py-2 rounded-md border text-sm font-medium transition-colors ${
												numberOfSplits === num
													? "bg-blue-100 border-blue-300 text-blue-800 ring-1 ring-blue-300"
													: "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
											}`}
										>
											{num}
										</button>
									))}
								</div>
								<div className="text-sm space-y-1 pt-2 border-t border-slate-100 mt-2">
									<div className="flex justify-between">
										<span className="text-slate-600">
											Each payment (pre-tax, pre-surcharge):
										</span>
										<span className="font-medium text-slate-800">
											{formatPrice(equalSplitAmountBase)}
										</span>
									</div>
								</div>
							</div>
						)}
						{splitMode === "custom" && (
							<div className="space-y-3">
								<label
									htmlFor="customSplitAmount"
									className="block text-sm font-medium text-slate-700"
								>
									Amount for this payment (pre-tax, pre-surcharge):
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="customSplitAmount"
										type="number"
										value={splitAmountInput}
										onChange={(e) => setSplitAmountInput(e.target.value)}
										className="block w-full pl-7 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-right"
										placeholder="0.00"
										min="0.01"
										max={baseRemainingForSplitCalculations.toFixed(2)}
										step="0.01"
									/>
								</div>
								{splitAmountInput && parseFloat(splitAmountInput) > 0 && (
									<div className="text-sm space-y-1 pt-2 border-t border-slate-100 mt-2">
										<div className="flex justify-between">
											<span className="text-slate-600">
												Remaining base after this split:
											</span>
											<span className="font-medium text-slate-800">
												{formatPrice(
													baseRemainingForSplitCalculations -
														parseFloat(splitAmountInput || 0)
												)}
											</span>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				<div className="space-y-3 pt-4 border-t border-slate-200">
					<h4 className="text-base font-semibold text-slate-700">
						{splitMode === "remaining"
							? "Choose Payment Method"
							: `Pay ${formatPrice(
									splitMode === "equal"
										? equalSplitAmountBase
										: parseFloat(splitAmountInput || 0)
							  )} (base) with:`}
					</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<PaymentButton
							icon={BanknotesIcon}
							label="Cash"
							onClick={() => handlePaymentMethodSelect("Cash")}
							disabled={
								splitMode === "custom" &&
								(!splitAmountInput ||
									parseFloat(splitAmountInput) <= 0 ||
									parseFloat(splitAmountInput) >
										baseRemainingForSplitCalculations + epsilon)
							}
							variant="default"
							className="py-3 text-base"
						/>
						<PaymentButton
							icon={CreditCardIcon}
							label="Credit Card"
							onClick={() => handlePaymentMethodSelect("Credit")}
							disabled={
								splitMode === "custom" &&
								(!splitAmountInput ||
									parseFloat(splitAmountInput) <= 0 ||
									parseFloat(splitAmountInput) >
										baseRemainingForSplitCalculations + epsilon)
							}
							variant="default"
							className="py-3 text-base"
						/>
					</div>
				</div>
				{/* Transaction history */}
				{state.transactions.length > 0 && (
					<div className="mt-6 space-y-2 pt-4 border-t border-slate-200">
						{" "}
						{/* Added border */}
						<h4 className="text-sm font-medium text-slate-600">
							Payment History
						</h4>
						{state.transactions.map((transaction, index) => (
							<div
								key={index}
								className="p-3 bg-white rounded-lg flex justify-between items-center text-sm border border-slate-200 shadow-sm" // Improved item styling
							>
								<span className="text-slate-600 flex items-center">
									{transaction.method === "cash" ? (
										<BanknotesIcon className="h-5 w-5 mr-2 text-green-600" /> // Colored icons
									) : (
										<CreditCardIcon className="h-5 w-5 mr-2 text-blue-600" /> // Colored icons
									)}
									{transaction.method === "cash" ? "Cash" : "Card"}{" "}
									{/* Shortened label */}
								</span>
								<span className="font-semibold text-slate-800">
									{formatPrice(transaction.amount)}
								</span>
							</div>
						))}
					</div>
				)}
			</ScrollableViewWrapper>
		</motion.div>
	);
	// --- END OF UI UPDATES ---
};

SplitPaymentView.propTypes = {
	state: PropTypes.shape({
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired, // total base (pre-tax, pre-surcharge) paid so far
		transactions: PropTypes.array.isRequired,
		customAmount: PropTypes.string.isRequired,
		splitDetails: PropTypes.object,
		currentStepAmount: PropTypes.number, // Amount for current step (base+surcharge+tax)
	}).isRequired,
	remainingAmount: PropTypes.number.isRequired, // Overall remaining (base+surcharge+tax) for the order
	orderBaseRemainingPreTaxPreSurcharge: PropTypes.number.isRequired, // NEW: Remaining base (pre-tax, pre-surcharge) for the order
	handleNavigation: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired, // Original order total ( (Subtotal-Discount)*(1+TAX_RATE) )
};

export default SplitPaymentView;
