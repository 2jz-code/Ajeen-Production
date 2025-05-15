import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaShoppingCart, FaTrash, FaTimes } from "react-icons/fa";
// Import core fetcher and remover, but NOT useCart or fetchCartItems
import { fetchCurrentCartData, removeItemFromCart } from "../utility/CartUtils";
import { useAuth } from "../../contexts/AuthContext";

// Expects cartItemCount (number) and refreshCartCount (function to update the badge) props
const CartButton = ({ refreshCartCount, cartItemCount, className = "" }) => {
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [cartItems, setCartItems] = useState([]); // Local state for displaying items
	const [isLoading, setIsLoading] = useState(false); // Local loading state for this component's fetch
	const [subtotal, setSubtotal] = useState(0);
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth();

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		if (isNaN(numericPrice)) return "0.00";
		return numericPrice.toFixed(2);
	};

	// --- Toggle Cart Sidebar ---
	const toggleCart = () => {
		setIsCartOpen(!isCartOpen);
	};

	// --- Handle Checkout Button Click ---
	const handleCheckout = () => {
		// --- FIX: Remove authentication check ---
		// Always navigate to checkout page for both guests and authenticated users.
		// The CheckoutPage component will handle differentiating them.
		// console.log("Proceed to Checkout clicked. Navigating to /checkout...");
		setIsCartOpen(false); // Close the cart sidebar
		navigate("/checkout"); // Navigate ALL users to checkout
		// --- End FIX ---
	};

	// --- Fetch Cart Data Handler for THIS component ---
	const handleFetchCartDataForDisplay = useCallback(async () => {
		// console.log("CartButton: handleFetch called.");
		setIsLoading(true);
		const { items, error } = await fetchCurrentCartData(); // Call the utility directly
		if (error) {
			console.error("CartButton: Error fetching cart items:", error);
			// Optionally show an error message to the user within the cart
		}
		setCartItems(items); // Update local state
		setIsLoading(false);
		// console.log("CartButton: Updated local cartItems state:", items);
	}, []); // No dependencies needed, fetcher is stable

	// --- Fetch cart items when cart is opened ---
	useEffect(() => {
		if (isCartOpen) {
			// Call the local fetch handler when cart opens (works for guests too)
			handleFetchCartDataForDisplay();
		}
	}, [isCartOpen, isAuthenticated, handleFetchCartDataForDisplay]); // Rerun if auth status changes while open

	// --- Calculate subtotal whenever displayed cart items change ---
	useEffect(() => {
		const total = cartItems.reduce(
			(sum, item) =>
				sum + (item.quantity || 0) * (parseFloat(item.item_price) || 0),
			0
		);
		setSubtotal(total);
	}, [cartItems]);

	// --- Handle removing item ---
	const handleRemoveItem = async (itemId, itemName) => {
		if (window.confirm(`Remove ${itemName} from your cart?`)) {
			try {
				// Call utility, pass the combined callback
				await removeItemFromCart(itemId, async () => {
					// This callback runs AFTER removeItemFromCart's API call succeeds
					// console.log(
					// "CartButton/removeItemFromCart callback: Refreshing local items list..."
					// );
					await handleFetchCartDataForDisplay(); // Refresh local items list first

					// Now refresh the shared badge count state
					if (refreshCartCount && typeof refreshCartCount === "function") {
						// --- ADD LOG ---
						// console.log(
						// "CartButton/removeItemFromCart callback: Calling refreshCartCount prop..."
						// );
						await refreshCartCount(); // Call the function passed via props
						// --- ADD LOG ---
						// console.log(
						// "CartButton/removeItemFromCart callback: refreshCartCount prop finished."
						// );
					} else {
						// --- ADD LOG ---
						console.warn(
							"CartButton/removeItemFromCart callback: refreshCartCount prop is missing or not a function."
						);
					}
				});
			} catch (error) {
				console.error("CartButton: Failed to remove item.", error);
				// Alert might be shown by removeItemFromCart utility
			}
		}
	};
	return (
		<div className={`relative z-40 ${className}`}>
			{/* Cart Button - Removed fixed positioning, using className prop instead */}
			<button
				className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-md transition-all duration-300 transform hover:scale-105"
				onClick={toggleCart}
				aria-label="Open shopping cart"
			>
				<FaShoppingCart size={20} />
				{cartItemCount > 0 && (
					<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
						{cartItemCount}
					</span>
				)}
			</button>

			{/* Cart Modal */}
			<AnimatePresence>
				{isCartOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 bg-black bg-opacity-50 z-40"
							onClick={toggleCart}
						/>

						{/* Cart Panel */}
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{ type: "spring", damping: 25, stiffness: 300 }}
							className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-xl overflow-hidden flex flex-col"
						>
							{/* Rest of the cart panel content remains the same */}
							{/* Cart Header */}
							<div className="p-4 bg-gray-100 flex justify-between items-center border-b">
								<h2 className="text-xl font-semibold flex items-center">
									<FaShoppingCart className="mr-2" /> Your Cart
									<span className="ml-2 text-sm font-normal text-gray-600">
										({cartItemCount} {cartItemCount === 1 ? "item" : "items"})
									</span>
								</h2>
								<button
									onClick={toggleCart}
									className="p-1 rounded-full hover:bg-gray-200 transition-colors"
									aria-label="Close cart"
								>
									<FaTimes size={20} />
								</button>
							</div>

							{/* Cart Content */}
							<div className="flex-grow overflow-y-auto p-4">
								{isLoading ? (
									<div className="flex justify-center items-center h-full">
										<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
									</div>
								) : cartItems.length === 0 ? (
									<div className="flex flex-col items-center justify-center h-full text-gray-500">
										<svg
											className="w-16 h-16 mb-4 text-gray-300"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
											/>
										</svg>
										<p className="text-lg font-medium mb-2">
											Your cart is empty
										</p>
										<p className="text-sm text-center mb-6">
											Looks like you haven't added any items to your cart yet.
										</p>
										<button
											onClick={() => {
												toggleCart();
												navigate("/menu");
											}}
											className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
										>
											Browse Menu
										</button>
									</div>
								) : (
									<ul className="divide-y divide-gray-200">
										{cartItems.map((item) => (
											<motion.li
												key={item.id}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, height: 0, marginBottom: 0 }}
												className="py-4 flex items-center"
											>
												{/* Item Image (if available) */}
												<div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 mr-4">
													{item.image_url ? (
														<img
															src={item.image_url}
															alt={item.product_name || "Product"}
															className="h-full w-full object-cover object-center"
														/>
													) : (
														<div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
															No image
														</div>
													)}
												</div>

												{/* Item Details */}
												<div className="flex-1 min-w-0">
													<h3 className="text-sm font-medium text-gray-900 truncate">
														{item.product_name || "Unknown Product"}
													</h3>
													<p className="mt-1 text-sm text-gray-500">
														{item.quantity} x $
														{formatPrice(item.item_price || 0)}
													</p>
												</div>

												{/* Item Price */}
												<div className="ml-4 flex-shrink-0 font-medium">
													$
													{formatPrice(
														(item.quantity || 1) * (item.item_price || 0)
													)}
												</div>

												{/* Remove Button */}
												<button
													onClick={() =>
														handleRemoveItem(item.id, item.product_name)
													}
													className="ml-4 text-red-500 hover:text-red-700 transition-colors p-1"
													aria-label={`Remove ${item.product_name} from cart`}
												>
													<FaTrash size={16} />
												</button>
											</motion.li>
										))}
									</ul>
								)}
							</div>

							{/* Cart Footer */}
							{cartItems.length > 0 && (
								<div className="border-t border-gray-200 p-4 bg-gray-50">
									<div className="flex justify-between text-base font-medium text-gray-900 mb-4">
										<p>Subtotal</p>
										<p>${formatPrice(subtotal)}</p>
									</div>
									<p className="text-sm text-gray-500 mb-4">
										Shipping and taxes calculated at checkout.
									</p>
									<button
										onClick={handleCheckout}
										className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center font-medium"
									>
										Proceed to Checkout
									</button>
									<button
										onClick={toggleCart}
										className="w-full mt-2 border border-gray-300 bg-white text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center font-medium"
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
