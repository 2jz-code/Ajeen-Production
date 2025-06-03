import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "../../../../utils/numberUtils";
import {
	BadgeCheckIcon as CheckBadge,
	CreditCard,
	Calendar,
	Clock,
	Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * ReceiptView Component
 * Displays confirmation message and receipt details after payment.
 */
const ReceiptView = ({ orderData, paymentData, onComplete, paymentMethod }) => {
	const [showDetails, setShowDetails] = useState(false);

	const tipAmount = orderData?.tipAmount || 0;
	// const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0;
	// const finalTotal =
	// 	(orderData?.isSplitPayment ? orderData?.originalTotal : baseTotal) +
	// 	tipAmount;

	const getPaymentInfo = () => {
		if (paymentMethod === "cash") return { methodDisplay: "Cash", id: "N/A" };
		if (paymentMethod === "credit" && paymentData?.cardInfo) {
			const brand = paymentData.cardInfo.brand || "Card";
			const last4 = paymentData.cardInfo.last4;
			return {
				methodDisplay: `${brand} ${last4 ? `•••• ${last4}` : ""}`,
				id: paymentData.transactionId || "N/A",
			};
		}
		if (paymentMethod === "split" || orderData?.isSplitPayment) {
			const lastTx = paymentData?.transactions?.slice(-1)[0];
			if (lastTx?.method === "credit" && lastTx?.cardInfo) {
				return {
					methodDisplay: `Split (${lastTx.cardInfo.brand} •••• ${lastTx.cardInfo.last4})`,
					id: lastTx.transactionId || "Multiple",
				};
			}
			return { methodDisplay: "Split Payment", id: "Multiple" };
		}
		return {
			methodDisplay: paymentMethod || "Other",
			id: paymentData?.transactionId || "N/A",
		};
	};

	const { methodDisplay, id: transactionId } = getPaymentInfo();
	const paymentTimestamp = paymentData?.timestamp
		? new Date(paymentData.timestamp)
		: new Date();

	useEffect(() => {
		let detailsTimerId = null;
		let completeTimerId = null;

		completeTimerId = setTimeout(() => {
			if (onComplete) {
				onComplete({ status: "complete", timestamp: new Date().toISOString() });
			}
		}, 150);

		detailsTimerId = setTimeout(() => {
			setShowDetails(true);
		}, 1800);

		return () => {
			clearTimeout(detailsTimerId);
			clearTimeout(completeTimerId);
		};
	}, [onComplete]);

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.4 } },
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

	const detailsVariants = {
		hidden: { opacity: 0, height: 0 },
		visible: {
			opacity: 1,
			height: "auto",
			transition: { duration: 0.5, ease: "easeOut", delay: 0.2 },
		},
	};

	return (
		<motion.div
			key="receipt"
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6 md:p-8"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			<div className="w-full max-w-md">
				{/* Header Section */}
				<div className="pb-4">
					<motion.div
						className="flex justify-center mb-4" // Icon centered with flex
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 15,
							delay: 0.2,
						}}
					>
						<CheckBadge className="h-20 w-20 text-green-500" />
					</motion.div>

					<motion.div
						variants={itemVariants(0.4)}
						className="text-center"
					>
						{" "}
						{/* Title/subtitle centered */}
						<h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
							Thank You!
						</h2>
						<p className="text-lg text-slate-600">
							Your payment was successful.
						</p>
					</motion.div>
				</div>

				{/* Content Section */}
				<div className="space-y-6">
					{tipAmount > 0 && (
						<motion.div
							variants={itemVariants(0.5)}
							className="text-center"
						>
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-700"
							>
								Includes {formatPrice(tipAmount)} tip
							</Badge>
						</motion.div>
					)}

					<AnimatePresence>
						{showDetails && (
							<motion.div
								variants={detailsVariants}
								initial="hidden"
								animate="visible"
								className="overflow-hidden"
							>
								<Card className="border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm">
									<CardContent className="p-4 space-y-3">
										<div className="flex justify-between items-center">
											<span className="flex items-center gap-2 text-slate-500">
												<CreditCard className="h-4 w-4" />
												Method:
											</span>
											<span className="font-medium text-slate-700">
												{methodDisplay}
											</span>
										</div>

										<div className="flex justify-between items-center">
											<span className="flex items-center gap-2 text-slate-500">
												<Calendar className="h-4 w-4" />
												Date:
											</span>
											<span className="font-medium text-slate-700">
												{paymentTimestamp.toLocaleDateString()}
											</span>
										</div>

										<div className="flex justify-between items-center">
											<span className="flex items-center gap-2 text-slate-500">
												<Clock className="h-4 w-4" />
												Time:
											</span>
											<span className="font-medium text-slate-700">
												{paymentTimestamp.toLocaleTimeString([], {
													hour: "numeric",
													minute: "2-digit",
													hour12: true,
												})}
											</span>
										</div>

										<Separator />

										<div className="flex justify-between items-center">
											<span className="flex items-center gap-2 text-slate-500">
												<Hash className="h-4 w-4" />
												Reference:
											</span>
											<span
												className="max-w-[150px] truncate font-mono text-xs font-medium text-slate-700"
												title={transactionId}
											>
												{transactionId}
											</span>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>

					<motion.p
						variants={itemVariants(showDetails ? 0.8 : 1.0)}
						className="text-base text-slate-500 text-center"
					>
						Have a great day!
					</motion.p>
				</div>
			</div>
		</motion.div>
	);
};

ReceiptView.propTypes = {
	orderData: PropTypes.shape({
		total: PropTypes.number,
		tipAmount: PropTypes.number,
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
	}),
	paymentData: PropTypes.shape({
		transactionId: PropTypes.string,
		cardInfo: PropTypes.shape({
			brand: PropTypes.string,
			last4: PropTypes.string,
		}),
		amount: PropTypes.number,
		timestamp: PropTypes.string,
		transactions: PropTypes.array,
	}),
	paymentMethod: PropTypes.string,
	onComplete: PropTypes.func,
};

export default ReceiptView;
