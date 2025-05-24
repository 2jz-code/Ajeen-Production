import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils";
import { ThumbsUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

/**
 * TipSelectionView Component
 * Allows the customer to select a tip percentage or enter a custom amount.
 */
const TipSelectionView = ({ orderTotal = 0, onComplete }) => {
	const [tipAmount, setTipAmount] = useState(0);
	const [selectedPercentage, setSelectedPercentage] = useState(null);
	const [customTipInput, setCustomTipInput] = useState("");

	const totalWithTip = useMemo(
		() => orderTotal + tipAmount,
		[orderTotal, tipAmount]
	);

	const tipPercentages = [15, 18, 20, 25];

	const calculateTipFromPercentage = (percentage) => {
		if (orderTotal <= 0 || percentage <= 0) return 0;
		const orderCents = Math.round(orderTotal * 100);
		const tipCents = Math.round(orderCents * (percentage / 100));
		return tipCents / 100;
	};

	const handleTipSelection = (percentage) => {
		const calculatedTip = calculateTipFromPercentage(percentage);
		setTipAmount(calculatedTip);
		setSelectedPercentage(percentage);
		setCustomTipInput("");
	};

	const handleCustomTipChange = (e) => {
		const inputVal = e.target.value;
		setCustomTipInput(inputVal);

		const value = Number.parseFloat(inputVal);
		const newTipAmount = !isNaN(value) && value >= 0 ? value : 0;

		setTipAmount(newTipAmount);
		setSelectedPercentage(null);
	};

	const handleComplete = () => {
		if (onComplete) {
			onComplete({
				tipAmount: Number.parseFloat(tipAmount.toFixed(2)),
				tipPercentage: selectedPercentage,
				orderTotal: Number.parseFloat(orderTotal.toFixed(2)),
				totalWithTip: Number.parseFloat(totalWithTip.toFixed(2)),
			});
		}
	};

	const handleSkip = () => {
		setTipAmount(0);
		setSelectedPercentage(0);
		setCustomTipInput("");
		if (onComplete) {
			onComplete({
				tipAmount: 0,
				tipPercentage: 0,
				orderTotal: Number.parseFloat(orderTotal.toFixed(2)),
				totalWithTip: Number.parseFloat(orderTotal.toFixed(2)),
			});
		}
	};

	const isCustomAmountValid = () => {
		const amount = Number.parseFloat(customTipInput);
		return !isNaN(amount) && amount >= 0;
	};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.3 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};

	const itemVariants = (delay = 0) => ({
		hidden: { opacity: 0, y: 15 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.5, delay, ease: "easeOut" },
		},
	});

	return (
		<motion.div
			key="tip"
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 md:p-8"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<div className="w-full max-w-lg">
				{/* Header Section */}
				<div className="pb-4">
					<motion.div
						variants={itemVariants(0)}
						className="flex justify-center mb-4"
					>
						{" "}
						{/* Icon centered with flex */}
						<ThumbsUp
							className="h-16 w-16 text-blue-600 opacity-80"
							strokeWidth={1.5}
						/>
					</motion.div>

					<motion.div
						variants={itemVariants(0.1)}
						className="text-center"
					>
						{" "}
						{/* Title/subtitle centered */}
						<h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
							Add a Tip?
						</h2>
						<p className="text-lg text-slate-600">
							100% of tips go directly to our team!
						</p>
					</motion.div>
				</div>

				{/* Content Section */}
				<div className="space-y-6">
					<motion.div variants={itemVariants(0.2)}>
						<Card className="border-slate-200 bg-slate-50/80 backdrop-blur-sm shadow-md">
							<CardContent className="p-5 text-center">
								<div className="text-sm font-medium text-slate-500 mb-2">
									Total Including Tip
								</div>
								<div className="flex items-baseline justify-center gap-2">
									<span className="text-4xl font-bold text-slate-900">
										{formatPrice(totalWithTip)}
									</span>
									{tipAmount > 0 && (
										<motion.div
											key={tipAmount}
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
										>
											<Badge
												variant="secondary"
												className="bg-blue-100 text-blue-700"
											>
												+{formatPrice(tipAmount)} tip
											</Badge>
										</motion.div>
									)}
								</div>
							</CardContent>
						</Card>
					</motion.div>

					<motion.div
						variants={itemVariants(0.3)}
						className="space-y-5"
					>
						<div className="grid grid-cols-4 gap-3">
							{tipPercentages.map((percent) => (
								<Button
									key={percent}
									variant={
										selectedPercentage === percent ? "default" : "outline"
									}
									className={`flex flex-col h-auto p-4 ${
										selectedPercentage === percent
											? "bg-blue-600 hover:bg-blue-700 scale-105 shadow-lg"
											: "bg-white/70 hover:border-blue-500 hover:bg-blue-50/70 border-slate-300"
									} transition-all duration-150 backdrop-blur-sm`}
									onClick={() => handleTipSelection(percent)}
								>
									<span className="text-base font-semibold">{percent}%</span>
									<span className="text-xs opacity-80 mt-1">
										{formatPrice(calculateTipFromPercentage(percent))}
									</span>
								</Button>
							))}
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="customTip"
								className="text-sm font-medium text-slate-800"
							>
								Custom Amount
							</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
									$
								</span>
								<Input
									type="number"
									id="customTip"
									min="0"
									step="0.01"
									value={customTipInput}
									onChange={handleCustomTipChange}
									placeholder="0.00"
									className="pl-8 text-center border-2 border-slate-300 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4 pt-2">
							<Button
								variant="outline"
								onClick={handleSkip}
								size="lg"
								className="bg-white/70 hover:bg-slate-50/70 border-slate-300 backdrop-blur-sm"
							>
								No Tip
							</Button>
							<Button
								onClick={handleComplete}
								size="lg"
								className="bg-blue-600 hover:bg-blue-700 text-white backdrop-blur-sm"
								disabled={customTipInput && !isCustomAmountValid()}
							>
								{tipAmount > 0
									? `Add ${formatPrice(tipAmount)} Tip`
									: "Continue"}
							</Button>
						</div>
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
};

TipSelectionView.propTypes = {
	orderTotal: PropTypes.number.isRequired,
	onComplete: PropTypes.func,
};

export default TipSelectionView;
