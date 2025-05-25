"use client";

import { useMemo } from "react";
import PropTypes from "prop-types";
import { calculateCartTotals } from "../utils/cartCalculations";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tag, Clock, CreditCard, X } from "lucide-react";

/**
 * CartSummary Component
 *
 * Displays cart totals and action buttons with modern UI.
 * All original logic is preserved.
 */
export const CartSummary = ({
	cart,
	onHoldOrder,
	onCharge,
	canHoldOrder,
	orderDiscount,
	onShowDiscounts,
	onRemoveDiscount,
}) => {
	// --- ORIGINAL LOGIC (UNCHANGED) ---
	const { subtotal, taxAmount, total, discountAmount } = useMemo(() => {
		return calculateCartTotals(cart, orderDiscount);
	}, [cart, orderDiscount]);

	const isCartEmpty = cart.length === 0;
	// --- END OF ORIGINAL LOGIC ---

	return (
		<div className="bg-slate-50 border-t border-slate-200 p-4 space-y-4">
			{/* Calculation Summary */}
			<div className="space-y-3">
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Subtotal</span>
					<span className="font-medium">${subtotal.toFixed(2)}</span>
				</div>

				{orderDiscount && (
					<div className="flex justify-between text-sm">
						<div className="flex items-center gap-2">
							<Tag className="h-4 w-4 text-green-600" />
							<span className="text-green-600">
								Discount ({orderDiscount.name})
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={onRemoveDiscount}
								className="h-6 w-6 p-0"
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
						<span className="font-medium text-green-600">
							-${discountAmount.toFixed(2)}
						</span>
					</div>
				)}

				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Tax (8.13%)</span>
					<span className="font-medium">${taxAmount.toFixed(2)}</span>
				</div>

				<Separator />

				<div className="flex justify-between text-lg font-semibold">
					<span>Total</span>
					<span>${total.toFixed(2)}</span>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="grid grid-cols-3 gap-3">
				<Button
					variant="outline"
					onClick={onHoldOrder}
					disabled={!canHoldOrder || isCartEmpty}
					className="gap-2"
					size="sm"
				>
					<Clock className="h-4 w-4" />
					Hold
				</Button>

				<Button
					variant="outline"
					onClick={onShowDiscounts}
					disabled={isCartEmpty}
					className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
					size="sm"
				>
					<Tag className="h-4 w-4" />
					Discount
				</Button>

				<Button
					onClick={() => onCharge(total)}
					disabled={isCartEmpty}
					className="gap-2"
					size="sm"
				>
					<CreditCard className="h-4 w-4" />${total.toFixed(2)}
				</Button>
			</div>
		</div>
	);
};

CartSummary.propTypes = {
	cart: PropTypes.array.isRequired,
	onHoldOrder: PropTypes.func.isRequired,
	onCharge: PropTypes.func.isRequired,
	canHoldOrder: PropTypes.bool.isRequired,
	orderDiscount: PropTypes.object,
	onShowDiscounts: PropTypes.func.isRequired,
	onRemoveDiscount: PropTypes.func.isRequired,
};

CartSummary.displayName = "CartSummary";

export default CartSummary;
