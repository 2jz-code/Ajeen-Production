"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
// useNavigate is not directly used here anymore, can be removed if POSLayout handles all navigation
// import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import Cart from "../features/cart/components/Cart";
import axiosInstance from "../api/config/axiosConfig";
import { ENDPOINTS } from "../api/config/apiEndpoints";
import { useCustomerCartDisplay } from "../features/customerDisplay/hooks/useCustomerCartDisplay";
// LogoutButton is now part of POSLayout
// import LogoutButton from "../components/LogoutButton";
import { toast } from "react-toastify";
import { formatPrice } from "../utils/numberUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import POSLayout from "./layout/POSLayout";

// Removed ShadCN UI imports that are now handled by POSLayout or not needed here
import { Card, CardContent } from "@/components/ui/card";
import {
	Package, // Keep for product grid placeholders
	Loader2,
	Scan,
	Search as SearchIcon, // If using an icon for no search results
} from "lucide-react";

export default function POS() {
	// States managed by POSLayout are removed from here if passed as props by POSLayout
	// const [categories, setCategories] = useState([]); // Now in POSLayout
	// const [selectedCategory, setSelectedCategory] = useState(""); // Now in POSLayout
	// const [searchQuery, setSearchQuery] = useState(""); // Now in POSLayout

	const [products, setProducts] = useState({}); // POS still fetches and manages products

	const { showOverlay } = useCartStore();
	// orderId, cart are accessed from POSLayout's footer via useCartStore directly
	const addToCartAction = useCartStore((state) => state.addToCart);
	const { updateCartDisplay } = useCustomerCartDisplay();
	const isMountedRef = useRef(false);

	const [isFetchingProductByBarcode, setIsFetchingProductByBarcode] =
		useState(false);
	const [isModalOpen] = useState(false); // Placeholder

	// States for search and category to be passed to POSLayout and received back
	const [posSearchQuery, setPosSearchQuery] = useState("");
	const [posSelectedCategory, setPosSelectedCategory] = useState("");

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
	}, [useCartStore((state) => state.cart), updateCartDisplay]); // Listen to cart changes directly

	// Fetch products (categories are fetched in POSLayout now)
	useEffect(() => {
		if (isMountedRef.current) {
			axiosInstance
				.get(ENDPOINTS.PRODUCTS.LIST)
				.then((response) => {
					if (isMountedRef.current) {
						const productData = response.data || [];
						const groupedProducts = productData.reduce((acc, product) => {
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
		if (!posSelectedCategory) {
			// Use state managed by POSLayout, passed as prop
			itemsToFilter = Object.values(products).flat();
		} else if (products[posSelectedCategory]) {
			itemsToFilter = products[posSelectedCategory];
		}

		if (!posSearchQuery) {
			// Use state managed by POSLayout, passed as prop
			return itemsToFilter;
		}

		const lowerCaseQuery = posSearchQuery.toLowerCase();
		return itemsToFilter.filter((product) =>
			product.name.toLowerCase().includes(lowerCaseQuery)
		);
	}, [products, posSelectedCategory, posSearchQuery]);

	const handleAddToCart = useCallback(
		(product) => {
			if (!showOverlay) {
				addToCartAction(product);
			}
		},
		[showOverlay, addToCartAction]
	);

	const onBarcodeScannedHandler = useCallback(
		async (barcode) => {
			if (isFetchingProductByBarcode) return;
			setIsFetchingProductByBarcode(true);
			setPosSearchQuery(""); // Clear search query passed to POSLayout

			try {
				const response = await axiosInstance.get(
					`${ENDPOINTS.PRODUCTS.BY_BARCODE}?barcode=${barcode}`
				);
				if (response.data) {
					if (!showOverlay) {
						addToCartAction(response.data);
					} else {
						toast.info("Please start a new order before adding items.");
					}
				} else {
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

	const isBarcodeScanningActive =
		!showOverlay && !isModalOpen && !isFetchingProductByBarcode;

	useBarcodeScanner(onBarcodeScannedHandler, isBarcodeScanningActive);

	return (
		<POSLayout
			searchQuery={posSearchQuery}
			onSearchChange={(e) => setPosSearchQuery(e.target.value)}
			selectedCategory={posSelectedCategory}
			onCategoryChange={setPosSelectedCategory}
			isFetchingProductByBarcode={isFetchingProductByBarcode}
		>
			<div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 xl:grid-cols-5 gap-0 h-full overflow-hidden">
				{/* Products Grid */}
				<div className="md:col-span-2 lg:col-span-4 xl:col-span-3 p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100/50">
					{/* ... (product listing logic - unchanged from your last version) ... */}
					<AnimatePresence>
						{isFetchingProductByBarcode && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-30 rounded-lg"
							>
								<div className="flex flex-col items-center gap-3 p-6 bg-white rounded-lg shadow-xl">
									<div className="relative">
										<Scan className="h-10 w-10 text-primary" />
										<Loader2 className="h-5 w-5 animate-spin text-primary absolute -top-1 -right-1" />
									</div>
									<p className="text-md font-medium text-foreground">
										Scanning product...
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{Object.keys(products).length === 0 && (
						<div className="flex items-center justify-center h-[calc(100vh-200px)]">
							<div className="text-center">
								<Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-xl font-semibold mb-2">Loading Products</h3>
								<p className="text-muted-foreground">
									Please wait while we load your inventory...
								</p>
							</div>
						</div>
					)}

					{Object.keys(products).length > 0 &&
						filteredProducts.length === 0 &&
						(posSearchQuery || posSelectedCategory) && (
							<div className="flex items-center justify-center h-[calc(100vh-200px)]">
								<div className="text-center">
									<SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-xl font-semibold mb-2">
										No Products Found
									</h3>
									<p className="text-muted-foreground">
										No products match your current filters.
										{posSearchQuery && ` (Search: "${posSearchQuery}")`}
										{posSelectedCategory &&
											` (Category: "${posSelectedCategory}")`}
									</p>
								</div>
							</div>
						)}
					{Object.keys(products).length > 0 &&
						filteredProducts.length === 0 &&
						!posSearchQuery &&
						!posSelectedCategory && (
							<div className="flex items-center justify-center h-[calc(100vh-200px)]">
								<div className="text-center">
									<Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-xl font-semibold mb-2">
										No Products Available
									</h3>
									<p className="text-muted-foreground">
										There are no products to display.
									</p>
								</div>
							</div>
						)}

					{filteredProducts.length > 0 && (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
							{filteredProducts.map((product) => (
								<motion.div
									key={product.id}
									layout
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									whileHover={{ scale: 1.02, y: -2 }}
									whileTap={{ scale: 0.98 }}
									transition={{ duration: 0.2 }}
								>
									<Card
										className={`cursor-pointer transition-all duration-200 hover:shadow-xl border-2 hover:border-primary/50 group ${
											showOverlay || isFetchingProductByBarcode
												? "opacity-60 pointer-events-none"
												: "hover:shadow-primary/10"
										}`}
										onClick={() => handleAddToCart(product)}
									>
										<CardContent className="p-0">
											<div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-t-lg overflow-hidden relative">
												{product.image ? (
													<img
														src={product.image}
														alt={product.name}
														className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
														onError={(e) => {
															e.target.onerror = null;
															e.target.src = `https://placehold.co/300x225/e2e8f0/94a3b8?text=${encodeURIComponent(
																product.name.substring(0, 1)
															)}`;
														}}
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Package className="h-1/2 w-1/2 text-slate-400 dark:text-slate-600" />
													</div>
												)}
												<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											</div>
											<div className="p-3 space-y-1">
												<h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
													{product.name}
												</h3>
												<div className="flex items-center justify-between">
													<span className="text-md font-bold text-primary">
														{formatPrice(Number(product.price))}
													</span>
												</div>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</div>
					)}
				</div>

				{/* Cart Sidebar Column Container - This is the grid item */}
				{/* Added `flex justify-end` to push its child (the cart visual wrapper) to the right */}
				<div className="md:col-span-1 lg:col-span-3 xl:col-span-2 flex justify-end h-full overflow-hidden">
					{/* Cart Visual Wrapper - This div now has the max-width */}
					<div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-background border-l border-border flex flex-col shadow-xl h-full">
						{/* Added responsive max-width classes. `lg:max-w-md` should match the visual size you liked. 
                            You can adjust these (e.g., `xl:max-w-lg` if you want it wider on very large screens) */}
						<Cart />
					</div>
				</div>
			</div>
		</POSLayout>
	);
}
