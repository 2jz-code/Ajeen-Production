import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaShoppingCart, FaTrash, FaTimes } from "react-icons/fa";
import { fetchCurrentCartData, removeItemFromCart } from "../utility/CartUtils"; // Assuming path
import { useAuth } from "../../contexts/AuthContext"; // Assuming path

const CartButton = ({ refreshCartCount, cartItemCount, className = "" }) => {
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [cartItems, setCartItems] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [subtotal, setSubtotal] = useState(0);
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		if (isNaN(numericPrice)) return "0.00";
		return numericPrice.toFixed(2);
	};

	const toggleCart = () => {
		setIsCartOpen(!isCartOpen);
	};

	const handleCheckout = () => {
		setIsCartOpen(false);
		navigate("/checkout");
	};

	const handleFetchCartDataForDisplay = useCallback(async () => {
		setIsLoading(true);
		const { items, error } = await fetchCurrentCartData();
		if (error) {
			console.error("CartButton: Error fetching cart items:", error);
		}
		setCartItems(items || []); // Ensure items is an array
		setIsLoading(false);
	}, []);

	useEffect(() => {
		if (isCartOpen) {
			handleFetchCartDataForDisplay();
		}
	}, [isCartOpen, isAuthenticated, handleFetchCartDataForDisplay]);

	useEffect(() => {
		const total = (cartItems || []).reduce(
			// Ensure cartItems is an array
			(sum, item) =>
				sum + (item.quantity || 0) * (parseFloat(item.item_price) || 0),
			0
		);
		setSubtotal(total);
	}, [cartItems]);

	const handleRemoveItem = async (itemId, itemName) => {
		// Reverted to window.confirm for simplicity, replace with custom modal if available
		if (window.confirm(`Remove ${itemName} from your cart?`)) {
			try {
				await removeItemFromCart(itemId, async () => {
					await handleFetchCartDataForDisplay();
					if (refreshCartCount && typeof refreshCartCount === "function") {
						await refreshCartCount();
					}
				});
			} catch (error) {
				console.error("CartButton: Failed to remove item.", error);
			}
		}
	};
	return (
		<div className={`relative z-40 ${className}`}>
			{/* Cart Button: Primary Green bg, Light Beige icon */}
			<button
				className="flex items-center justify-center bg-primary-green hover:bg-accent-dark-green text-accent-light-beige p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-accent-light-beige"
				onClick={toggleCart}
				aria-label="Open shopping cart"
			>
				<FaShoppingCart size={20} />
				{cartItemCount > 0 && (
					// Badge: Warm Brown bg, Light Beige text
					<motion.span
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						className="absolute -top-1.5 -right-1.5 bg-accent-warm-brown text-accent-light-beige text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-accent-light-beige"
					>
						{cartItemCount}
					</motion.span>
				)}
			</button>

			<AnimatePresence>
				{isCartOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm" // Darker backdrop
							onClick={toggleCart}
						/>

						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 30, stiffness: 300 }}
							// Sidebar: Light beige bg
							className="fixed top-0 right-0 h-full w-full sm:w-96 bg-accent-light-beige z-50 shadow-2xl overflow-hidden flex flex-col border-l border-accent-subtle-gray/30"
						>
							{/* Cart Header: Light beige bg, Dark Green text, Subtle Gray border */}
							<div className="p-4 bg-accent-light-beige flex justify-between items-center border-b border-accent-subtle-gray/50">
								<h2 className="text-xl font-semibold text-accent-dark-green flex items-center">
									<FaShoppingCart className="mr-2 text-primary-green" /> Your
									Cart
									<span className="ml-2 text-sm font-normal text-accent-dark-brown">
										({cartItemCount} {cartItemCount === 1 ? "item" : "items"})
									</span>
								</h2>
								{/* Close button: Dark brown icon, hover primary beige */}
								<button
									onClick={toggleCart}
									className="p-1.5 rounded-full text-accent-dark-brown hover:bg-primary-beige/70 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-green"
									aria-label="Close cart"
								>
									<FaTimes size={18} />
								</button>
							</div>

							<div className="flex-grow overflow-y-auto p-4 space-y-3">
								{isLoading ? (
									<div className="flex justify-center items-center h-full">
										{/* Spinner: Primary Green */}
										<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-green"></div>
									</div>
								) : (cartItems || []).length === 0 ? ( // Ensure cartItems is an array
									<div className="flex flex-col items-center justify-center h-full text-center px-4">
										{/* Empty cart icon: Subtle Gray */}
										<FaShoppingCart className="w-16 h-16 mb-5 text-accent-subtle-gray opacity-70" />
										{/* Text: Dark Green and Dark Brown */}
										<p className="text-lg font-semibold text-accent-dark-green mb-2">
											Your cart is empty
										</p>
										<p className="text-sm text-accent-dark-brown mb-6">
											Looks like you haven't added any delicious items yet.
										</p>
										{/* Button: Primary Green bg, Light Beige text */}
										<button
											onClick={() => {
												toggleCart();
												navigate("/menu");
											}}
											className="px-5 py-2.5 bg-primary-green text-accent-light-beige rounded-lg hover:bg-accent-dark-green transition-colors font-medium shadow-sm"
										>
											Browse Menu
										</button>
									</div>
								) : (
									<ul className="divide-y divide-accent-subtle-gray/30">
										{(cartItems || []).map(
											(
												item // Ensure cartItems is an array
											) => (
												<motion.li
													key={item.id}
													layout // For smoother removal animation
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{
														opacity: 0,
														x: -20,
														transition: { duration: 0.2 },
													}}
													className="py-4 flex items-center"
												>
													{/* Image placeholder: Subtle Gray bg */}
													<div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-accent-subtle-gray/30 bg-accent-subtle-gray/20 mr-4">
														{item.image_url ? (
															<img
																src={item.image_url}
																alt={item.product_name || "Product"}
																className="h-full w-full object-cover object-center"
															/>
														) : (
															<div className="h-full w-full flex items-center justify-center text-accent-subtle-gray">
																{/* Placeholder icon or text */}
															</div>
														)}
													</div>
													<div className="flex-1 min-w-0">
														{/* Product name: Dark Green */}
														<h3 className="text-sm font-semibold text-accent-dark-green truncate">
															{item.product_name || "Unknown Product"}
														</h3>
														{/* Quantity/Price: Dark Brown */}
														<p className="mt-1 text-xs text-accent-dark-brown">
															{item.quantity} x $
															{formatPrice(item.item_price || 0)}
														</p>
													</div>
													{/* Total item price: Primary Green */}
													<div className="ml-4 flex-shrink-0 font-medium text-primary-green text-sm">
														$
														{formatPrice(
															(item.quantity || 1) * (item.item_price || 0)
														)}
													</div>
													{/* Remove button: Red icon */}
													<button
														onClick={() =>
															handleRemoveItem(item.id, item.product_name)
														}
														className="ml-3 text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-full hover:bg-red-500/10"
														aria-label={`Remove ${item.product_name} from cart`}
													>
														<FaTrash size={14} />
													</button>
												</motion.li>
											)
										)}
									</ul>
								)}
							</div>

							{/* Cart Footer: Primary Beige bg, Subtle Gray border */}
							{(cartItems || []).length > 0 && ( // Ensure cartItems is an array
								<div className="border-t border-accent-subtle-gray/50 p-4 bg-primary-beige/70">
									<div className="flex justify-between text-md font-semibold text-accent-dark-green mb-3">
										<p>Subtotal</p>
										<p>${formatPrice(subtotal)}</p>
									</div>
									<p className="text-xs text-accent-dark-brown mb-4">
										Shipping and taxes calculated at checkout.
									</p>
									{/* Checkout Button: Primary Green bg, Light Beige text */}
									<button
										onClick={handleCheckout}
										className="w-full bg-primary-green text-accent-light-beige py-3 px-4 rounded-lg hover:bg-accent-dark-green transition-colors flex items-center justify-center font-semibold shadow-md"
									>
										Proceed to Checkout
									</button>
									{/* Continue Shopping Button: Light Beige bg, Dark Green text, Subtle Gray border */}
									<button
										onClick={toggleCart}
										className="w-full mt-2 border border-accent-subtle-gray bg-accent-light-beige text-accent-dark-green py-3 px-4 rounded-lg hover:bg-primary-beige/80 transition-colors flex items-center justify-center font-medium"
									>
										Continue Shopping
									</button>
								</div>
							)}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};

export default CartButton;
