// src/components/checkout/components/CartReview.jsx
import React from "react";
import { FaShoppingCart, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CartReview = ({
	cartItems,
	subtotal,
	tax,
	total,
	formatPrice,
	nextStep,
}) => {
	const navigate = useNavigate();

	return (
		<div className="bg-white rounded-lg shadow-md p-6">
			<h2 className="text-xl font-semibold mb-4 flex items-center">
				<FaShoppingCart className="mr-2 text-green-500" /> Review Your Order
			</h2>

			{cartItems.length === 0 ? (
				<div className="text-center py-8">
					<p className="text-gray-500 mb-4">Your cart is empty</p>
					<button
						onClick={() => navigate("/menu")}
						className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
					>
						Browse Menu
					</button>
				</div>
			) : (
				<>
					<div className="divide-y divide-gray-200">
						{cartItems.map((item) => (
							<div
								key={item.id}
								className="py-4 flex justify-between items-center"
							>
								<div className="flex items-center">
									<div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden mr-4">
										{item.image_url ? (
											<img
												src={item.image_url}
												alt={item.product_name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-gray-400">
												No image
											</div>
										)}
									</div>
									<div>
										<h3 className="font-medium">{item.product_name}</h3>
										<p className="text-gray-500 text-sm">
											${formatPrice(item.item_price)} × {item.quantity}
										</p>
									</div>
								</div>
								<p className="font-medium">
									${formatPrice(item.item_price * item.quantity)}
								</p>
							</div>
						))}
					</div>

					<div className="mt-6 border-t border-gray-200 pt-4">
						<div className="flex justify-between py-2">
							<span className="text-gray-600">Subtotal</span>
							<span>${formatPrice(subtotal)}</span>
						</div>
						<div className="flex justify-between py-2">
							<span className="text-gray-600">Tax (10%)</span>
							<span>${formatPrice(tax)}</span>
						</div>
						<div className="flex justify-between py-2 font-semibold text-lg">
							<span>Total</span>
							<span>${formatPrice(total)}</span>
						</div>
					</div>

					<div className="mt-8 flex justify-between">
						<button
							onClick={() => navigate("/menu")}
							className="flex items-center text-green-600 hover:text-green-700"
						>
							<FaArrowLeft className="mr-2" /> Continue Shopping
						</button>
						<button
							onClick={nextStep}
							className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors"
						>
							Continue to Payment
						</button>
					</div>
				</>
			)}
		</div>
	);
};

export default CartReview;
