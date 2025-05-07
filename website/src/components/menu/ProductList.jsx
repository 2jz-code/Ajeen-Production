import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaShoppingCart, FaMinus, FaPlus, FaSearch } from "react-icons/fa";
import {
	addToCart,
	incrementQuantity,
	decrementQuantity,
	fetchProducts,
	groupByCategory,
} from "../utility/CartUtils"; // Import utilities
// removed import for useAuth as isAuthenticated check is removed from handleAddToCart
// import { useAuth } from "../../contexts/AuthContext";

const ProductList = ({
	selectedCategory,
	updateCartItemCount, // Renamed prop for clarity
	onCartUpdate, // Expecting fetchCurrentCartData passed under this name
	onProductClick, // Assuming this is for navigating to details
	setSelectedCategory,
	activeView = "grid",
}) => {
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [quantities, setQuantities] = useState({});
	const [searchTerm, setSearchTerm] = useState("");
	const [showQuickAdd, setShowQuickAdd] = useState({});
	const navigate = useNavigate(); // Keep if used for product clicks

	// Fetch products on component mount
	useEffect(() => {
		fetchProducts(setProducts, setQuantities, setIsLoading);
	}, []);

	// Initialize quantities for products
	useEffect(() => {
		if (products.length > 0) {
			const initialQuantities = {};
			products.forEach((product) => {
				initialQuantities[product.id] = 1;
			});
			setQuantities((prev) => ({
				...initialQuantities,
				...prev,
			}));
		}
	}, [products]);

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		if (isNaN(numericPrice)) return "0.00";
		return numericPrice.toFixed(2);
	};

	// Handle adding product to cart
	const handleAddToCart = async (e, productId) => {
		e.stopPropagation();
		e.preventDefault();

		// --- Authentication check/redirect REMOVED ---

		try {
			console.log(`Attempting to add product ${productId} to cart...`);
			// *** FIX: Pass the correct prop name 'updateCartItemCount' to addToCart ***
			await addToCart(
				productId,
				quantities[productId] || 1,
				updateCartItemCount // Pass the correctly named prop as the callback
			);
			console.log(`Product ${productId} add attempt finished.`);

			// Reset quantity & hide panel
			setQuantities((prevQuantities) => ({
				...prevQuantities,
				[productId]: 1,
			}));
			setShowQuickAdd((prev) => ({ ...prev, [productId]: false }));
		} catch (error) {
			console.error("Add to cart initiation failed in ProductList:", error);
			// Alert/message might be shown by addToCart itself.
		}
	};

	// Toggle quick add panel for a product
	const toggleQuickAdd = (productId, e) => {
		e.stopPropagation();
		e.preventDefault();
		setShowQuickAdd((prev) => {
			const shouldOpen = !prev[productId];
			const newState = {};
			if (shouldOpen) newState[productId] = true;
			return newState;
		});
	};

	// --- Filter and Display Logic (assuming no changes needed here) ---
	const filterBySearch = (productsToFilter) => {
		// ... (implementation as provided) ...
		if (!searchTerm) return productsToFilter;
		const lowercaseSearch = searchTerm.toLowerCase();
		return productsToFilter.filter(
			(product) =>
				product.name.toLowerCase().includes(lowercaseSearch) ||
				(product.description &&
					product.description.toLowerCase().includes(lowercaseSearch))
		);
	};

	const getDisplayProducts = () => {
		// ... (implementation as provided, check category handling) ...
		let filteredProducts;
		if (selectedCategory) {
			filteredProducts = products.filter((product) => {
				if (product.category && !Array.isArray(product.category)) {
					return product.category.id === selectedCategory;
				} else if (product.category && Array.isArray(product.category)) {
					return product.category.some(
						(cat) => cat && cat.id === selectedCategory
					);
				}
				return false;
			});
			return filterBySearch(filteredProducts);
		} else {
			const groupedProducts = groupByCategory(products);
			if (searchTerm) {
				const allProducts = Object.values(groupedProducts).flat();
				return filterBySearch(allProducts);
			}
			return groupedProducts;
		}
	};

	const displayProducts = getDisplayProducts();

	// Render a product card
	// Updated renderProductCard function in ProductList.jsx

	const renderGridProductCard = (product) => (
		<motion.div
			key={product.id}
			whileHover={{ y: -5 }}
			transition={{ duration: 0.2 }}
			className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow relative"
		>
			<Link
				to={`/product/${encodeURIComponent(product.name)}`}
				className="block h-full"
				onClick={(e) => showQuickAdd[product.id] && e.preventDefault()}
			>
				{/* Product Image */}
				<div className="relative aspect-w-16 aspect-h-9 bg-gray-200">
					<img
						src={
							product.image_file ||
							product.image_url ||
							"https://via.placeholder.com/300?text=No+Image"
						}
						alt={product.name}
						className="w-full h-48 object-cover"
					/>

					{/* Quick Add Button */}
					<button
						onClick={(e) => toggleQuickAdd(product.id, e)}
						className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
						aria-label="Quick add"
						data-testid={`quick-add-button-${product.id}`}
					>
						{showQuickAdd[product.id] ? (
							<svg
								className="w-5 h-5 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						) : (
							<FaShoppingCart className="text-gray-600" />
						)}
					</button>

					{/* Category Tag */}
					{product.category && (
						<div className="absolute top-2 left-2">
							<span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
								{Array.isArray(product.category) && product.category.length > 0
									? product.category[0].name
									: product.category.name || "Product"}
							</span>
						</div>
					)}
				</div>

				{/* Product Info */}
				<div className="p-4">
					<h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
						{product.name}
					</h3>
					<p className="text-green-600 font-bold mb-2">
						${formatPrice(product.price)}
					</p>
					<p className="text-gray-500 text-sm line-clamp-2 h-10">
						{product.description || "No description available."}
					</p>
				</div>
			</Link>

			{/* Quick Add Panel */}
			{showQuickAdd[product.id] && (
				<div
					className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-100 shadow-md z-20"
					style={{
						transform: "translateY(100%)",
						animation: "slideUp 0.2s forwards",
					}}
					data-testid={`quick-add-panel-${product.id}`}
				>
					<style>{`
				@keyframes slideUp {
				  from {
					transform: translateY(100%);
				  }
				  to {
					transform: translateY(0);
				  }
				}
			  `}</style>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center border border-gray-300 rounded-md">
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									decrementQuantity(product.id, quantities, setQuantities);
								}}
								className="px-3 py-1 text-gray-600 hover:bg-gray-100"
								disabled={quantities[product.id] <= 1}
							>
								<FaMinus size={12} />
							</button>
							<span className="px-3 py-1 text-gray-800">
								{quantities[product.id] || 1}
							</span>
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									incrementQuantity(product.id, quantities, setQuantities);
								}}
								className="px-3 py-1 text-gray-600 hover:bg-gray-100"
							>
								<FaPlus size={12} />
							</button>
						</div>
						<span className="font-medium text-gray-800">
							$
							{formatPrice(
								(product.price || 0) * (quantities[product.id] || 1)
							)}
						</span>
					</div>
					<button
						onClick={(e) => handleAddToCart(e, product.id)}
						className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md font-medium transition-colors"
					>
						Add to Cart
					</button>
				</div>
			)}
		</motion.div>
	);
	const renderListProductCard = (product) => (
		<motion.div
			key={product.id}
			whileHover={{ y: -2 }}
			transition={{ duration: 0.2 }}
			className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow relative flex"
		>
			{/* Product Image - Smaller for list view */}
			<div className="relative w-32 h-32 flex-shrink-0">
				<img
					src={
						product.image_file ||
						product.image_url ||
						"https://via.placeholder.com/300?text=No+Image"
					}
					alt={product.name}
					className="w-full h-full object-cover"
				/>
				{/* Category Tag */}
				{product.category && (
					<div className="absolute top-2 left-2">
						<span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
							{Array.isArray(product.category) && product.category.length > 0
								? product.category[0].name
								: product.category.name || "Product"}
						</span>
					</div>
				)}
			</div>

			{/* Product Info - More space in list view */}
			<div className="flex-grow p-4 flex flex-col justify-between">
				<div>
					<Link
						to={`/product/${encodeURIComponent(product.name)}`}
						className="block"
						onClick={(e) => showQuickAdd[product.id] && e.preventDefault()}
					>
						<h3 className="text-lg font-semibold text-gray-900 mb-1">
							{product.name}
						</h3>
						<p className="text-gray-500 text-sm line-clamp-2">
							{product.description || "No description available."}
						</p>
					</Link>
				</div>
				<div className="flex items-center justify-between mt-2">
					<p className="text-green-600 font-bold">
						${formatPrice(product.price)}
					</p>
					<button
						onClick={(e) => toggleQuickAdd(product.id, e)}
						className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
						aria-label={
							showQuickAdd[product.id] ? "Close quick add" : "Quick add"
						}
					>
						{showQuickAdd[product.id] ? (
							<span className="flex items-center text-sm font-medium text-red-500">
								<svg
									className="w-5 h-5 mr-1"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								Close
							</span>
						) : (
							<span className="flex items-center text-sm font-medium">
								<FaShoppingCart className="mr-1" /> Add
							</span>
						)}
					</button>
				</div>
			</div>

			{/* Quick Add Panel for List View - Positioned differently */}
			{showQuickAdd[product.id] && (
				<div
					className="absolute right-4 bottom-4 p-4 bg-white rounded-lg border border-gray-200 shadow-lg z-20"
					style={{
						width: "220px",
						animation: "fadeIn 0.2s forwards",
					}}
				>
					<style>{`
				@keyframes fadeIn {
				  from {
					opacity: 0;
					transform: translateY(10px);
				  }
				  to {
					opacity: 1;
					transform: translateY(0);
				  }
				}
			  `}</style>
					{/* Close button in the panel itself */}
					<button
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							toggleQuickAdd(product.id, e);
						}}
						className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
						aria-label="Close quick add panel"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>

					<div className="flex items-center justify-between mb-3 mt-1">
						<div className="flex items-center border border-gray-300 rounded-md">
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									decrementQuantity(product.id, quantities, setQuantities);
								}}
								className="px-2 py-1 text-gray-600 hover:bg-gray-100"
								disabled={quantities[product.id] <= 1}
							>
								<FaMinus size={10} />
							</button>
							<span className="px-2 py-1 text-sm text-gray-800">
								{quantities[product.id] || 1}
							</span>
							<button
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									incrementQuantity(product.id, quantities, setQuantities);
								}}
								className="px-2 py-1 text-gray-600 hover:bg-gray-100"
							>
								<FaPlus size={10} />
							</button>
						</div>
						<span className="text-sm font-medium text-gray-800">
							$
							{formatPrice(
								(product.price || 0) * (quantities[product.id] || 1)
							)}
						</span>
					</div>
					<button
						onClick={(e) => handleAddToCart(e, product.id)}
						className="w-full bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-md text-sm font-medium transition-colors"
					>
						Add to Cart
					</button>
				</div>
			)}
		</motion.div>
	);

	// Choose the rendering function based on activeView
	const renderProductCard = (product) => {
		return activeView === "grid"
			? renderGridProductCard(product)
			: renderListProductCard(product);
	};
	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Search Bar */}
			<div className="mb-8">
				<div className="relative max-w-md mx-auto">
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<FaSearch className="text-gray-400" />
					</div>
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search menu items..."
						className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
					/>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="absolute inset-y-0 right-0 pr-3 flex items-center"
						>
							<svg
								className="h-5 w-5 text-gray-400 hover:text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>

			{/* Loading State */}
			{isLoading ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
				</div>
			) : products.length === 0 ? (
				<div className="text-center py-12">
					<svg
						className="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 className="mt-2 text-lg font-medium text-gray-900">
						No products available
					</h3>
					<p className="mt-1 text-sm text-gray-500">
						We're working on adding more items to our menu.
					</p>
				</div>
			) : (
				<>
					{/* Products Grid or Categorized Display */}
					{searchTerm || selectedCategory ? (
						// When searching or filtering by category, show a simple grid/list
						<>
							{Array.isArray(displayProducts) && displayProducts.length > 0 ? (
								<div>
									<h2 className="text-2xl font-bold text-gray-900 mb-6">
										{searchTerm
											? `Search Results for "${searchTerm}"`
											: selectedCategory
											? `${
													products.find((p) =>
														Array.isArray(p.category)
															? p.category.some(
																	(c) => c.id === selectedCategory
															  )
															: p.category?.id === selectedCategory
													)?.category[0]?.name || "Category"
											  } Items`
											: "All Items"}
									</h2>
									<div
										className={`
							${
								activeView === "grid"
									? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
									: "flex flex-col space-y-4"
							}
						  `}
									>
										{displayProducts.map((product) =>
											renderProductCard(product)
										)}
									</div>
								</div>
							) : (
								<div className="text-center py-12">
									{/* ...no results display... */}
								</div>
							)}
						</>
					) : (
						// When showing all products, group by category
						Object.keys(displayProducts).map((category) => (
							<div
								key={category}
								className="mb-12"
							>
								<div className="flex items-center justify-between mb-6">
									<h2 className="text-2xl font-bold text-gray-900">
										{category}
									</h2>
									<Link
										to="#"
										className="text-green-600 hover:text-green-700 text-sm font-medium"
										onClick={(e) => {
											e.preventDefault();
											// Get the first product in this category
											const firstProduct = displayProducts[category][0];

											// Extract category ID, handling both object and array formats
											let categoryId = null;
											if (firstProduct) {
												// Handle case where category is an object (from website API)
												if (
													firstProduct.category &&
													!Array.isArray(firstProduct.category)
												) {
													categoryId = firstProduct.category.id;
												}
												// Handle case where category is an array (from old format)
												else if (
													firstProduct.category &&
													Array.isArray(firstProduct.category) &&
													firstProduct.category.length > 0
												) {
													categoryId = firstProduct.category[0].id;
												}

												// Set the selected category if we found a valid ID
												if (categoryId) {
													setSelectedCategory(categoryId);
												}
											}
										}}
									>
										View All
									</Link>
								</div>
								<div
									className={`
						  ${
								activeView === "grid"
									? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
									: "flex flex-col space-y-4"
							}
						`}
								>
									{displayProducts[category].map((product) =>
										renderProductCard(product)
									)}
								</div>
							</div>
						))
					)}
				</>
			)}
		</div>
	);
};
export default ProductList;
