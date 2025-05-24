import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropTypes from "prop-types";

export const PaymentHeader = ({ onBack, title = "Payment" }) => (
	<motion.header
		className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 flex items-center justify-between shadow-sm" // Reduced px from 6 to 4, py from 4 to 2.5
		initial={{ opacity: 0, y: -20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.3 }}
	>
		<div className="flex items-center gap-2">
			{" "}
			{/* Reduced gap from 3 to 2 */}
			<div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>{" "}
			{/* Reduced width and height */}
			<h2 className="text-lg font-semibold text-slate-800">{title}</h2>{" "}
			{/* Reduced text from xl to lg */}
		</div>
		<Button
			onClick={onBack}
			variant="ghost"
			size="sm" // Retained sm size, but it's already compact
			className="text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 transition-all duration-200 px-2 py-1" // Ensured padding is minimal for sm
		>
			<ArrowLeft className="h-4 w-4 mr-1.5" /> {/* Reduced mr from 2 to 1.5 */}
			Back
		</Button>
	</motion.header>
);

PaymentHeader.propTypes = {
	onBack: PropTypes.func.isRequired,
	title: PropTypes.string,
};
