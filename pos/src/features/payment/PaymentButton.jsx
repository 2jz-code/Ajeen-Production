"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import PropTypes from "prop-types";

const buttonVariants = {
	hover: { scale: 1.02 },
	tap: { scale: 0.98 },
	disabled: { opacity: 0.5 },
};

export const PaymentButton = ({
	icon: Icon,
	label,
	onClick,
	variant = "default",
	disabled = false,
	className = "",
}) => {
	const getVariantStyles = () => {
		const variants = {
			default:
				"bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm",
			primary:
				"bg-blue-600 text-white hover:bg-blue-700 shadow-sm border-blue-600",
			danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm border-red-600",
			success:
				"bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-emerald-600",
		};
		return variants[variant] || variants.default;
	};

	return (
		<motion.div
			variants={buttonVariants}
			whileHover={!disabled ? "hover" : undefined}
			whileTap={!disabled ? "tap" : undefined}
			animate={disabled ? "disabled" : "active"}
		>
			<Button
				onClick={onClick}
				disabled={disabled}
				className={`w-full h-auto px-4 py-3 font-medium transition-all duration-200 ${getVariantStyles()} ${className}`}
				variant="outline"
			>
				<div className="flex items-center justify-center gap-3">
					{Icon && (
						<Icon
							className={`h-5 w-5 ${
								variant === "default" ? "text-slate-500" : "text-current"
							}`}
						/>
					)}
					<span>{label}</span>
				</div>
			</Button>
		</motion.div>
	);
};

PaymentButton.propTypes = {
	icon: PropTypes.elementType,
	label: PropTypes.string.isRequired,
	onClick: PropTypes.func.isRequired,
	variant: PropTypes.oneOf(["default", "primary", "danger", "success"]),
	disabled: PropTypes.bool,
	className: PropTypes.string,
};

export default PaymentButton;
