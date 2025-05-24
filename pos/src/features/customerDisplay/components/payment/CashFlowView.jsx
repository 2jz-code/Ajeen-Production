import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils";
import { Banknote, CheckCircle, Clock, AlertTriangle, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * CashFlowView Component
 * Displays cash payment progress on the customer display.
 */
const CashFlowView = ({ orderData, cashData, onComplete, isComplete }) => {
	const [stage, setStage] = useState("processing");

	const {
		subtotal = 0,
		tax = 0,
		total = 0,
		discountAmount = 0,
		isSplitPayment = false,
		originalTotal,
	} = orderData || {};

	const { cashTendered = 0, change = 0, amountPaid = 0 } = cashData || {};

	const effectiveTotal = isSplitPayment ? originalTotal ?? total : total;
	const remainingAmount = Math.max(
		0,
		effectiveTotal - amountPaid - total + change
	);
	const isFullyPaid = remainingAmount < 0.01;

	useEffect(() => {
		if (isComplete && stage !== "complete") {
			setStage("complete");
		} else if (!isComplete && stage === "complete") {
			setStage("processing");
		}
	}, [isComplete, stage]);

	useEffect(() => {
		let timerId = null;
		if (stage === "complete" && onComplete && cashData) {
			timerId = setTimeout(() => {
				onComplete({
					status: "success",
					method: "cash",
					timestamp: new Date().toISOString(),
					cashTendered: cashTendered,
					changeGiven: change,
					amountPaid: total,
				});
			}, 2000);
		}
		return () => clearTimeout(timerId);
	}, [stage, onComplete, cashData, total, change, cashTendered]);

	const variants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.4, ease: "easeOut" },
		},
		exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
	};

	return (
		<motion.div
			key="cashflow-container"
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 md:p-8"
		>
			<AnimatePresence mode="wait">
				{stage === "processing" ? (
					<motion.div
						key="processing"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<div className="pb-4">
							<div className="flex justify-center mb-4">
								{" "}
								{/* Icon centered with flex */}
								<Banknote className="h-16 w-16 text-emerald-500" />
							</div>
							<div className="text-center">
								{" "}
								{/* Title/subtitle centered */}
								<h2 className="text-3xl font-bold tracking-tight text-slate-900">
									Cash Payment
								</h2>
								<p className="text-lg text-slate-600">
									{isSplitPayment
										? "Split Payment Details"
										: "Please provide payment to cashier"}
								</p>
							</div>
						</div>

						<div className="space-y-6">
							<Card className="border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm">
								<CardContent className="p-4 space-y-3">
									<div className="flex justify-between text-slate-600">
										<span>Subtotal</span>
										<span className="font-medium text-slate-800">
											{formatPrice(subtotal)}
										</span>
									</div>
									{discountAmount > 0 && (
										<div className="flex justify-between text-emerald-600">
											<span className="flex items-center gap-2">
												<Tag className="h-4 w-4" />
												Discount
											</span>
											<span className="font-medium">
												-{formatPrice(discountAmount)}
											</span>
										</div>
									)}
									<div className="flex justify-between text-slate-600">
										<span>Tax</span>
										<span className="font-medium text-slate-800">
											{formatPrice(tax)}
										</span>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="font-semibold text-slate-900">
											Amount Due Now
										</span>
										<span className="text-xl font-bold text-blue-600">
											{formatPrice(total)}
										</span>
									</div>
									{isSplitPayment && originalTotal != null && (
										<p className="text-xs text-slate-500 text-right">
											(Original Total: {formatPrice(originalTotal)})
										</p>
									)}
								</CardContent>
							</Card>

							<Card className="border-emerald-200 bg-emerald-50/70 backdrop-blur-sm shadow-sm">
								<CardContent className="p-4">
									{cashTendered > 0 ? (
										<div className="space-y-3 text-emerald-800">
											<div className="flex justify-between">
												<span className="font-medium">Tendered:</span>
												<span className="font-semibold">
													{formatPrice(cashTendered)}
												</span>
											</div>
											{(change > 0 || isFullyPaid) && (
												<>
													<Separator className="bg-emerald-200" />
													<div className="flex justify-between">
														<span className="font-medium">Change Due:</span>
														<span className="font-semibold">
															{formatPrice(change)}
														</span>
													</div>
												</>
											)}
										</div>
									) : (
										<div className="flex items-center justify-center text-emerald-700">
											<Clock className="mr-2 h-6 w-6 animate-pulse" />
											<span className="font-medium">Awaiting Cash...</span>
										</div>
									)}
								</CardContent>
							</Card>

							{isSplitPayment && !isFullyPaid && remainingAmount > 0.01 && (
								<Alert className="bg-amber-50/70 border-amber-300 text-amber-700 backdrop-blur-sm">
									<AlertTriangle className="h-4 w-4 text-amber-600" />
									<AlertDescription>
										Remaining Order Total: {formatPrice(remainingAmount)}
									</AlertDescription>
								</Alert>
							)}
						</div>
					</motion.div>
				) : (
					<motion.div
						key="complete"
						className="w-full max-w-md"
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="exit"
					>
						<div className="pb-4">
							<div className="flex justify-center mb-4">
								{" "}
								{/* Icon centered with flex */}
								<CheckCircle className="h-20 w-20 text-green-500" />
							</div>
							<div className="text-center">
								{" "}
								{/* Title/subtitle centered */}
								<h2 className="text-3xl font-bold text-slate-900">
									Payment Complete
								</h2>
								<p className="text-lg text-slate-600">Thank you!</p>
							</div>
						</div>

						<div>
							<Card className="border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm">
								<CardContent className="p-4 space-y-3">
									<div className="flex justify-between text-slate-600">
										<span>Amount Paid:</span>
										<span className="font-medium text-slate-800">
											{formatPrice(total)}
										</span>
									</div>
									<div className="flex justify-between text-slate-600">
										<span>Cash Tendered:</span>
										<span className="font-medium text-slate-800">
											{formatPrice(cashTendered)}
										</span>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="font-semibold text-slate-900">
											Change Given:
										</span>
										<span className="font-semibold text-emerald-600">
											{formatPrice(change)}
										</span>
									</div>
								</CardContent>
							</Card>

							<p className="mt-6 text-base text-slate-500 text-center">
								Your receipt is printing.
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};

CashFlowView.propTypes = {
	orderData: PropTypes.shape({
		subtotal: PropTypes.number,
		tax: PropTypes.number,
		total: PropTypes.number,
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
	}),
	cashData: PropTypes.shape({
		cashTendered: PropTypes.number,
		change: PropTypes.number,
		amountPaid: PropTypes.number,
	}),
	onComplete: PropTypes.func,
	isComplete: PropTypes.bool,
};

export default CashFlowView;
