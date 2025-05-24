import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import PropTypes from "prop-types";
import { formatPrice } from "../../../utils/numberUtils";

export const PaymentSummary = ({
	subtotal,
	taxAmount,
	discountAmount,
	surchargeAmount,
	tipAmount,
	grandTotal,
	amountPaid,
	remainingAfterPayments,
}) => {
	return (
		<motion.footer
			className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card className="rounded-none border-0 shadow-none">
				<CardContent className="p-2.5 space-y-1.5">
					{" "}
					{/* Reduced p from 4 to 2.5, space-y from 2 to 1.5 */}
					{/* Subtotal, Discount, Tax, Surcharge, Tip lines */}
					<div className="flex justify-between text-slate-600 text-xs">
						{" "}
						{/* Font size from sm to xs */}
						<span>Subtotal</span>
						<span className="font-medium">{formatPrice(subtotal)}</span>
					</div>
					{discountAmount > 0 && (
						<div className="flex justify-between text-emerald-600 text-xs">
							{" "}
							{/* Font size from sm to xs */}
							<span className="flex items-center gap-1.5">
								{" "}
								{/* Gap from 2 to 1.5 */}
								Discount
								<Badge
									variant="secondary"
									className="bg-emerald-100 text-emerald-700 text-xs px-1 py-0.5" // Ensure badge padding is minimal
								>
									Applied
								</Badge>
							</span>
							<span className="font-medium">
								-{formatPrice(discountAmount)}
							</span>
						</div>
					)}
					<div className="flex justify-between text-slate-600 text-xs">
						{" "}
						{/* Font size from sm to xs */}
						<span>Tax</span>
						<span className="font-medium">{formatPrice(taxAmount)}</span>
					</div>
					{surchargeAmount > 0 && (
						<div className="flex justify-between text-orange-600 text-xs">
							{" "}
							{/* Font size from sm to xs */}
							<span className="flex items-center gap-1.5">
								{" "}
								{/* Gap from 2 to 1.5 */}
								Surcharge
								<Badge
									variant="outline"
									className="border-orange-200 text-orange-700 text-xs px-1 py-0.5" // Ensure badge padding is minimal
								>
									Card Fee
								</Badge>
							</span>
							<span className="font-medium">
								{formatPrice(surchargeAmount)}
							</span>
						</div>
					)}
					{tipAmount > 0 && (
						<div className="flex justify-between text-sky-600 text-xs">
							{" "}
							{/* Font size from sm to xs */}
							<span className="flex items-center gap-1.5">
								{" "}
								{/* Gap from 2 to 1.5 */}
								Tip
								<Badge
									variant="outline"
									className="border-sky-200 text-sky-700 text-xs px-1 py-0.5" // Ensure badge padding is minimal
								>
									Added
								</Badge>
							</span>
							<span className="font-medium">{formatPrice(tipAmount)}</span>
						</div>
					)}
					<Separator className="my-1.5" /> {/* Margin from my-3 to my-1.5 */}
					{/* Total Due Section */}
					<div className="flex justify-between text-base font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-md">
						{" "}
						{/* Font text-lg to text-base, px-3 py-2 to px-2.5 py-1.5, rounded-lg to md */}
						<span>Total Due</span>
						<span className="text-blue-700">{formatPrice(grandTotal)}</span>
					</div>
					{amountPaid > 0 && (
						<>
							<Separator className="my-1" /> {/* Margin from my-2 to my-1 */}
							{/* Amount Paid Section */}
							<div className="flex justify-between text-emerald-600 font-medium text-xs bg-emerald-50 px-2.5 py-1.5 rounded-md">
								{" "}
								{/* Font sm to xs, px-3 py-2 to px-2.5 py-1.5, rounded-lg to md */}
								<span>Amount Paid</span>
								<span>{formatPrice(amountPaid)}</span>
							</div>
							{/* Remaining Section */}
							<div className="flex justify-between text-blue-700 font-bold text-base bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-200">
								{" "}
								{/* Font text-lg to text-base, px-3 py-2 to px-2.5 py-1.5, rounded-lg to md */}
								<span>REMAINING</span>
								<span>{formatPrice(remainingAfterPayments)}</span>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</motion.footer>
	);
};

PaymentSummary.propTypes = {
	subtotal: PropTypes.number.isRequired,
	taxAmount: PropTypes.number.isRequired,
	discountAmount: PropTypes.number.isRequired,
	surchargeAmount: PropTypes.number.isRequired,
	tipAmount: PropTypes.number.isRequired,
	grandTotal: PropTypes.number.isRequired,
	amountPaid: PropTypes.number.isRequired,
	remainingAfterPayments: PropTypes.number.isRequired,
};
