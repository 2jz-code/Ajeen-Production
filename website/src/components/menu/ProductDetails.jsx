import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
	FaArrowLeft,
	FaShoppingCart,
	FaMinus,
	FaPlus,
	FaHeart,
} from "react-icons/fa";
import { addToCart } from "../utility/CartUtils"; // Assuming path is correct
import Layout from "./Layout"; // Assuming path is correct
import axiosInstance from "../../api/api"; // Assuming path is correct
import { toast } from "react-toastify"; // Assuming toast is configured

const ProductDetails = ({ updateCartItemCount, cartItemCount }) => {
	const { productName } = useParams();
	const [product, setProduct] = useState(null);
	const [quantity, setQuantity] = useState(1);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isFavorite, setIsFavorite] = useState(false); // Add backend integration for this later
	const [addingToCart, setAddingToCart] = useState(false);
	const [relatedProducts, setRelatedProducts] = useState([]);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchProduct = async () => {
			try {
				setIsLoading(true);
				setError(null);
				setProduct(null); // Reset product on name change
				setRelatedProducts([]); // Reset related products

				const response = await axiosInstance.get(
					`website/products/${encodeURIComponent(productName)}/`
				);
				setProduct(response.data);

				if (response.data.category && response.data.category.id) {
					const categoryId = response.data.category.id;
					const relatedResponse = await axiosInstance.get(
						`website/products/?category=${categoryId}&limit=5` // Fetch 5 to get 4 + current
					);
					const filteredRelated = relatedResponse.data
						.filter((item) => item.name !== productName) // Filter out current product
						.slice(0, 4); // Take the first 4
					setRelatedProducts(filteredRelated);
				}
			} catch (err) {
				console.error("Failed to fetch product:", err);
				setError("Failed to load product details. Please try again later.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchProduct();
	}, [productName]); // Removed updateCartItemCount from deps as it's not used in fetchProduct

	const formatPrice = (price) => {
		if (price === null || price === undefined) return "0.00";
		const numericPrice = typeof price === "string" ? parseFloat(price) : price;
		return isNaN(numericPrice) ? "0.00" : numericPrice.toFixed(2);
	};

	const handleQuantityChange = (newQuantity) => {
		if (newQuantity >= 1 && newQuantity <= 10) {
			// Max 10
			setQuantity(newQuantity);
		}
	};

	const handleAddToCart = async () => {
		if (!product) return;
		setAddingToCart(true);
		try {
			await addToCart(product.id, quantity, updateCartItemCount);
			toast.success(`${quantity} ${product.name}(s) added to your cart!`);
			setQuantity(1); // Reset quantity
		} catch (err) {
			console.error("Failed to add to cart:", err);
			toast.error("Failed to add item to cart. Please try again.");
		} finally {
			setAddingToCart(false);
		}
	};

	const toggleFavorite = () => {
		setIsFavorite(!isFavorite);
		// Placeholder for backend update
		toast.info(
			isFavorite
				? `${product.name} removed from favorites.`
				: `${product.name} added to favorites!`,
			{ autoClose: 2000 }
		);
	};

	const handleBackToMenu = () => {
		navigate("/menu");
	};

	// Loading State
	if (isLoading) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{/* Skeleton Loader: Using theme colors */}
					<div className="animate-pulse">
						<div className="h-6 bg-accent-subtle-gray/50 rounded w-1/3 mb-6"></div>
						<div className="md:flex md:space-x-8">
							<div className="md:w-1/2">
								<div className="aspect-w-4 aspect-h-3 bg-accent-subtle-gray/50 rounded-lg mb-6 md:mb-0"></div>
							</div>
							<div className="md:w-1/2 space-y-4">
								<div className="h-8 bg-accent-subtle-gray/50 rounded w-3/4"></div>
								<div className="h-10 bg-accent-subtle-gray/50 rounded w-1/4"></div>
								<div className="h-4 bg-accent-subtle-gray/40 rounded w-full"></div>
								<div className="h-4 bg-accent-subtle-gray/40 rounded w-full"></div>
								<div className="h-4 bg-accent-subtle-gray/40 rounded w-5/6"></div>
								<div className="h-12 bg-accent-subtle-gray/50 rounded-md w-1/2 mt-8"></div>
								<div className="h-12 bg-accent-subtle-gray/50 rounded-md w-full mt-4"></div>
							</div>
						</div>
						<div className="mt-12">
							<div className="h-8 bg-accent-subtle-gray/50 rounded w-1/4 mb-6"></div>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
								{[...Array(4)].map((_, i) => (
									<div
										key={i}
										className="bg-accent-subtle-gray/40 rounded-lg h-64"
									></div>
								))}
							</div>
						</div>
					</div>
				</div>
			</Layout>
		);
	}

	// Error State
	if (error) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
					{/* Error message: Standard red theme */}
					<div className="bg-red-100 border border-red-300 text-red-700 p-6 rounded-lg shadow-md">
						<h2 className="text-xl font-semibold mb-2">
							Error Loading Product
						</h2>
						<p className="mb-4">{error}</p>
						<button
							onClick={handleBackToMenu}
							// Button: Primary green background, light beige text
							className="bg-primary-green text-accent-light-beige px-4 py-2 rounded-lg hover:bg-accent-dark-green transition-colors"
						>
							Back to Menu
						</button>
					</div>
				</div>
			</Layout>
		);
	}

	// Product Not Found State
	if (!product) {
		return (
			<Layout
				cartItemCount={cartItemCount}
				updateCartItemCount={updateCartItemCount}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
					<p className="text-accent-dark-brown">Product not found.</p>
					<button
						onClick={handleBackToMenu}
						className="mt-4 bg-primary-green text-accent-light-beige px-4 py-2 rounded-lg hover:bg-accent-dark-green transition-colors"
					>
						Back to Menu
					</button>
				</div>
			</Layout>
		);
	}

	// Determine category name safely
	const categoryName =
		product.category && !Array.isArray(product.category)
			? product.category.name
			: Array.isArray(product.category) && product.category.length > 0
			? product.category[0].name
			: "Products";

	return (
		<Layout
			cartItemCount={cartItemCount}
			updateCartItemCount={updateCartItemCount}
		>
			{/* Page background is handled by Layout (bg-background) */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Breadcrumb navigation: Text primary-green and accent-dark-brown */}
				<nav className="flex items-center text-sm text-accent-dark-brown mb-6">
					<button
						onClick={handleBackToMenu}
						className="flex items-center text-primary-green hover:text-accent-dark-green transition-colors"
					>
						<FaArrowLeft className="mr-2" />
						Back to Menu
					</button>
					<span className="mx-2 text-accent-subtle-gray">/</span>
					<span className="text-primary-green">{categoryName}</span>
					<span className="mx-2 text-accent-subtle-gray">/</span>
					<span className="font-medium text-accent-dark-green">
						{product.name}
					</span>
				</nav>

				{/* Product details section: Card with primary-beige background */}
				<div className="bg-primary-beige rounded-xl shadow-lg overflow-hidden border border-accent-subtle-gray/20">
					<div className="md:flex">
						{/* Product image */}
						<div className="md:w-1/2 relative group bg-accent-subtle-gray/30">
							{" "}
							{/* Image placeholder bg */}
							<div className="aspect-w-4 aspect-h-3">
								{" "}
								{/* Maintain aspect ratio */}
								<img
									src={
										product.image_file ||
										product.image_url ||
										`https://placehold.co/800x600/${"F3E1CA".substring(
											1
										)}/${"5E6650".substring(1)}?text=${encodeURIComponent(
											product.name
										)}`
									}
									alt={product.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.onerror = null;
										e.target.src = `https://placehold.co/800x600/${"F3E1CA".substring(
											1
										)}/${"5E6650".substring(1)}?text=Image+Not+Found`;
									}}
								/>
							</div>
							{/* Favorite button: Light beige bg, subtle gray icon, red when active */}
							<button
								onClick={toggleFavorite}
								className="absolute top-4 right-4 p-2.5 bg-accent-light-beige/80 backdrop-blur-sm rounded-full shadow-md hover:bg-accent-light-beige transition-colors focus:outline-none focus:ring-2 focus:ring-primary-green"
								aria-label={
									isFavorite ? "Remove from favorites" : "Add to favorites"
								}
							>
								<FaHeart
									size={20}
									className={
										isFavorite ? "text-red-500" : "text-accent-subtle-gray"
									}
								/>
							</button>
						</div>

						{/* Product info */}
						<div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
							<div>
								{/* Category tag: Primary green text */}
								{categoryName !== "Products" && (
									<span className="text-sm text-primary-green font-medium tracking-wide uppercase mb-2 block">
										{categoryName}
									</span>
								)}
								{/* Product name: Dark green */}
								<h1 className="text-3xl md:text-4xl font-bold text-accent-dark-green mb-2">
									{product.name}
								</h1>
								{/* Price: Primary green, large and bold */}
								<p className="text-3xl font-bold text-primary-green mb-4">
									${formatPrice(product.price)}
								</p>
								{/* Product description: Dark brown */}
								<div className="prose prose-sm text-accent-dark-brown mb-6 max-w-none">
									<p>{product.description || "No description available."}</p>
								</div>
							</div>

							<div className="mt-auto">
								{/* Quantity selector */}
								<div className="mb-6">
									<label
										htmlFor="quantity"
										className="block text-sm font-medium text-accent-dark-green mb-2"
									>
										Quantity
									</label>
									{/* Quantity controls: Dark brown icons, dark green text on white bg */}
									<div className="flex items-center">
										<div className="inline-flex items-center bg-white border border-accent-subtle-gray rounded-full p-1 shadow-sm">
											<button
												onClick={() => handleQuantityChange(quantity - 1)}
												disabled={quantity <= 1}
												className={`p-2.5 rounded-full transition-colors focus:outline-none ${
													quantity <= 1
														? "text-accent-subtle-gray cursor-not-allowed"
														: "text-accent-dark-brown hover:bg-primary-beige/50 active:bg-primary-beige/70"
												}`}
												aria-label="Decrease quantity"
											>
												<FaMinus size={12} />
											</button>
											<span className="px-5 font-medium text-accent-dark-green text-lg">
												{quantity}
											</span>
											<button
												onClick={() => handleQuantityChange(quantity + 1)}
												disabled={quantity >= 10}
												className={`p-2.5 rounded-full transition-colors focus:outline-none ${
													quantity >= 10
														? "text-accent-subtle-gray cursor-not-allowed"
														: "text-accent-dark-brown hover:bg-primary-beige/50 active:bg-primary-beige/70"
												}`}
												aria-label="Increase quantity"
											>
												<FaPlus size={12} />
											</button>
										</div>
										{quantity >= 10 && (
											<span className="ml-4 text-xs text-red-600">
												Max quantity: 10
											</span>
										)}
									</div>
								</div>

								{/* Add to cart button: Primary green bg, light beige text */}
								<motion.button
									onClick={handleAddToCart}
									disabled={addingToCart}
									className={`w-full flex items-center justify-center px-6 py-3.5 rounded-lg text-accent-light-beige font-semibold ${
										addingToCart
											? "bg-accent-subtle-gray cursor-not-allowed"
											: "bg-primary-green hover:bg-accent-dark-green"
									} transition-colors shadow-md`}
									whileTap={{ scale: 0.98 }}
								>
									{addingToCart ? (
										<>
											<svg
												className="animate-spin -ml-1 mr-3 h-5 w-5"
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
											Adding...
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
				</div>

				{/* Related Products Section */}
				{relatedProducts.length > 0 && (
					<div className="mt-16">
						{/* Heading: Dark Green */}
						<h2 className="text-2xl font-bold text-accent-dark-green mb-6 pb-2 border-b border-accent-subtle-gray/30">
							You May Also Like
						</h2>
						{/* Using similar card styling as ProductList */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
							{relatedProducts.map((relatedProduct) => (
								<motion.div
									key={relatedProduct.id}
									whileHover={{
										y: -3,
										boxShadow:
											"0 10px 15px -3px rgba(var(--color-accent-dark-brown-rgb), 0.1), 0 4px 6px -2px rgba(var(--color-accent-dark-brown-rgb), 0.05)",
									}} // Use CSS var for shadow if defined
									transition={{ duration: 0.2 }}
									// Card: Primary beige bg, subtle border
									className="bg-primary-beige rounded-xl shadow-md overflow-hidden cursor-pointer border border-accent-subtle-gray/20 flex flex-col justify-between"
									onClick={() =>
										navigate(
											`/product/${encodeURIComponent(relatedProduct.name)}`
										)
									}
								>
									<div>
										<div className="aspect-w-1 aspect-h-1 w-full bg-accent-subtle-gray/30">
											{" "}
											{/* Image placeholder bg */}
											<img
												src={
													relatedProduct.image_file ||
													relatedProduct.image_url ||
													`https://placehold.co/400x400/${"F3E1CA".substring(
														1
													)}/${"5E6650".substring(1)}?text=${encodeURIComponent(
														relatedProduct.name
													)}`
												}
												alt={relatedProduct.name}
												className="w-full h-48 object-cover"
												onError={(e) => {
													e.target.onerror = null;
													e.target.src = `https://placehold.co/400x400/${"F3E1CA".substring(
														1
													)}/${"5E6650".substring(1)}?text=Image+Not+Found`;
												}}
											/>
										</div>
										<div className="p-4">
											{/* Name: Dark Green, Price: Primary Green, Desc: Dark Brown */}
											<h3 className="text-md font-semibold text-accent-dark-green mb-1 line-clamp-1">
												{relatedProduct.name}
											</h3>
											<p className="text-primary-green font-bold text-lg">
												${formatPrice(relatedProduct.price)}
											</p>
											<p className="text-accent-dark-brown text-xs line-clamp-2 mt-1 h-8">
												{relatedProduct.description ||
													"No description available."}
											</p>
										</div>
									</div>
									<div className="p-4 pt-0 mt-auto">
										{/* Button: Light beige bg, dark green text */}
										<button
											className="mt-3 w-full bg-accent-light-beige hover:bg-primary-beige/70 text-accent-dark-green py-2 px-3 rounded-md text-xs font-medium transition-colors border border-accent-subtle-gray/50"
											onClick={(e) => {
												// Prevent card click when button is clicked
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
