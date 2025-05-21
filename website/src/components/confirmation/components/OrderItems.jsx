// src/components/confirmation/components/OrderItems.jsx
import React from "react";

const OrderItems = ({ orderDetails, formatPrice }) => {
	if (!orderDetails || !orderDetails.items) {
		return <p>No items to display.</p>;
	}

	// Values from the orderDetails object, which should now reflect what was sent from frontend
	const subtotal =
		orderDetails.subtotal_from_frontend !== null &&
		orderDetails.subtotal_from_frontend !== undefined
			? orderDetails.subtotal_from_frontend
			: orderDetails.subtotal; // Fallback to method field if direct one isn't there
	const tax =
		orderDetails.tax_amount_from_frontend !== null &&
		orderDetails.tax_amount_from_frontend !== undefined
			? orderDetails.tax_amount_from_frontend
			: orderDetails.tax; // Fallback
	const surcharge = orderDetails.surcharge_amount || 0;
	const tip = orderDetails.tip_amount || 0;
	const discount = orderDetails.discount_amount || 0;
	const total = orderDetails.total_price; // This is the definitive total stored from frontend

	return (
		<div className="mb-6">
			<h3 className="font-semibold text-gray-800 mb-3">Order Items</h3>
			<div className="border rounded-md overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Item
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Qty
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Price
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{orderDetails.items.map((item, index) => (
							<tr key={item.id || index}>
								{" "}
								{/* Use item.id if available */}
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
									{item.product_name}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
									{item.quantity}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
									${formatPrice(item.item_price * item.quantity)}{" "}
									{/* item_price is unit_price here */}
								</td>
							</tr>
						))}
					</tbody>
					<tfoot className="bg-gray-50">
						<tr>
							<td
								colSpan="2"
								className="px-6 py-3 text-sm font-medium text-gray-700 text-right"
							>
								Subtotal
							</td>
							<td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
								${formatPrice(subtotal)}
							</td>
						</tr>
						{discount > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-6 py-3 text-sm font-medium text-gray-700 text-right"
								>
									Discount
								</td>
								<td className="px-6 py-3 text-sm font-medium text-red-600 text-right">
									-${formatPrice(discount)}
								</td>
							</tr>
						)}
						{surcharge > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-6 py-3 text-sm font-medium text-gray-700 text-right"
								>
									Surcharge
									{orderDetails.surcharge_percentage_display
										? ` (${orderDetails.surcharge_percentage_display})`
										: ""}
								</td>
								<td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
									${formatPrice(surcharge)}
								</td>
							</tr>
						)}
						<tr>
							<td
								colSpan="2"
								className="px-6 py-3 text-sm font-medium text-gray-700 text-right"
							>
								Tax{" "}
								{orderDetails.tax_display
									? ` (${orderDetails.tax_display})`
									: ""}
							</td>
							<td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
								${formatPrice(tax)}
							</td>
						</tr>
						{tip > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-6 py-3 text-sm font-medium text-gray-700 text-right"
								>
									Tip
								</td>
								<td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
									${formatPrice(tip)}
								</td>
							</tr>
						)}
						{/* Delivery Fee display already exists and shows 0.00 which is fine */}
						{orderDetails.delivery_fee > 0 && (
							<tr>
								<td
									colSpan="2"
									className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
								>
									Delivery Fee
								</td>
								<td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
									${formatPrice(orderDetails.delivery_fee) || "0.00"}
								</td>
							</tr>
						)}
						<tr>
							<td
								colSpan="2"
								className="px-6 py-4 text-sm font-bold text-gray-900 text-right"
							>
								Total
							</td>
							<td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
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
