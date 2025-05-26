// src/components/confirmation/components/OrderItems.jsx
import React from "react";

const OrderItems = ({ orderDetails, formatPrice }) => {
	if (!orderDetails || !orderDetails.items || orderDetails.items.length === 0) {
		return (
			<p className="text-accent-dark-brown text-sm">
				No items to display for this order.
			</p>
		); // Styled fallback
	}

	// Values from the orderDetails object
	const subtotal =
		orderDetails.subtotal_from_frontend ?? orderDetails.subtotal ?? 0;
	const tax = orderDetails.tax_amount_from_frontend ?? orderDetails.tax ?? 0;
	const surcharge = orderDetails.surcharge_amount || 0;
	const tip = orderDetails.tip_amount || 0;
	const discount = orderDetails.discount_amount || 0;
	const total = orderDetails.total_price ?? 0; // total_price should be the definitive total

	return (
		<div className="mb-6">
			{/* Heading: Dark Green */}
			<h3 className="font-semibold text-accent-dark-green text-lg mb-3">
				Your Items
			</h3>
			{/* Table container: Primary Beige background, subtle border and shadow */}
			<div className="bg-primary-beige rounded-lg shadow-sm overflow-hidden border border-accent-subtle-gray/40">
				<table className="min-w-full">
					{/* Table Head: Light Beige background, Dark Brown text (uppercase) */}
					<thead className="bg-accent-light-beige/80">
						<tr>
							<th
								scope="col"
								className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-accent-dark-brown uppercase tracking-wider"
							>
								Item
							</th>
							<th
								scope="col"
								className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-accent-dark-brown uppercase tracking-wider"
							>
								Qty
							</th>
							<th
								scope="col"
								className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-accent-dark-brown uppercase tracking-wider"
							>
								Price
							</th>
						</tr>
					</thead>
					{/* Table Body: Primary Beige background, Dark Green/Brown text, Subtle Gray dividers */}
					<tbody className="bg-primary-beige divide-y divide-accent-subtle-gray/50">
						{orderDetails.items.map((item, index) => (
							<tr key={item.id || index}>
								<td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-accent-dark-green">
									{item.product_name}
								</td>
								<td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-accent-dark-brown text-right">
									{item.quantity}
								</td>
								<td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-accent-dark-brown text-right">
									${formatPrice(item.item_price * item.quantity)}
								</td>
							</tr>
						))}
					</tbody>
					{/* Table Footer: Light Beige background, Dark Brown labels, Dark Green/Primary Green values */}
					<tfoot className="bg-accent-light-beige/80 border-t border-accent-subtle-gray/60">
						<tr>
							<td
								colSpan="2"
								className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
							>
								Subtotal
							</td>
							<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-green text-right">
								${formatPrice(subtotal)}
							</td>
						</tr>
						{discount > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
								>
									Discount
								</td>
								{/* Discount: Standard red text */}
								<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-red-600 text-right">
									-${formatPrice(discount)}
								</td>
							</tr>
						)}
						{surcharge > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
								>
									Processing Fee
									{orderDetails.surcharge_percentage_display // Using the field from OrderItems (was surcharge_percentage)
										? ` (${orderDetails.surcharge_percentage_display})`
										: ""}
								</td>
								<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-green text-right">
									${formatPrice(surcharge)}
								</td>
							</tr>
						)}
						<tr>
							<td
								colSpan="2"
								className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
							>
								Tax{" "}
								{orderDetails.tax_display // Using the field from OrderItems
									? ` (${orderDetails.tax_display})`
									: ""}
							</td>
							<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-green text-right">
								${formatPrice(tax)}
							</td>
						</tr>
						{tip > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
								>
									Tip
								</td>
								<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-green text-right">
									${formatPrice(tip)}
								</td>
							</tr>
						)}
						{orderDetails.delivery_fee > 0 && ( // Only show if there's a delivery fee
							<tr>
								<td
									colSpan="2"
									className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-brown text-right"
								>
									Delivery Fee
								</td>
								<td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-accent-dark-green text-right">
									${formatPrice(orderDetails.delivery_fee)}
								</td>
							</tr>
						)}
						{/* Final Total Row */}
						<tr className="border-t-2 border-accent-subtle-gray">
							<td
								colSpan="2"
								// Total Label: Dark Green, bold
								className="px-4 sm:px-6 py-3 text-md font-bold text-accent-dark-green text-right"
							>
								Total
							</td>
							<td
								// Total Value: Primary Green, bold, larger text
								className="px-4 sm:px-6 py-3 text-lg font-bold text-primary-green text-right"
							>
								${formatPrice(total)}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
};

export default OrderItems;
