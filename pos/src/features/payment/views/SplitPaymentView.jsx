"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
	CreditCard,
	Banknote,
	Settings,
	Scale,
	Calculator,
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
import { Separator } from "@/components/ui/separator";

const { pageVariants, pageTransition } = paymentAnimations;
const TAX_RATE = 0.1;

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
			<ScrollableViewWrapper className="space-y-6 p-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h3 className="text-2xl font-semibold text-slate-800">
						Split Payment
					</h3>
					<p className="text-slate-600">Choose how to split the payment</p>
				</div>

				{/* Order Summary */}
				<Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
					<CardContent className="pt-6">
						<div className="space-y-3">
							<div className="flex justify-between items-center">
								<span className="font-medium text-blue-800">
									Total Order (Inc. Tax):
								</span>
								<span className="font-bold text-lg text-blue-900">
									{formatPrice(totalAmount)}
								</span>
							</div>
							{state.amountPaid > 0 && (
								<div className="flex justify-between items-center">
									<span className="text-emerald-700">Base Amount Paid:</span>
									<Badge
										variant="secondary"
										className="bg-emerald-100 text-emerald-800"
									>
										{formatPrice(state.amountPaid)}
									</Badge>
								</div>
							)}
							<Separator className="bg-blue-200" />
							<div className="flex justify-between items-center">
								<span className="font-semibold text-blue-900">
									Remaining (Inc. Tax, Pre-Surcharge):
								</span>
								<span className="font-bold text-lg text-blue-900">
									{formatPrice(displayTotalRemainingWithTax)}
								</span>
							</div>
							<div className="text-sm text-blue-600 text-right">
								(Remaining Base Pre-Tax:{" "}
								{formatPrice(baseRemainingForSplitCalculations)})
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Split Options */}
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Split Options</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							{splitOptions.map((option) => (
								<Button
									key={option.mode}
									onClick={() => setSplitModeState(option.mode)}
									variant={splitMode === option.mode ? "default" : "outline"}
									className="h-auto p-4 flex flex-col items-center gap-2"
								>
									<option.icon className="h-5 w-5" />
									<div className="text-center">
										<div className="font-medium">{option.label}</div>
										<div className="text-xs opacity-80">
											{option.description}
										</div>
									</div>
								</Button>
							))}
						</div>

						{/* Split Configuration */}
						<Card className="bg-slate-50">
							<CardContent className="pt-6">
								{splitMode === "remaining" && (
									<div className="space-y-3">
										<p className="text-slate-600">
											Pay the full remaining amount.
										</p>
										<div className="flex justify-between items-center p-3 bg-white rounded-lg">
											<span className="font-medium">
												Amount to pay (pre-tax, pre-surcharge):
											</span>
											<Badge
												variant="outline"
												className="text-lg"
											>
												{formatPrice(baseRemainingForSplitCalculations)}
											</Badge>
										</div>
									</div>
								)}

								{splitMode === "equal" && (
									<div className="space-y-4">
										<Label className="text-sm font-medium">
											Number of equal payments:
										</Label>
										<div className="grid grid-cols-4 gap-2">
											{[2, 3, 4, 5].map((num) => (
												<Button
													key={num}
													onClick={() => setNumberOfSplits(num)}
													variant={
														numberOfSplits === num ? "default" : "outline"
													}
													size="sm"
												>
													{num}
												</Button>
											))}
										</div>
										<div className="p-3 bg-white rounded-lg">
											<div className="flex justify-between items-center">
												<span className="text-slate-600">
													Each payment (pre-tax, pre-surcharge):
												</span>
												<Badge
													variant="outline"
													className="text-lg"
												>
													{formatPrice(equalSplitAmountBase)}
												</Badge>
											</div>
										</div>
									</div>
								)}

								{splitMode === "custom" && (
									<div className="space-y-4">
										<Label htmlFor="customSplitAmount">
											Amount for this payment (pre-tax, pre-surcharge):
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
											className="text-right"
										/>
										{splitAmountInput &&
											Number.parseFloat(splitAmountInput) > 0 && (
												<div className="p-3 bg-white rounded-lg">
													<div className="flex justify-between items-center">
														<span className="text-slate-600">
															Remaining base after this split:
														</span>
														<Badge variant="outline">
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
					<CardHeader>
						<CardTitle className="text-lg">
							{splitMode === "remaining"
								? "Choose Payment Method"
								: `Pay ${formatPrice(
										splitMode === "equal"
											? equalSplitAmountBase
											: Number.parseFloat(splitAmountInput || 0)
								  )} (base) with:`}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
								className="h-16 flex items-center gap-3"
							>
								<Banknote className="h-6 w-6" />
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
								className="h-16 flex items-center gap-3"
							>
								<CreditCard className="h-6 w-6" />
								Credit Card
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Transaction History */}
				{state.transactions.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Payment History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{state.transactions.map((transaction, index) => (
									<div
										key={index}
										className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
									>
										<div className="flex items-center gap-3">
											{transaction.method === "cash" ? (
												<Banknote className="h-5 w-5 text-green-600" />
											) : (
												<CreditCard className="h-5 w-5 text-blue-600" />
											)}
											<span className="font-medium">
												{transaction.method === "cash" ? "Cash" : "Card"}
											</span>
										</div>
										<Badge
											variant="outline"
											className="text-lg"
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
