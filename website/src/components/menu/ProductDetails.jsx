import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
	FaArrowLeft,
	FaShoppingCart,
	FaMinus,
	FaPlus,
	FaHeart,
} from "react-icons/fa";
import { addToCart } from "../utility/CartUtils";
import Layout from "./Layout";

const ProductDetails = ({ updateCartItemCount, cartItemCount }) => {
	const { productName } = useParams();
	const [product, setProduct] = useState(null);
	const [quantity, setQuantity] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isFavorite, setIsFavorite] = useState(false);
	const [addingToCart, setAddingToCart] = useState(false);
	const [relatedProducts, setRelatedProducts] = useState([]);
	const navigate = useNavigate();

	// Fetch product data
	useEffect(() => {
		const fetchProduct = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Use website-specific endpoint with encoded product name
				const response = await axios.get(
					`http://localhost:8000/api/website/products/${encodeURIComponent(
						productName
					)}/`
				);
				setProduct(response.data);

				// Fetch related products using the website-specific endpoint
				if (response.data.category && response.data.category.id) {
					const categoryId = response.data.category.id;
					const relatedResponse = await axios.get(
						`http://localhost:8000/api/website/products/?category=${categoryId}`
					);

					// Filter out the current product and limit to 4 related products
					const filteredRelated = relatedResponse.data
						.filter((item) => item.name !== productName)
						.slice(0, 4);

					setRelatedProducts(filteredRelated);
				}
			} catch (error) {
				console.error("Failed to fetch product:", error);
				setError("Failed to load product details. Please try again later.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchProduct();
	}, [productName, updateCartItemCount]);

	const formatPrice = (price) => {
		// Handle various price formats that might come from the API
		if (price === null || price === undefined) {
			return "0.00";
		}

		// If price is a string, convert to number
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;

		// Check if conversion resulted in a valid number
		if (isNaN(numericPrice)) {
			console.warn(`Invalid price format for product: ${product.name}`);
			return "0.00";
		}

		// Now we can safely use toFixed
		return numericPrice.toFixed(2);
	};

	// Handle quantity changes with validation
	const handleQuantityChange = (newQuantity) => {
		// Ensure quantity is between 1 and 10
		if (newQuantity >= 1 && newQuantity <= 10) {
			setQuantity(newQuantity);
		}
	};

	// Handle add to cart with loading state
	const handleAddToCart = async () => {
		try {
			setAddingToCart(true);
			await addToCart(product.id, quantity, updateCartItemCount);
			// Show success feedback
			// You could use a toast notification library here
			alert(`Added ${quantity} ${product.name} to your cart`);
			setQuantity(1);
		} catch (error) {
			console.error("Failed to add to cart:", error);
			alert("Failed to add item to cart. Please try again.");
		} finally {
			setAddingToCart(false);
		}
	};

	// Toggle favorite status
	const toggleFavorite = () => {
		setIsFavorite(!isFavorite);
		// In a real app, you would save this to user preferences
	};

	// Navigate back to menu
	const handleBackToMenu = () => {
		navigate("/menu");
	};

	if (isLoading) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
						<div className="md:flex md:space-x-8">
							<div className="md:w-1/2 h-96 bg-gray-200 rounded-lg mb-6 md:mb-0"></div>
							<div className="md:w-1/2 space-y-4">
								<div className="h-8 bg-gray-200 rounded w-3/4"></div>
								<div className="h-6 bg-gray-200 rounded w-1/4"></div>
								<div className="h-4 bg-gray-200 rounded w-full"></div>
								<div className="h-4 bg-gray-200 rounded w-full"></div>
								<div className="h-4 bg-gray-200 rounded w-3/4"></div>
								<div className="h-12 bg-gray-200 rounded w-1/3 mt-8"></div>
								<div className="h-12 bg-gray-200 rounded w-full mt-4"></div>
							</div>
						</div>
					</div>
				</div>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
					<div className="bg-red-50 p-6 rounded-lg">
						<h2 className="text-xl font-semibold text-red-700 mb-2">
							Error Loading Product
						</h2>
						<p className="text-red-600 mb-4">{error}</p>
						<button
							onClick={handleBackToMenu}
							className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
						>
							Back to Menu
						</button>
					</div>
				</div>
			</Layout>
		);
	}

	if (!product) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
					<p>Product not found.</p>
					<button
						onClick={handleBackToMenu}
						className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
					>
						Back to Menu
					</button>
				</div>
			</Layout>
		);
	}

	return (
		<Layout
			cartItemCount={cartItemCount}
			updateCartItemCount={updateCartItemCount}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Breadcrumb navigation */}
				<nav className="flex items-center text-sm text-gray-500 mb-6">
					<button
						onClick={handleBackToMenu}
						className="flex items-center hover:text-green-600 transition-colors"
					>
						<FaArrowLeft className="mr-2" />
						Back to Menu
					</button>
					<span className="mx-2">/</span>
					<span>{product.category[0]?.name || "Products"}</span>
					<span className="mx-2">/</span>
					<span className="text-gray-900 font-medium">{product.name}</span>
				</nav>

				{/* Product details section */}
				<div className="bg-white rounded-xl shadow-sm overflow-hidden">
					<div className="md:flex">
						{/* Product image */}
						<div className="md:w-1/2 relative group">
							<div className="aspect-w-4 aspect-h-3">
								<img
									src={
										product.image_file ||
										product.image_url ||
										"https://via.placeholder.com/600x400?text=No+Image"
									}
									alt={product.name}
									className="w-full h-full object-cover"
								/>
							</div>

							{/* Favorite button */}
							<button
								onClick={toggleFavorite}
								className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
								aria-label={
									isFavorite ? "Remove from favorites" : "Add to favorites"
								}
							>
								<FaHeart
									size={20}
									className={isFavorite ? "text-red-500" : "text-gray-300"}
								/>
							</button>
						</div>

						{/* Product info */}
						<div className="md:w-1/2 p-6 md:p-8">
							{/* Category tag */}
							{product.category && (
								<div className="mb-2">
									<span>
										{Array.isArray(product.category) &&
										product.category.length > 0
											? product.category[0].name
											: product.category && product.category.name
											? product.category.name
											: "Products"}
									</span>
								</div>
							)}

							{/* Product name and price */}
							<h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
								{product.name}
							</h1>
							<p className="text-2xl font-bold text-green-600 mb-4">
								${formatPrice(product.price)}
							</p>

							{/* Product description */}
							<div className="prose prose-sm text-gray-600 mb-6">
								<p>{product.description || "No description available."}</p>
							</div>

							{/* Nutritional info or additional details could go here */}

							{/* Quantity selector - Modern Pill Design */}
							<div className="mb-6">
								<label
									htmlFor="quantity"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Quantity
								</label>
								<div className="flex items-center">
									<div className="inline-flex items-center bg-gray-100 rounded-full p-1">
										<button
											onClick={() => handleQuantityChange(quantity - 1)}
											disabled={quantity <= 1}
											className={`p-2 rounded-full transition-colors focus:outline-none ${
												quantity <= 1
													? "text-gray-400 cursor-not-allowed"
													: "text-gray-700 hover:bg-white hover:shadow-sm active:bg-gray-50"
											}`}
											aria-label="Decrease quantity"
										>
											<FaMinus size={12} />
										</button>

										<div className="px-4 font-medium text-gray-800">
											{quantity}
										</div>

										<button
											onClick={() => handleQuantityChange(quantity + 1)}
											disabled={quantity >= 10}
											className={`p-2 rounded-full transition-colors focus:outline-none ${
												quantity >= 10
													? "text-gray-400 cursor-not-allowed"
													: "text-gray-700 hover:bg-white hover:shadow-sm active:bg-gray-50"
											}`}
											aria-label="Increase quantity"
										>
											<FaPlus size={12} />
										</button>
									</div>

									<div className="ml-4 text-sm text-gray-500">
										{quantity >= 10 && <span>Max quantity: 10</span>}
									</div>
								</div>
							</div>

							{/* Add to cart button */}
							<motion.button
								onClick={handleAddToCart}
								disabled={addingToCart}
								className={`w-full flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium ${
									addingToCart
										? "bg-gray-400"
										: "bg-green-500 hover:bg-green-600"
								} transition-colors shadow-md`}
								whileTap={{ scale: 0.98 }}
							>
								{addingToCart ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Adding to Cart...
									</>
								) : (
									<>
										<FaShoppingCart className="mr-2" />
										Add to Cart
									</>
								)}
							</motion.button>
						</div>
					</div>
				</div>

				{/* Related Products Section */}
				{relatedProducts.length > 0 && (
					<div className="mt-12">
						<h2 className="text-2xl font-bold text-gray-900 mb-6">
							You May Also Like
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
							{relatedProducts.map((relatedProduct) => (
								<motion.div
									key={relatedProduct.id}
									whileHover={{ scale: 1.03 }}
									className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
									onClick={() =>
										navigate(
											`/product/${encodeURIComponent(relatedProduct.name)}`
										)
									}
								>
									<div className="aspect-w-1 aspect-h-1 w-full">
										<img
											src={
												relatedProduct.image_file ||
												relatedProduct.image_url ||
												"https://via.placeholder.com/300?text=No+Image"
											}
											alt={relatedProduct.name}
											className="w-full h-48 object-cover"
										/>
									</div>
									<div className="p-4">
										<h3 className="text-lg font-semibold text-gray-900 mb-1">
											{relatedProduct.name}
										</h3>
										<p className="text-green-600 font-bold">
											${formatPrice(relatedProduct.price)}
										</p>
										<p className="text-gray-500 text-sm line-clamp-2 mt-1">
											{relatedProduct.description ||
												"No description available."}
										</p>
										<button
											className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-1.5 px-3 rounded text-sm font-medium transition-colors"
											onClick={(e) => {
												e.stopPropagation();
												navigate(
													`/product/${encodeURIComponent(relatedProduct.name)}`
												);
											}}
										>
											View Details
										</button>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				)}
			</div>
		</Layout>
	);
};

export default ProductDetails;
