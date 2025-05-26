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
	surchargeAmount,
	surchargePercentageDisplay,
	taxDisplay,
}) => {
	const navigate = useNavigate();

	return (
		// Main card: Primary Beige background, subtle border and shadow
		<div className="bg-primary-beige rounded-lg shadow-lg p-6 sm:p-8 border border-accent-subtle-gray/30">
			{/* Heading: Icon Primary Green, Text Dark Green */}
			<h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center text-accent-dark-green">
				<FaShoppingCart
					className="mr-3 text-primary-green"
					size={24}
				/>{" "}
				Review Your Order
			</h2>

			{cartItems.length === 0 ? (
				<div className="text-center py-8">
					{/* Empty cart text: Dark Brown */}
					<p className="text-accent-dark-brown mb-6 text-lg">
						Your cart is empty.
					</p>
					{/* Button: Primary Green bg, Light Beige text */}
					<button
						onClick={() => navigate("/menu")}
						className="bg-primary-green text-accent-light-beige px-6 py-2.5 rounded-md hover:bg-accent-dark-green transition-colors font-medium shadow-sm"
					>
						Browse Menu
					</button>
				</div>
			) : (
				<>
					{/* Item list divider: Subtle Gray */}
					<div className="divide-y divide-accent-subtle-gray/50">
						{cartItems.map((item) => (
							<div
								key={item.id}
								className="py-4 flex justify-between items-center"
							>
								<div className="flex items-center">
									{/* Image placeholder: Subtle Gray bg */}
									<div className="w-16 h-16 bg-accent-subtle-gray/30 rounded-md overflow-hidden mr-4 shadow-sm">
										{item.image_url ? (
											<img
												src={item.image_url}
												alt={item.product_name}
												className="w-full h-full object-cover"
											/>
										) : (
											// Placeholder text: Dark Brown
											<div className="w-full h-full flex items-center justify-center text-xs text-accent-dark-brown">
												No image
											</div>
										)}
									</div>
									<div>
										{/* Product name: Dark Green */}
										<h3 className="font-semibold text-accent-dark-green text-md">
											{item.product_name}
										</h3>
										{/* Quantity & price: Dark Brown */}
										<p className="text-accent-dark-brown text-sm">
											${formatPrice(item.item_price)} &times; {item.quantity}
										</p>
									</div>
								</div>
								{/* Total item price: Primary Green */}
								<p className="font-medium text-primary-green text-md">
									${formatPrice(item.item_price * item.quantity)}
								</p>
							</div>
						))}
					</div>

					{/* Totals section border: Subtle Gray */}
					<div className="mt-6 border-t border-accent-subtle-gray/50 pt-6">
						{/* Labels: Dark Brown, Values: Dark Green */}
						<div className="flex justify-between py-1.5 text-sm">
							<span className="text-accent-dark-brown">Subtotal</span>
							<span className="text-accent-dark-green font-medium">
								${formatPrice(subtotal)}
							</span>
						</div>
						{surchargeAmount > 0 && (
							<div className="flex justify-between py-1.5 text-sm">
								<span className="text-accent-dark-brown">
									Processing Fee ({surchargePercentageDisplay || "N/A"})
								</span>
								<span className="text-accent-dark-green font-medium">
									${formatPrice(surchargeAmount)}
								</span>
							</div>
						)}
						<div className="flex justify-between py-1.5 text-sm">
							<span className="text-accent-dark-brown">
								Tax ({taxDisplay || "N/A"})
							</span>
							<span className="text-accent-dark-green font-medium">
								${formatPrice(tax)}
							</span>
						</div>
						{/* Final Total: Dark Green, bold, larger text */}
						<div className="flex justify-between py-2.5 font-bold text-lg text-accent-dark-green mt-2 border-t border-accent-subtle-gray/40 pt-3">
							<span>Total</span>
							<span>${formatPrice(total)}</span>
						</div>
					</div>

					<div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
						{/* Continue Shopping: Primary Green text, hover Dark Green */}
						<button
							onClick={() => navigate("/menu")}
							className="flex items-center text-primary-green hover:text-accent-dark-green transition-colors font-medium text-sm order-2 sm:order-1 py-2"
						>
							<FaArrowLeft className="mr-2" /> Continue Shopping
						</button>
						{/* Continue to Payment: Primary Green bg, Light Beige text */}
						<button
							onClick={nextStep}
							className="w-full sm:w-auto bg-primary-green text-accent-light-beige px-6 py-3 rounded-md hover:bg-accent-dark-green transition-colors font-semibold shadow-md order-1 sm:order-2"
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
