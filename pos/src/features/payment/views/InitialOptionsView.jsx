"use client";

import { motion } from "framer-motion";
import { Banknote, CreditCard, ArrowLeftRight } from "lucide-react";
import { paymentAnimations } from "../../../animations/paymentAnimations";
import PropTypes from "prop-types";
import { ScrollableViewWrapper } from "./ScrollableViewWrapper";
import { useCustomerFlow } from "../../customerDisplay/hooks/useCustomerFlow";
import { Button } from "@/components/ui/button";
// import {
// 	Card,
// 	CardDescription,
// 	CardHeader,
// 	CardTitle,
// } from "@/components/ui/card";

const { pageVariants, pageTransition } = paymentAnimations;

const commonMotionProps = {
	variants: pageVariants,
	initial: "enter",
	animate: "center",
	exit: "exit",
	transition: pageTransition,
};

export const InitialOptionsView = ({
	handleNavigation,
	state,
	remainingAmount,
}) => {
	const { startFlow, flowActive } = useCustomerFlow();

	const handlePaymentMethodSelect = (method) => {
		// Start customer flow if selecting cash payment
		if (method === "Cash" && !flowActive) {
			startFlow(state.orderId, "cash", remainingAmount);
		}

		// Navigate to the payment view
		handleNavigation(method, 1);
	};

	const paymentMethods = [
		{
			id: "Cash",
			title: "Pay with Cash",
			description: "Accept cash payment with change calculation",
			icon: Banknote,
			gradient: "from-green-50 to-emerald-100",
			iconColor: "text-green-600",
		},
		{
			id: "Credit",
			title: "Pay with Credit Card",
			description: "Process card payment with terminal",
			icon: CreditCard,
			gradient: "from-blue-50 to-blue-100",
			iconColor: "text-blue-600",
		},
		{
			id: "Split",
			title: "Split Payment",
			description: "Divide payment across multiple methods",
			icon: ArrowLeftRight,
			gradient: "from-purple-50 to-purple-100",
			iconColor: "text-purple-600",
		},
	];

	return (
		<motion.div
			key="initial-options"
			className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100"
			{...commonMotionProps}
		>
			<ScrollableViewWrapper className="space-y-6 p-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h3 className="text-2xl font-semibold text-slate-800">
						Select Payment Method
					</h3>
					<p className="text-slate-600">
						Choose how you would like to complete this transaction
					</p>
				</div>

				{/* Payment Method Cards
				<div className="space-y-4">
					{paymentMethods.map((method, index) => (
						<motion.div
							key={method.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.1 }}
						>
							<Card
								className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-r ${method.gradient} border-0`}
								onClick={() => handlePaymentMethodSelect(method.id)}
							>
								<CardHeader className="pb-3">
									<div className="flex items-center gap-4">
										<div
											className={`p-3 rounded-full bg-white/80 ${method.iconColor}`}
										>
											<method.icon className="h-6 w-6" />
										</div>
										<div className="flex-1">
											<CardTitle className="text-lg text-slate-800">
												{method.title}
											</CardTitle>
											<CardDescription className="text-slate-600 mt-1">
												{method.description}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
							</Card>
						</motion.div>
					))}
				</div> */}

				{/* Alternative Button Layout */}
				<div className="pt-4 space-y-3">
					<div className="grid grid-cols-1 gap-3">
						{paymentMethods.map((method) => (
							<Button
								key={`btn-${method.id}`}
								onClick={() => handlePaymentMethodSelect(method.id)}
								variant="outline"
								size="lg"
								className="justify-start gap-3 h-14"
							>
								<method.icon className={`h-5 w-5 ${method.iconColor}`} />
								{method.title}
							</Button>
						))}
					</div>
				</div>
			</ScrollableViewWrapper>
		</motion.div>
	);
};

InitialOptionsView.propTypes = {
	state: PropTypes.shape({
		orderId: PropTypes.number.isRequired,
		direction: PropTypes.number.isRequired,
		paymentMethod: PropTypes.string,
		splitMode: PropTypes.bool.isRequired,
		amountPaid: PropTypes.number.isRequired,
		transactions: PropTypes.arrayOf(
			PropTypes.shape({
				method: PropTypes.oneOf(["cash", "credit"]).isRequired,
				amount: PropTypes.number.isRequired,
				cashTendered: PropTypes.number,
				change: PropTypes.number,
			})
		).isRequired,
		customAmount: PropTypes.string.isRequired,
	}).isRequired,
	handleNavigation: PropTypes.func.isRequired,
	remainingAmount: PropTypes.number.isRequired,
};

export default InitialOptionsView;
