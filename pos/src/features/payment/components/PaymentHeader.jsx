import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropTypes from "prop-types";

export const PaymentHeader = ({ onBack, title = "Payment" }) => (
	<motion.header
		className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between shadow-sm"
		initial={{ opacity: 0, y: -20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.3 }}
	>
		<div className="flex items-center gap-3">
			<div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
			<h2 className="text-xl font-semibold text-slate-800">{title}</h2>
		</div>
		<Button
			onClick={onBack}
			variant="ghost"
			size="sm"
			className="text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 transition-all duration-200"
		>
			<ArrowLeft className="h-4 w-4 mr-2" />
			Back
		</Button>
	</motion.header>
);

PaymentHeader.propTypes = {
	onBack: PropTypes.func.isRequired,
	title: PropTypes.string,
};
