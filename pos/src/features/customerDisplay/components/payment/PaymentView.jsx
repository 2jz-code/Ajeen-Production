import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useTerminalSimulation } from "../../hooks/useTerminalSimulation";
import { formatPrice } from "../../../../utils/numberUtils";
import {
	CheckCircle,
	AlertCircle,
	CreditCard,
	RotateCcw,
	Wifi,
	Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * PaymentView Component
 * Displays payment status and amount during card transactions on the customer display.
 */
const PaymentView = ({ orderData, onComplete }) => {
	const [isInitiating, setIsInitiating] = useState(true);
	const { processPayment, paymentStatus, paymentResult, error, readerInfo } =
		useTerminalSimulation();
	const hasStartedPaymentRef = useRef(false);
	const isMountedRef = useRef(true);

	const tipAmount = orderData?.tipAmount || 0;
	const baseTotal = typeof orderData?.total === "number" ? orderData.total : 0;
	const finalTotal = baseTotal + tipAmount;
	const orderId = orderData?.orderId;

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (
			hasStartedPaymentRef.current ||
			!orderData ||
			!orderId ||
			!isInitiating ||
			!isMountedRef.current
		) {
			return;
		}

		const timer = setTimeout(() => {
			if (!isMountedRef.current) return;
			setIsInitiating(false);
			const dataForSimulation = {
				total: baseTotal,
				tipAmount: tipAmount,
				orderId: orderId,
				isSplitPayment: orderData?.isSplitPayment,
				originalTotal: orderData?.originalTotal,
				items: orderData?.items,
				discountAmount: orderData?.discountAmount,
				orderDiscount: orderData?.orderDiscount,
			};
			hasStartedPaymentRef.current = true;
			processPayment(dataForSimulation);
		}, 1500);

		return () => clearTimeout(timer);
	}, [orderData, orderId, baseTotal, tipAmount, processPayment, isInitiating]);

	useEffect(() => {
		if (paymentStatus === "success" && paymentResult && onComplete) {
			if (!isMountedRef.current) return;
			const timer = setTimeout(() => {
				if (!isMountedRef.current) return;
				const completionData = {
					status: "success",
					...paymentResult,
					orderId,
				};
				onComplete(completionData);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [paymentStatus, paymentResult, onComplete, orderId]);

	useEffect(() => {
		if (paymentStatus === "error" && isMountedRef.current) {
			hasStartedPaymentRef.current = false;
		}
	}, [paymentStatus]);

	const handleRetry = () => {
		if (!orderData || !orderId || !isMountedRef.current || isInitiating) return;
		setIsInitiating(true);
		hasStartedPaymentRef.current = false;
	};

	const getStatusDisplay = () => {
		// ... (getStatusDisplay function remains the same)
		switch (paymentStatus) {
			case "success":
				return {
					Icon: CheckCircle,
					text: "Payment Successful",
					color: "text-green-500",
					variant: "success",
					message: paymentResult?.cardInfo
						? `${paymentResult.cardInfo.brand} •••• ${paymentResult.cardInfo.last4}`
						: "Approved",
				};
			case "error":
				return {
					Icon: AlertCircle,
					text: "Payment Failed",
					color: "text-red-500",
					variant: "destructive",
					message: error || "An unknown error occurred.",
				};
			case "processing":
			case "processing_intent":
				return {
					Icon: Cpu,
					text: "Processing Payment...",
					color: "text-blue-500",
					variant: "default",
					message: "Please wait...",
					animate: true,
				};
			case "waiting_for_card":
				return {
					Icon: Wifi,
					text: "Complete Payment on Terminal",
					color: "text-blue-500",
					variant: "default",
					message: `Follow instructions on ${readerInfo?.label || "terminal"}.`,
					animate: true,
				};
			case "connecting":
			case "reader_check":
			case "creating_intent":
			case "idle":
			default:
				return {
					Icon: CreditCard,
					text: "Preparing Payment",
					color: "text-slate-400",
					variant: "secondary",
					message: "Please wait, connecting...",
				};
		}
	};

	const { Icon, text, color, message, animate, variant } = getStatusDisplay();

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
		exit: { opacity: 0 },
	};

	const itemVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { type: "spring", stiffness: 300, damping: 20 },
		},
	};

	return (
		<motion.div
			key="payment"
			className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 md:p-8 text-center" // Padding on root
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			transition={{ duration: 0.3 }}
		>
			<div className="w-full max-w-md">
				{" "}
				{/* Simple div for max-width and centering content */}
				<motion.div
					key={paymentStatus} // Animate presence of icon based on status change
					variants={itemVariants}
					className="mb-6"
				>
					<Icon
						className={`mx-auto h-20 w-20 ${color} ${
							animate ? "animate-pulse" : ""
						}`}
					/>
				</motion.div>
				<motion.h1
					variants={itemVariants}
					className="mb-4 text-3xl font-bold text-slate-900"
				>
					{text}
				</motion.h1>
				<motion.div
					variants={itemVariants}
					className="mb-6"
				>
					<div className="text-4xl font-bold text-blue-600 mb-2">
						{formatPrice(finalTotal)}
					</div>
					{tipAmount > 0 && (
						<Badge
							variant="secondary"
							className="bg-blue-100 text-blue-700"
						>
							Includes {formatPrice(tipAmount)} tip
						</Badge>
					)}
				</motion.div>
				<motion.div
					variants={itemVariants}
					className="mb-6"
				>
					{/* Alert background will make it stand out, this is likely desired for alerts */}
					<Alert
						variant={variant === "destructive" ? "destructive" : "default"}
						className={`${
							variant === "destructive"
								? "bg-red-50/80 border-red-300"
								: "bg-blue-50/80 border-blue-300"
						} backdrop-blur-sm`}
					>
						<AlertDescription className="text-center">
							{message}
						</AlertDescription>
					</Alert>
				</motion.div>
				{paymentStatus === "error" && (
					<motion.div variants={itemVariants}>
						<Button
							onClick={handleRetry}
							className="w-full backdrop-blur-sm"
							size="lg"
						>
							<RotateCcw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
					</motion.div>
				)}
			</div>
		</motion.div>
	);
};

PaymentView.propTypes = {
	orderData: PropTypes.shape({
		total: PropTypes.number,
		tipAmount: PropTypes.number,
		orderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		isSplitPayment: PropTypes.bool,
		originalTotal: PropTypes.number,
		items: PropTypes.array,
		discountAmount: PropTypes.number,
		orderDiscount: PropTypes.object,
	}).isRequired,
	onComplete: PropTypes.func,
};

export default PaymentView;
