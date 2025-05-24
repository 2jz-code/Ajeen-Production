import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PropTypes from "prop-types";

export const PaymentStatus = ({ error, isProcessing }) => {
	if (!error && !isProcessing) return null;

	return (
		<motion.div
			className="mx-4 mb-4"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Alert
				variant={error ? "destructive" : "default"}
				className="shadow-sm"
			>
				<div className="flex items-center gap-2">
					{error ? (
						<AlertCircle className="h-4 w-4" />
					) : (
						<Loader2 className="h-4 w-4 animate-spin" />
					)}
					<AlertDescription className="font-medium">
						{error || "Processing payment..."}
					</AlertDescription>
				</div>
			</Alert>
		</motion.div>
	);
};

PaymentStatus.propTypes = {
	error: PropTypes.string,
	isProcessing: PropTypes.bool,
};
