import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	FaShoppingBag,
	FaShoppingCart,
	FaMinus,
	FaPlus,
	FaSearch,
	FaTimes,
} from "react-icons/fa"; // Added FaTimes
import {
	addToCart,
	fetchProducts,
	groupByCategory,
} from "../utility/CartUtils";

const ProductList = ({
	categories, // Expecting categories to be passed from ProductPage
	selectedCategory,
	updateCartItemCount,
	setSelectedCategory,
	activeView = "grid",
}) => {
	const [products, setProducts] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [quantities, setQuantities] = useState({});
	const [searchTerm, setSearchTerm] = useState("");
	const [showQuickAdd, setShowQuickAdd] = useState({});
	// eslint-disable-next-line no-unused-vars
	const navigate = useNavigate();

	useEffect(() => {
		fetchProducts(setProducts, setQuantities, setIsLoading);
	}, []);

	useEffect(() => {
		if (products.length > 0 && Object.keys(quantities).length === 0) {
			const initialQuantities = {};
			products.forEach((product) => {
				initialQuantities[product.id] = 1;
			});
			setQuantities(initialQuantities);
		}
	}, [products, quantities]);

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		if (isNaN(numericPrice)) return "0.00";
		return numericPrice.toFixed(2);
	};

	const incrementQuantity = (productId) => {
		setQuantities((prev) => ({
			...prev,
			[productId]: Math.min((prev[productId] || 1) + 1, 10),
		}));
	};

	const decrementQuantity = (productId) => {
		setQuantities((prev) => ({
			...prev,
			[productId]: Math.max((prev[productId] || 2) - 1, 1),
		}));
	};

	const handleAddToCart = async (e, productId) => {
		e.stopPropagation();
		e.preventDefault();
		try {
			await addToCart(
				productId,
				quantities[productId] || 1,
				updateCartItemCount
			);
			setQuantities((prevQuantities) => ({
				...prevQuantities,
				[productId]: 1,
			}));
			setShowQuickAdd((prev) => ({ ...prev, [productId]: false }));
		} catch (error) {
			console.error("Add to cart failed in ProductList:", error);
		}
	};

	const toggleQuickAdd = (productId, e) => {
		e.stopPropagation();
		e.preventDefault();
		setShowQuickAdd((prev) => {
			const newState = Object.keys(prev).reduce((acc, key) => {
				acc[key] = false;
				return acc;
			}, {});
			newState[productId] = !prev[productId];
			return newState;
		});
	};

	const filterBySearch = (productsToFilter) => {
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
		let productsToDisplay = [...products];

		if (selectedCategory) {
			productsToDisplay = productsToDisplay.filter((product) => {
				if (product.category && !Array.isArray(product.category)) {
					return product.category.id === selectedCategory;
				} else if (product.category && Array.isArray(product.category)) {
					return product.category.some(
						(cat) => cat && cat.id === selectedCategory
					);
				}
				return false;
			});
		}

		productsToDisplay = filterBySearch(productsToDisplay);

		if (selectedCategory || searchTerm) {
			return productsToDisplay;
		} else {
			return groupByCategory(productsToDisplay);
		}
	};

	const displayProducts = getDisplayProducts();

	const renderGridProductCard = (product) => (
		<motion.div
			key={product.id}
			layout
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.3 }}
			className="bg-primary-beige rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow relative border border-accent-subtle-gray/20 flex flex-col justify-between"
		>
			<Link
				to={`/product/${encodeURIComponent(product.name)}`}
				className="h-full flex flex-col"
				onClick={(e) => showQuickAdd[product.id] && e.preventDefault()}
			>
				<div className="relative aspect-w-4 aspect-h-3 bg-accent-subtle-gray/30">
					<img
						src={
							product.image_file ||
							product.image_url ||
							`https://placehold.co/600x400/${"F3E1CA".substring(
								1
							)}/${"5E6650".substring(1)}?text=${encodeURIComponent(
								product.name
							)}`
						}
						alt={product.name}
						className="w-full h-48 object-cover"
						onError={(e) => {
							e.target.onerror = null;
							e.target.src = `https://placehold.co/600x400/${"F3E1CA".substring(
								1
							)}/${"5E6650".substring(1)}?text=Image+Not+Found`;
						}}
					/>
					{product.category && (
						<div className="absolute top-2 left-2">
							<span className="inline-block bg-primary-green/20 text-primary-green text-xs px-2.5 py-1 rounded-full font-medium">
								{Array.isArray(product.category) && product.category.length > 0
									? product.category[0].name
									: product.category.name || "Product"}
							</span>
						</div>
					)}
				</div>

				<div className="p-4 flex-grow flex flex-col justify-between">
					<div>
						<h3 className="text-lg font-semibold text-accent-dark-green mb-1 line-clamp-1">
							{product.name}
						</h3>
						<p className="text-primary-green font-bold text-xl mb-2">
							${formatPrice(product.price)}
						</p>
						<p className="text-accent-dark-brown text-sm line-clamp-2 h-10 mb-3">
							{product.description || "No description available."}
						</p>
					</div>
				</div>
			</Link>
			<div className="p-4 pt-0 mt-auto">
				<button
					onClick={(e) => toggleQuickAdd(product.id, e)}
					className="w-full flex items-center justify-center text-sm font-medium py-2 px-3 rounded-md bg-accent-light-beige hover:bg-primary-beige/70 text-accent-dark-green border border-accent-subtle-gray/50 transition-colors"
					aria-label="Quick add"
				>
					<FaShoppingCart className="mr-2" /> Quick Add
				</button>
			</div>

			<AnimatePresence>
				{showQuickAdd[product.id] && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						className="absolute bottom-0 left-0 right-0 p-4 bg-accent-light-beige border-t border-accent-subtle-gray shadow-lg z-20 rounded-b-xl"
					>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center border border-accent-subtle-gray rounded-md overflow-hidden">
								<button
									onClick={(e) => {
										e.stopPropagation();
										decrementQuantity(product.id);
									}}
									className="px-3 py-1.5 text-accent-dark-brown hover:bg-primary-beige/50 disabled:opacity-50"
									disabled={quantities[product.id] <= 1}
								>
									<FaMinus size={12} />
								</button>
								<span className="px-4 py-1.5 text-accent-dark-green font-medium bg-white">
									{quantities[product.id] || 1}
								</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										incrementQuantity(product.id);
									}}
									className="px-3 py-1.5 text-accent-dark-brown hover:bg-primary-beige/50"
								>
									<FaPlus size={12} />
								</button>
							</div>
							<span className="font-semibold text-accent-dark-green text-lg">
								$
								{formatPrice(
									(product.price || 0) * (quantities[product.id] || 1)
								)}
							</span>
						</div>
						<button
							onClick={(e) => handleAddToCart(e, product.id)}
							className="w-full bg-primary-green hover:bg-accent-dark-green text-accent-light-beige py-2.5 rounded-md font-medium transition-colors shadow-sm"
						>
							Add to Cart
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);

	const renderListProductCard = (product) => (
		<motion.div
			key={product.id}
			layout
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 20 }}
			transition={{ duration: 0.3 }}
			className="bg-primary-beige rounded-lg shadow-md hover:shadow-lg transition-shadow relative flex border border-accent-subtle-gray/20 overflow-hidden"
		>
			<div className="relative w-32 h-full flex-shrink-0 bg-accent-subtle-gray/30">
				<img
					src={
						product.image_file ||
						product.image_url ||
						`https://placehold.co/300x300/${"F3E1CA".substring(
							1
						)}/${"5E6650".substring(1)}?text=${encodeURIComponent(
							product.name
						)}`
					}
					alt={product.name}
					className="w-full h-full object-cover"
					onError={(e) => {
						e.target.onerror = null;
						e.target.src = `https://placehold.co/300x300/${"F3E1CA".substring(
							1
						)}/${"5E6650".substring(1)}?text=Image+Not+Found`;
					}}
				/>
				{product.category && (
					<div className="absolute top-2 left-2">
						<span className="inline-block bg-primary-green/20 text-primary-green text-xs px-2 py-0.5 rounded-full font-medium">
							{Array.isArray(product.category) && product.category.length > 0
								? product.category[0].name
								: product.category.name || "Product"}
						</span>
					</div>
				)}
			</div>

			<div className="flex-grow p-4 flex flex-col justify-between">
				<div>
					<Link
						to={`/product/${encodeURIComponent(product.name)}`}
						className="block"
						onClick={(e) => showQuickAdd[product.id] && e.preventDefault()}
					>
						<h3 className="text-lg font-semibold text-accent-dark-green mb-1">
							{product.name}
						</h3>
						<p className="text-accent-dark-brown text-sm line-clamp-3 mb-2">
							{product.description || "No description available."}
						</p>
					</Link>
				</div>
				<div className="flex items-end justify-between mt-2">
					<p className="text-primary-green font-bold text-xl">
						${formatPrice(product.price)}
					</p>
					<button
						onClick={(e) => toggleQuickAdd(product.id, e)}
						className="flex items-center text-sm font-medium py-1.5 px-3 rounded-md bg-accent-light-beige hover:bg-primary-beige/70 text-accent-dark-green border border-accent-subtle-gray/50 transition-colors"
						aria-label={
							showQuickAdd[product.id] ? "Close quick add" : "Quick add"
						}
					>
						{showQuickAdd[product.id] ? (
							<>
								{" "}
								<FaTimes className="mr-1.5" /> Close{" "}
							</>
						) : (
							<>
								{" "}
								<FaShoppingCart className="mr-1.5" /> Add{" "}
							</>
						)}
					</button>
				</div>
			</div>

			<AnimatePresence>
				{showQuickAdd[product.id] && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, x: 10 }}
						animate={{ opacity: 1, scale: 1, x: 0 }}
						exit={{ opacity: 0, scale: 0.95, x: 10 }}
						className="absolute right-4 bottom-4 p-4 bg-accent-light-beige rounded-lg border border-accent-subtle-gray shadow-xl z-20 w-60"
					>
						<button
							onClick={(e) => {
								e.stopPropagation();
								toggleQuickAdd(product.id, e);
							}}
							className="absolute top-1.5 right-1.5 text-accent-subtle-gray hover:text-accent-dark-brown p-1"
							aria-label="Close quick add panel"
						>
							<FaTimes size={14} />
						</button>
						<div className="flex items-center justify-between mb-3 mt-1">
							<div className="flex items-center border border-accent-subtle-gray rounded-md overflow-hidden">
								<button
									onClick={(e) => {
										e.stopPropagation();
										decrementQuantity(product.id);
									}}
									className="px-2.5 py-1 text-accent-dark-brown hover:bg-primary-beige/50 disabled:opacity-50"
									disabled={quantities[product.id] <= 1}
								>
									<FaMinus size={10} />
								</button>
								<span className="px-3 py-1 text-sm text-accent-dark-green font-medium bg-white">
									{quantities[product.id] || 1}
								</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										incrementQuantity(product.id);
									}}
									className="px-2.5 py-1 text-accent-dark-brown hover:bg-primary-beige/50"
								>
									<FaPlus size={10} />
								</button>
							</div>
							<span className="text-md font-semibold text-accent-dark-green">
								$
								{formatPrice(
									(product.price || 0) * (quantities[product.id] || 1)
								)}
							</span>
						</div>
						<button
							onClick={(e) => handleAddToCart(e, product.id)}
							className="w-full bg-primary-green hover:bg-accent-dark-green text-accent-light-beige py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
						>
							Add to Cart
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);

	const renderProductCard = (product) => {
		return activeView === "grid"
			? renderGridProductCard(product)
			: renderListProductCard(product);
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div className="mb-8">
				<div className="relative max-w-lg mx-auto">
					<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
						<FaSearch className="text-accent-subtle-gray" />
					</div>
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search menu items..."
						className="block w-full pl-12 pr-10 py-3 border border-accent-subtle-gray rounded-full shadow-sm focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray text-sm"
					/>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="absolute inset-y-0 right-0 pr-4 flex items-center text-accent-subtle-gray hover:text-accent-dark-brown"
						>
							<FaTimes size={14} />
						</button>
					)}
				</div>
			</div>

			{isLoading ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green"></div>
				</div>
			) : products.length === 0 && !searchTerm ? (
				<div className="text-center py-12">
					<FaShoppingBag className="mx-auto h-12 w-12 text-accent-subtle-gray" />
					<h3 className="mt-2 text-lg font-medium text-accent-dark-green">
						No products available
					</h3>
					<p className="mt-1 text-sm text-accent-dark-brown">
						We're working on adding more items to our menu.
					</p>
				</div>
			) : (
				<>
					{Array.isArray(displayProducts) ? (
						<>
							{displayProducts.length > 0 ? (
								<div>
									<h2 className="text-2xl font-bold text-accent-dark-green mb-6">
										{searchTerm
											? `Search Results for "${searchTerm}"`
											: selectedCategory &&
											  categories.find((c) => c.id === selectedCategory) // Check if categories is available and category exists
											? `${
													categories.find((c) => c.id === selectedCategory)
														?.name || "Category"
											  } Items`
											: "All Items"}
									</h2>
									<div
										className={`${
											activeView === "grid"
												? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
												: "flex flex-col space-y-4"
										}`}
									>
										<AnimatePresence>
											{displayProducts.map((product) =>
												renderProductCard(product)
											)}
										</AnimatePresence>
									</div>
								</div>
							) : (
								<div className="text-center py-12">
									<FaSearch className="mx-auto h-12 w-12 text-accent-subtle-gray" />
									<h3 className="mt-2 text-lg font-medium text-accent-dark-green">
										No results for "{searchTerm}"
									</h3>
									<p className="mt-1 text-sm text-accent-dark-brown">
										Try a different search term or browse our categories.
									</p>
								</div>
							)}
						</>
					) : (
						Object.keys(displayProducts).map((categoryName) => (
							<div
								key={categoryName}
								className="mb-12"
							>
								<div className="flex items-center justify-between mb-6 pb-2 border-b border-accent-subtle-gray/30">
									<h2 className="text-2xl font-bold text-accent-dark-green">
										{categoryName}
									</h2>
									<button
										onClick={(e) => {
											e.preventDefault();
											// Ensure categories is defined and is an array before using .find()
											const categoryObject = Array.isArray(categories)
												? categories.find((c) => c.name === categoryName)
												: null;
											if (categoryObject) {
												setSelectedCategory(categoryObject.id);
											}
										}}
										className="text-primary-green hover:text-accent-dark-green text-sm font-medium"
									>
										View All in {categoryName}
									</button>
								</div>
								<div
									className={`${
										activeView === "grid"
											? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
											: "flex flex-col space-y-4"
									}`}
								>
									<AnimatePresence>
										{displayProducts[categoryName].map((product) =>
											renderProductCard(product)
										)}
									</AnimatePresence>
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
