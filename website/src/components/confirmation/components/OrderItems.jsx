// src/components/confirmation/components/OrderItems.jsx
import React from "react";

const OrderItems = ({ orderDetails, formatPrice }) => {
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
						{orderDetails.items &&
							orderDetails.items.map((item, index) => (
								<tr key={index}>
									<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{item.product_name}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
										{item.quantity}
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
										${formatPrice(item.item_price * item.quantity)}
									</td>
								</tr>
							))}
					</tbody>
					<tfoot className="bg-gray-50">
						<tr>
							<td
								colSpan="2"
								className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
							>
								Subtotal
							</td>
							<td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
								${formatPrice(orderDetails.subtotal) || "0.00"}
							</td>
						</tr>
						<tr>
							<td
								colSpan="2"
								className="px-6 py-4 text-sm font-medium text-gray-900 text-right"
							>
								Tax
							</td>
							<td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
								${formatPrice(orderDetails.tax) || "0.00"}
							</td>
						</tr>
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
								${formatPrice(orderDetails.total_amount) || "0.00"}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
};

export default OrderItems;
