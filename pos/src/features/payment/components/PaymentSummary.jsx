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
				<CardContent className="p-4 space-y-2">
					<div className="flex justify-between text-slate-600 text-sm">
						<span>Subtotal</span>
						<span className="font-medium">{formatPrice(subtotal)}</span>
					</div>

					{discountAmount > 0 && (
						<div className="flex justify-between text-emerald-600 text-sm">
							<span className="flex items-center gap-2">
								Discount
								<Badge
									variant="secondary"
									className="bg-emerald-100 text-emerald-700 text-xs"
								>
									Applied
								</Badge>
							</span>
							<span className="font-medium">
								-{formatPrice(discountAmount)}
							</span>
						</div>
					)}

					<div className="flex justify-between text-slate-600 text-sm">
						<span>Tax</span>
						<span className="font-medium">{formatPrice(taxAmount)}</span>
					</div>

					{surchargeAmount > 0 && (
						<div className="flex justify-between text-orange-600 text-sm">
							<span className="flex items-center gap-2">
								Surcharge
								<Badge
									variant="outline"
									className="border-orange-200 text-orange-700 text-xs"
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
						<div className="flex justify-between text-sky-600 text-sm">
							<span className="flex items-center gap-2">
								Tip
								<Badge
									variant="outline"
									className="border-sky-200 text-sky-700 text-xs"
								>
									Added
								</Badge>
							</span>
							<span className="font-medium">{formatPrice(tipAmount)}</span>
						</div>
					)}

					<Separator className="my-3" />

					<div className="flex justify-between text-lg font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">
						<span>Total Due</span>
						<span className="text-blue-700">{formatPrice(grandTotal)}</span>
					</div>

					{amountPaid > 0 && (
						<>
							<Separator className="my-2" />
							<div className="flex justify-between text-emerald-600 font-medium text-sm bg-emerald-50 px-3 py-2 rounded-lg">
								<span>Amount Paid</span>
								<span>{formatPrice(amountPaid)}</span>
							</div>
							<div className="flex justify-between text-blue-700 font-bold text-lg bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
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
