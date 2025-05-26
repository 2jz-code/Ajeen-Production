// src/components/checkout/components/OrderSummary.jsx
import React from "react";

const OrderSummary = ({
	subtotal,
	tax,
	total,
	formatPrice,
	surchargeAmount,
	surchargePercentageDisplay,
	taxDisplay,
	// deliveryFee prop seems to be passed to OrderSummary from PaymentMethod,
	// but not used here. If it should be displayed, we can add it.
}) => {
	return (
		// Summary box: Light Beige background, subtle border, slightly less prominent shadow than main card
		<div className="bg-accent-light-beige rounded-lg p-4 sm:p-6 mb-6 border border-accent-subtle-gray/50 shadow-md">
			{/* Heading: Dark Green */}
			<h3 className="font-semibold text-accent-dark-green mb-4 text-lg">
				Order Summary
			</h3>
			<div className="space-y-2 text-sm">
				{/* Labels: Dark Brown, Values: Dark Green */}
				<div className="flex justify-between">
					<span className="text-accent-dark-brown">Subtotal</span>
					<span className="text-accent-dark-green font-medium">
						${formatPrice(subtotal)}
					</span>
				</div>
				{surchargeAmount > 0 && (
					<div className="flex justify-between">
						<span className="text-accent-dark-brown">
							Processing Fee ({surchargePercentageDisplay || "N/A"})
						</span>
						<span className="text-accent-dark-green font-medium">
							${formatPrice(surchargeAmount)}
						</span>
					</div>
				)}
				<div className="flex justify-between">
					<span className="text-accent-dark-brown">
						Tax ({taxDisplay || "N/A"})
					</span>
					<span className="text-accent-dark-green font-medium">
						${formatPrice(tax)}
					</span>
				</div>
				{/* Divider: Subtle Gray */}
				<div className="border-t border-accent-subtle-gray/70 pt-3 mt-3">
					{/* Total Label: Dark Green, bold. Total Value: Primary Green, bold, larger */}
					<div className="flex justify-between font-bold text-md">
						<span className="text-accent-dark-green">Total</span>
						<span className="text-primary-green text-lg">
							${formatPrice(total)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderSummary;
