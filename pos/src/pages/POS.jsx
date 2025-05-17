import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../features/cart/components/Cart";
import axiosInstance from "../api/config/axiosConfig";
import { ENDPOINTS } from "../api/config/apiEndpoints"; // Make sure this is imported
import { useCustomerCartDisplay } from "../features/customerDisplay/hooks/useCustomerCartDisplay";
import LogoutButton from "../components/LogoutButton";
import { toast } from "react-toastify";
import {
	SquaresPlusIcon,
	MagnifyingGlassIcon,
	Bars3Icon,
} from "@heroicons/react/24/outline";
import { formatPrice } from "../utils/numberUtils";
import { motion } from "framer-motion";

// Import the custom hook
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";

// Helper function to get user info (placeholder from your existing code)
const authService = {
	getUserInfo: () => {
		return { username: "Admin" };
	},
};

export default function POS() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState({});
	const [selectedCategory, setSelectedCategory] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const navigate = useNavigate();
	const { showOverlay } = useCartStore();
	const orderId = useCartStore((state) => state.orderId);
	const addToCartAction = useCartStore((state) => state.addToCart);
	const cart = useCartStore((state) => state.cart);
	const { updateCartDisplay } = useCustomerCartDisplay();
	const isMountedRef = useRef(false);

	// State for barcode scanning
	const [isFetchingProductByBarcode, setIsFetchingProductByBarcode] =
		useState(false);

	// State to determine if other critical UI is active (modals, payment flow, etc.)
	// You'll need to manage these states based on your application's modals and flows.
	// For example, if you have a discount modal, its open state would influence this.
	// This is a simplified example.
	const [isModalOpen] = useState(false); // Example: replace with actual modal states

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (isMountedRef.current) {
			updateCartDisplay();
		}
	}, [cart, updateCartDisplay]);

	useEffect(() => {
		if (isMountedRef.current) {
			axiosInstance
				.get(ENDPOINTS.PRODUCTS.CATEGORIES) // Using ENDPOINTS
				.then((response) => {
					if (isMountedRef.current) {
						setCategories(response.data);
						setSelectedCategory("");
					}
				})
				.catch((error) => {
					console.error("Error fetching categories:", error);
					if (isMountedRef.current) {
						toast.error("Could not load categories.");
					}
				});

			axiosInstance
				.get(ENDPOINTS.PRODUCTS.LIST) // Using ENDPOINTS
				.then((response) => {
					if (isMountedRef.current) {
						const groupedProducts = response.data.reduce((acc, product) => {
							const categoryName = product.category_name || "Uncategorized";
							if (!acc[categoryName]) acc[categoryName] = [];
							acc[categoryName].push(product);
							return acc;
						}, {});
						setProducts(groupedProducts);
					}
				})
				.catch((error) => {
					console.error("Error fetching products:", error);
					if (isMountedRef.current) {
						toast.error("Could not load products.");
					}
				});
		}
	}, []);

	const filteredProducts = useMemo(() => {
		let itemsToFilter = [];
		if (!selectedCategory) {
			itemsToFilter = Object.values(products).flat();
		} else if (products[selectedCategory]) {
			itemsToFilter = products[selectedCategory];
		}

		if (!searchQuery) {
			return itemsToFilter;
		}

		const lowerCaseQuery = searchQuery.toLowerCase();
		return itemsToFilter.filter((product) =>
			product.name.toLowerCase().includes(lowerCaseQuery)
		);
	}, [products, selectedCategory, searchQuery]);

	const handleAddToCart = useCallback(
		(product) => {
			if (!showOverlay) {
				// Assuming showOverlay means new order screen, not a general modal
				addToCartAction(product);
			}
		},
		[showOverlay, addToCartAction]
	);

	// Callback for when a barcode is successfully scanned and processed by the hook
	const onBarcodeScannedHandler = useCallback(
		async (barcode) => {
			if (isFetchingProductByBarcode) return; // Prevent multiple simultaneous requests
			console.log("Barcode scanned in POS:", barcode);
			setIsFetchingProductByBarcode(true);
			setSearchQuery(""); // Optionally clear manual search when barcode is used

			try {
				const response = await axiosInstance.get(
					`${ENDPOINTS.PRODUCTS.BY_BARCODE}?barcode=${barcode}`
				);
				if (response.data) {
					// Ensure addToCartAction doesn't add if showOverlay is true (or other conditions)
					if (!showOverlay) {
						addToCartAction(response.data);
					} else {
						toast.info("Please start a new order before adding items.");
					}
				} else {
					// This case might not be hit if backend returns 404, which goes to catch block
					toast.error(`Product with barcode ${barcode} not found.`);
				}
			} catch (error) {
				if (error.response && error.response.status === 404) {
					toast.error(`Product with barcode ${barcode} not found.`);
				} else {
					toast.error("Error looking up barcode.");
					console.error("Error fetching product by barcode:", error);
				}
			} finally {
				setIsFetchingProductByBarcode(false);
			}
		},
		[isFetchingProductByBarcode, addToCartAction, showOverlay]
	);

	// Determine if barcode scanning should be active
	// This needs to be more robust based on your app's state (e.g., payment modals, discount modals)
	const isBarcodeScanningActive =
		!showOverlay && !isModalOpen && !isFetchingProductByBarcode;

	// Initialize the global barcode scanner listener
	useBarcodeScanner(onBarcodeScannedHandler, isBarcodeScanningActive);

	return (
		<div className="flex h-screen bg-slate-100 overflow-hidden">
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4 sticky top-0 z-20 shadow-sm">
					<h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex-shrink-0 mr-4">
						Ajeen POS
					</h1>
					<div className="relative flex-grow sm:flex-grow-0 sm:w-60 md:w-72 lg:w-80 order-3 sm:order-2">
						<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
							<MagnifyingGlassIcon
								className="h-5 w-5 text-slate-400"
								aria-hidden="true"
							/>
						</span>
						<input
							type="text"
							placeholder="Search products..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
							disabled={isFetchingProductByBarcode} // Disable search while fetching by barcode
						/>
					</div>
					<div className="flex items-center gap-3 sm:gap-4 ml-auto order-2 sm:order-3">
						<button
							className="px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-sm"
							onClick={() => navigate("/dashboard")}
							title="Go to Dashboard"
						>
							<Bars3Icon className="h-5 w-5" />
							<span className="hidden sm:inline">Dashboard</span>
						</button>
						<LogoutButton />
					</div>
				</div>
				<div className="bg-white border-b border-slate-200 sticky top-[73px] sm:top-[81px] z-10">
					<div className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-white px-4">
						<button
							key="all-categories"
							className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
								selectedCategory === ""
									? "text-blue-600 border-blue-600"
									: "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
							}`}
							onClick={() => setSelectedCategory("")}
							disabled={isFetchingProductByBarcode}
						>
							All
						</button>
						{categories.map((category) => (
							<button
								key={category.id}
								className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
									selectedCategory === category.name
										? "text-blue-600 border-blue-600"
										: "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300"
								}`}
								onClick={() => setSelectedCategory(category.name)}
								disabled={isFetchingProductByBarcode}
							>
								{category.name}
							</button>
						))}
					</div>
				</div>
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 xl:gap-6 p-4 xl:p-6 overflow-hidden">
					<div className="lg:col-span-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 pr-2">
						{isFetchingProductByBarcode && (
							<div className="absolute inset-0 bg-white/70 flex items-center justify-center z-30">
								<div className="flex flex-col items-center">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
									<p className="text-slate-600 mt-2 text-sm">
										Fetching product...
									</p>
								</div>
							</div>
						)}
						{Object.keys(products).length === 0 && categories.length > 0 && (
							<p className="text-center text-slate-500 pt-10">
								Loading products...
							</p>
						)}
						{Object.keys(products).length === 0 && categories.length === 0 && (
							<p className="text-center text-slate-500 pt-10">
								Loading categories and products...
							</p>
						)}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							searchQuery && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products found for &quot;{searchQuery}&quot;
									{selectedCategory ? ` in ${selectedCategory}` : ""}.
								</p>
							)}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							!searchQuery &&
							selectedCategory && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products currently in the {selectedCategory} category.
								</p>
							)}
						{Object.keys(products).length > 0 &&
							filteredProducts.length === 0 &&
							!searchQuery &&
							!selectedCategory && (
								<p className="col-span-full text-center text-slate-500 mt-10">
									No products found. Add products or select a category.
								</p>
							)}
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
							{filteredProducts.map((product) => (
								<motion.div
									key={product.id}
									className={`bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-lg flex flex-col group relative ${
										showOverlay || isFetchingProductByBarcode
											? "opacity-50 pointer-events-none"
											: ""
									}`}
									onClick={() => handleAddToCart(product)}
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.2 }}
									whileHover={{ y: -3 }}
									layout
								>
									<div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden rounded-t-lg">
										{product.image ? (
											<img
												src={product.image}
												alt={product.name}
												className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
												onError={(e) => {
													e.target.onerror = null;
													e.target.src = `https://placehold.co/300x300/e2e8f0/94a3b8?text=${product.name.charAt(
														0
													)}`;
												}}
											/>
										) : (
											<SquaresPlusIcon className="h-1/2 w-1/2 text-slate-300" />
										)}
									</div>
									<div className="p-3 flex flex-col flex-grow justify-between">
										<h3
											className="text-sm font-medium text-slate-800 mb-1 line-clamp-2"
											title={product.name}
										>
											{product.name}
										</h3>
										<p className="text-base font-semibold text-blue-700 text-left mt-1">
											{typeof formatPrice === "function"
												? formatPrice(Number(product.price))
												: `$${Number(product.price).toFixed(2)}`}
										</p>
									</div>
								</motion.div>
							))}
						</div>
					</div>
					<div className="lg:col-span-2 bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col overflow-hidden h-full">
						<Cart />
					</div>
				</div>
				<div className="bg-slate-800 text-white px-4 py-1.5 flex justify-between items-center text-xs sm:text-sm flex-shrink-0">
					<span>Order #: {orderId || "New"}</span>
					<span>Items: {cart.length}</span>
					<span>User: {authService.getUserInfo()?.username || "N/A"}</span>
				</div>
			</div>
		</div>
	);
}
