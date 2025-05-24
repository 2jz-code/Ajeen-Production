"use client";

import { motion } from "framer-motion";
import { CheckCircle, Printer, X, Banknote } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import customerDisplayManager from "../../../features/customerDisplay/utils/windowManager";
import {
	printReceiptWithAgent,
	openDrawerWithAgent,
} from "../../../api/services/localHardwareService";
import { toast } from "react-toastify";
import { formatPrice } from "../../../utils/numberUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const { pageVariants, pageTransition } = paymentAnimations;

export const CompletionView = ({ onStartNewOrder, paymentResult, state }) => {
	const actualReceiptPayload = paymentResult;

	const isCashTransactionInPayload =
		actualReceiptPayload?.payment?.transactions?.some(
			(tx) => tx.method === "cash"
		);
	const cashDetailsFromPayload =
		actualReceiptPayload?.payment?.transactions?.find(
			(tx) => tx.method === "cash"
		)?.metadata;

	const involvedCash =
		paymentResult?.involvedCash ?? isCashTransactionInPayload ?? false;
	const totalCashTendered =
		paymentResult?.totalCashTendered ??
		cashDetailsFromPayload?.cashTendered ??
		0;
	const totalChangeGiven =
		paymentResult?.totalChangeGiven ?? cashDetailsFromPayload?.change ?? 0;

	const [decisionMade, setDecisionMade] = useState(true);
	const [isPrinting, setIsPrinting] = useState(false);

	useEffect(() => {
		if (actualReceiptPayload && Object.keys(actualReceiptPayload).length > 0) {
			setDecisionMade(false);
		} else {
			setDecisionMade(true);
		}
	}, [actualReceiptPayload]);

	useEffect(() => {
		const resetTimer = setTimeout(() => {
			try {
				if (
					customerDisplayManager.displayWindow &&
					!customerDisplayManager.displayWindow.closed
				) {
					customerDisplayManager.showWelcome();
				} else {
					console.warn(
						"POS CompletionView: Customer display window not accessible for reset."
					);
				}
			} catch (err) {
				console.error(
					"POS CompletionView: Error resetting customer display:",
					err
				);
			}
		}, 4000);

		return () => {
			clearTimeout(resetTimer);
		};
	}, []);

	useEffect(() => {
		if (involvedCash) {
			openDrawerWithAgent().catch((err) => {
				console.error("CompletionView: Error from openDrawerWithAgent:", err);
			});
		}
	}, [involvedCash]);

	const handlePrint = useCallback(async () => {
		if (!actualReceiptPayload || isPrinting) return;
		setIsPrinting(true);
		try {
			const openDrawerForPrint =
				state?.paymentMethod === "cash" ||
				(state?.splitMode &&
					state.transactions?.some((tx) => tx.method === "cash"));

			const printResult = await printReceiptWithAgent(
				actualReceiptPayload,
				openDrawerForPrint
			);
			if (!printResult.success) {
				console.warn(
					"CompletionView: Print command failed:",
					printResult.message
				);
			}
			setDecisionMade(true);
		} catch (err) {
			console.error("CompletionView: Error during printing:", err);
			toast.error("An error occurred while trying to print.");
			setDecisionMade(true);
		} finally {
			setIsPrinting(false);
		}
	}, [
		actualReceiptPayload,
		isPrinting,
		state?.paymentMethod,
		state?.splitMode,
		state?.transactions,
		involvedCash,
	]);

	const handleSkip = useCallback(() => {
		if (isPrinting) return;
		setDecisionMade(true);
	}, [isPrinting]);

	const handleStartNew = async () => {
		try {
			if (
				customerDisplayManager.displayWindow &&
				!customerDisplayManager.displayWindow.closed
			) {
				customerDisplayManager.showWelcome();
			}
		} catch (err) {
			console.error("Error sending welcome command:", err);
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
		await onStartNewOrder();
	};

	return (
		<motion.div
			key="completion"
			className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-100"
			variants={pageVariants}
			initial="enter"
			animate="center"
			exit="exit"
			transition={pageTransition}
		>
			<ScrollableViewWrapper className="space-y-6 p-6">
				<div className="flex flex-col items-center justify-center space-y-6 py-8 text-center">
					{/* Success Icon */}
					<motion.div
						className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg"
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: "spring", duration: 0.6 }}
					>
						<CheckCircle className="w-14 h-14 text-emerald-600" />
					</motion.div>

					{/* Success Message */}
					<div className="space-y-2">
						<h2 className="text-3xl font-bold text-slate-800">
							Payment Complete!
						</h2>
						<p className="text-slate-600 max-w-md">
							The transaction has been processed successfully.
						</p>
					</div>

					{/* Cash Details */}
					{involvedCash && totalChangeGiven >= 0 && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="w-full max-w-sm"
						>
							<Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100">
								<CardContent className="pt-6">
									<div className="space-y-3">
										<div className="flex justify-between items-center">
											<span className="flex items-center gap-2 font-medium text-emerald-800">
												<Banknote className="h-4 w-4" />
												Cash Tendered:
											</span>
											<span className="font-semibold text-emerald-900">
												{formatPrice(totalCashTendered)}
											</span>
										</div>
										<Separator className="bg-emerald-200" />
										<div className="flex justify-between items-center">
											<span className="font-bold text-lg text-emerald-900">
												Change Due:
											</span>
											<span className="font-bold text-lg text-emerald-900">
												{formatPrice(totalChangeGiven)}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					)}

					{/* Print Options */}
					{!decisionMade &&
						actualReceiptPayload &&
						Object.keys(actualReceiptPayload).length > 0 && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="w-full max-w-md space-y-4"
							>
								<Card>
									<CardContent className="pt-6">
										<div className="space-y-4">
											<p className="text-slate-700 font-medium text-center">
												Print Receipt?
											</p>
											<div className="flex flex-col sm:flex-row gap-3">
												<Button
													onClick={handlePrint}
													disabled={isPrinting}
													className="flex-1"
													size="lg"
												>
													<Printer className="mr-2 h-4 w-4" />
													{isPrinting ? "Printing..." : "Print Receipt"}
												</Button>
												<Button
													variant="outline"
													onClick={handleSkip}
													disabled={isPrinting}
													className="flex-1"
													size="lg"
												>
													<X className="mr-2 h-4 w-4" />
													Skip
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						)}

					{/* Start New Order */}
					{decisionMade && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="w-full max-w-md"
						>
							<Button
								onClick={handleStartNew}
								className="w-full py-6 text-lg"
								size="lg"
							>
								Start New Order
							</Button>
						</motion.div>
					)}
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

CompletionView.propTypes = {
	onStartNewOrder: PropTypes.func.isRequired,
	paymentResult: PropTypes.object,
	state: PropTypes.object,
};

export default CompletionView;
