"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
	CreditCard,
	Banknote,
	Settings,
	Scale,
	Calculator,
	Info, // Added for a generic info icon
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

const { pageVariants, pageTransition } = paymentAnimations;
const TAX_RATE = 0.0813;

export const SplitPaymentView = ({
	state,
	orderBaseRemainingPreTaxPreSurcharge,
	handleNavigation,
	setState: setParentState,
	totalAmount,
}) => {
	const [splitAmountInput, setSplitAmountInput] = useState("");
	const [splitMode, setSplitModeState] = useState("remaining");
	const [numberOfSplits, setNumberOfSplits] = useState(2);

	const baseRemainingForSplitCalculations = Number.parseFloat(
		orderBaseRemainingPreTaxPreSurcharge || 0
	);

	const equalSplitAmountBase = useMemo(() => {
		if (numberOfSplits <= 0 || baseRemainingForSplitCalculations <= 0) return 0;
		return Number.parseFloat(
			(baseRemainingForSplitCalculations / numberOfSplits).toFixed(2)
		);
	}, [baseRemainingForSplitCalculations, numberOfSplits]);

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
	}, []);

	useEffect(() => {
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
			splitMode: true,
			splitDetails: {
				mode: splitMode,
				numberOfSplits: splitMode === "equal" ? numberOfSplits : null,
				customAmount:
					splitMode === "custom"
						? Number.parseFloat(splitAmountInput || 0)
						: null,
				initialRemainingAmountForSplit: baseRemainingForSplitCalculations,
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
			amountForThisSplit_PreTaxPreSurcharge = Number.parseFloat(
				splitAmountInput || 0
			);
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
		amountForThisSplit_PreTaxPreSurcharge = Number.parseFloat(
			amountForThisSplit_PreTaxPreSurcharge.toFixed(2)
		);

		handleNavigation(method, 1, {
			nextSplitAmount: amountForThisSplit_PreTaxPreSurcharge,
		});
	};

	const splitOptions = [
		{
			mode: "remaining",
			label: "Pay Remaining",
			icon: Settings,
		},
		{
			mode: "equal",
			label: "Equal Split",
			icon: Scale,
		},
		{
			mode: "custom",
			label: "Custom Amount",
			icon: Calculator,
		},
	];

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
				{/* ----- EXTREMELY SMALL "Order Summary" CARD ----- */}
				<Card className="border-blue-100 bg-blue-50/50 shadow-none">
					<CardContent className="p-1.5 space-y-0.5">
						{" "}
						{/* Minimal padding and space */}
						<div className="flex justify-between items-center">
							<span className="font-medium text-blue-700 text-xxs flex items-center gap-0.5">
								{" "}
								{/* text-xxs hypothetical */}
								<Info
									size={10}
									className="opacity-80"
								/>{" "}
								Total Order:
							</span>
							<span className="font-semibold text-xs text-blue-800">
								{formatPrice(totalAmount)}
							</span>
						</div>
						{state.amountPaid > 0 && (
							<div className="flex justify-between items-center">
								<span className="text-emerald-700 text-xxs">Base Paid:</span>
								<Badge
									variant="secondary"
									className="bg-emerald-100/70 text-emerald-800 text-xxs px-1 py-0 leading-tight" /* Adjusted Badge */
								>
									{formatPrice(state.amountPaid)}
								</Badge>
							</div>
						)}
						<div className="flex justify-between items-center">
							<span className="font-medium text-blue-700 text-xxs">
								Remaining (Inc. Tax):
							</span>
							<span className="font-semibold text-xs text-blue-800">
								{formatPrice(displayTotalRemainingWithTax)}
							</span>
						</div>
						<div className="text-xxs text-blue-600 text-right">
							(Base Rem: {formatPrice(baseRemainingForSplitCalculations)})
						</div>
					</CardContent>
				</Card>
				{/* ----- END OF EXTREMELY SMALL CARD ----- */}
				{/* Split Options */}
				<Card>
					<CardHeader className="px-2.5 pt-2 pb-1.5">
						{" "}
						{/* Reduced padding */}
						<CardTitle className="text-sm">Split Options</CardTitle>{" "}
						{/* Reduced font */}
					</CardHeader>
					<CardContent className="space-y-2.5 px-2.5 pb-2.5">
						{" "}
						{/* Reduced space and padding */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
							{" "}
							{/* Reduced gap */}
							{splitOptions.map((option) => (
								<Button
									key={option.mode}
									onClick={() => setSplitModeState(option.mode)}
									variant={splitMode === option.mode ? "default" : "outline"}
									className="h-auto p-2 flex flex-col items-center gap-0.5 text-xs" /* Adjusted */
									size="sm"
								>
									<option.icon className="h-3.5 w-3.5 mb-0.5" />{" "}
									{/* Smaller icon */}
									<div className="text-center">
										<div className="font-medium text-xs">{option.label}</div>
										<div className="text-xxs opacity-80 leading-tight">
											{option.description}
										</div>{" "}
										{/* text-xxs hypothetical */}
									</div>
								</Button>
							))}
						</div>
						{/* Split Configuration */}
						<Card className="bg-slate-50/80">
							<CardContent className="p-2.5">
								{" "}
								{/* Reduced padding */}
								{splitMode === "remaining" && (
									<div className="space-y-1.5">
										{" "}
										{/* Reduced space */}
										<p className="text-slate-600 text-xs">
											Pay the full remaining amount.
										</p>
										<div className="flex justify-between items-center p-1.5 bg-white rounded">
											{" "}
											{/* Reduced padding */}
											<span className="font-medium text-xs">
												Amount (pre-tax):
											</span>
											<Badge
												variant="outline"
												className="text-xs px-1 py-0.5" /* Adjusted badge */
											>
												{formatPrice(baseRemainingForSplitCalculations)}
											</Badge>
										</div>
									</div>
								)}
								{splitMode === "equal" && (
									<div className="space-y-2">
										{" "}
										{/* Reduced space */}
										<Label className="text-xs font-medium">
											Number of equal payments:
										</Label>
										<div className="grid grid-cols-4 gap-1">
											{" "}
											{/* Reduced gap */}
											{[2, 3, 4, 5].map((num) => (
												<Button
													key={num}
													onClick={() => setNumberOfSplits(num)}
													variant={
														numberOfSplits === num ? "default" : "outline"
													}
													size="xs"
													className="h-6 px-1.5 text-xs" /* Adjusted button */
												>
													{num}
												</Button>
											))}
										</div>
										<div className="p-1.5 bg-white rounded">
											{" "}
											{/* Reduced padding */}
											<div className="flex justify-between items-center">
												<span className="text-slate-600 text-xs">
													Each payment (pre-tax):
												</span>
												<Badge
													variant="outline"
													className="text-xs px-1 py-0.5" /* Adjusted badge */
												>
													{formatPrice(equalSplitAmountBase)}
												</Badge>
											</div>
										</div>
									</div>
								)}
								{splitMode === "custom" && (
									<div className="space-y-2">
										{" "}
										{/* Reduced space */}
										<Label
											htmlFor="customSplitAmount"
											className="text-xs"
										>
											Amount (pre-tax):
										</Label>
										<Input
											id="customSplitAmount"
											type="number"
											value={splitAmountInput}
											onChange={(e) => setSplitAmountInput(e.target.value)}
											placeholder="0.00"
											min="0.01"
											max={baseRemainingForSplitCalculations.toFixed(2)}
											step="0.01"
											className="text-right h-8 text-xs" /* Adjusted input */
										/>
										{splitAmountInput &&
											Number.parseFloat(splitAmountInput) > 0 && (
												<div className="p-1.5 bg-white rounded">
													{" "}
													{/* Reduced padding */}
													<div className="flex justify-between items-center">
														<span className="text-slate-600 text-xs">
															Base rem. after this:
														</span>
														<Badge
															variant="outline"
															className="text-xs px-1 py-0.5"
														>
															{" "}
															{/* Adjusted badge */}
															{formatPrice(
																baseRemainingForSplitCalculations -
																	Number.parseFloat(splitAmountInput || 0)
															)}
														</Badge>
													</div>
												</div>
											)}
									</div>
								)}
							</CardContent>
						</Card>
					</CardContent>
				</Card>
				{/* Payment Method Selection */}
				<Card>
					<CardHeader className="px-2.5 pt-2 pb-1.5">
						{" "}
						{/* Reduced padding */}
						<CardTitle className="text-xs">
							{" "}
							{/* Reduced font */}
							{splitMode === "remaining"
								? "Choose Payment Method"
								: `Pay ${formatPrice(
										splitMode === "equal"
											? equalSplitAmountBase
											: Number.parseFloat(splitAmountInput || 0)
								  )} (base) with:`}
						</CardTitle>
					</CardHeader>
					<CardContent className="px-2.5 pb-2.5">
						{" "}
						{/* Reduced padding */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{" "}
							{/* Reduced gap */}
							<Button
								onClick={() => handlePaymentMethodSelect("Cash")}
								disabled={
									splitMode === "custom" &&
									(!splitAmountInput ||
										Number.parseFloat(splitAmountInput) <= 0 ||
										Number.parseFloat(splitAmountInput) >
											baseRemainingForSplitCalculations + epsilon)
								}
								size="lg"
								className="h-10 flex items-center gap-1.5 text-xs py-2" /* Adjusted */
							>
								<Banknote className="h-4 w-4" /> {/* Smaller Icon */}
								Cash
							</Button>
							<Button
								onClick={() => handlePaymentMethodSelect("Credit")}
								disabled={
									splitMode === "custom" &&
									(!splitAmountInput ||
										Number.parseFloat(splitAmountInput) <= 0 ||
										Number.parseFloat(splitAmountInput) >
											baseRemainingForSplitCalculations + epsilon)
								}
								size="lg"
								className="h-10 flex items-center gap-1.5 text-xs py-2" /* Adjusted */
							>
								<CreditCard className="h-4 w-4" /> {/* Smaller Icon */}
								Credit Card
							</Button>
						</div>
					</CardContent>
				</Card>
				{/* Transaction History */}
				{state.transactions.length > 0 && (
					<Card>
						<CardHeader className="px-2.5 pt-2 pb-1.5">
							{" "}
							{/* Reduced padding */}
							<CardTitle className="text-sm">Payment History</CardTitle>{" "}
							{/* Reduced font */}
						</CardHeader>
						<CardContent className="px-2.5 pb-2.5">
							{" "}
							{/* Reduced padding */}
							<div className="space-y-1.5">
								{" "}
								{/* Reduced space */}
								{state.transactions.map((transaction, index) => (
									<div
										key={index}
										className="flex justify-between items-center p-1.5 bg-slate-50/70 rounded" /* Adjusted */
									>
										<div className="flex items-center gap-1">
											{" "}
											{/* Reduced gap */}
											{transaction.method === "cash" ? (
												<Banknote className="h-3.5 w-3.5 text-green-600" /> /* Smaller icon */
											) : (
												<CreditCard className="h-3.5 w-3.5 text-blue-600" /> /* Smaller icon */
											)}
											<span className="font-medium text-xxs">
												{" "}
												{/* text-xxs hypothetical */}
												{transaction.method === "cash" ? "Cash" : "Card"}
											</span>
										</div>
										<Badge
											variant="outline"
											className="text-xs px-1 py-0.5" /* Adjusted badge */
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
	remainingAmount: PropTypes.number.isRequired,
	orderBaseRemainingPreTaxPreSurcharge: PropTypes.number.isRequired,
	handleNavigation: PropTypes.func.isRequired,
	setState: PropTypes.func.isRequired,
	totalAmount: PropTypes.number.isRequired,
};

export default SplitPaymentView;
