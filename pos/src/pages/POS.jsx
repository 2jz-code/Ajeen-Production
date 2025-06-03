"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCartStore } from "../store/cartStore";
import Cart from "../features/cart/components/Cart";
import axiosInstance from "../api/config/axiosConfig";
import { ENDPOINTS } from "../api/config/apiEndpoints";
import { useCustomerCartDisplay } from "../features/customerDisplay/hooks/useCustomerCartDisplay";
import { toast } from "react-toastify";
import { formatPrice } from "../utils/numberUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import POSLayout from "./layout/POSLayout";

import { Card, CardContent } from "@/components/ui/card";
import { Package, Loader2, Scan, Search as SearchIcon } from "lucide-react";

export default function POS() {
	const [productsData, setProductsData] = useState({});
	const { showOverlay } = useCartStore();
	const addToCartAction = useCartStore((state) => state.addToCart);
	const { updateCartDisplay } = useCustomerCartDisplay();
	const isMountedRef = useRef(false);

	const [isFetchingProductByBarcode, setIsFetchingProductByBarcode] =
		useState(false);
	const [isModalOpen] = useState(false);

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
	}, [useCartStore((state) => state.cart), updateCartDisplay]);

	useEffect(() => {
		if (isMountedRef.current) {
			axiosInstance
				.get(ENDPOINTS.PRODUCTS.LIST)
				.then((response) => {
					if (isMountedRef.current) {
						const productList = response.data || [];
						const groupedProducts = productList.reduce((acc, product) => {
							const categoryName = product.category_name || "Uncategorized";
							if (!acc[categoryName]) acc[categoryName] = [];
							acc[categoryName].push(product);
							return acc;
						}, {});
						setProductsData(groupedProducts);
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

	const processedProductsForDisplay = useMemo(() => {
		const result = [];
		const DRINKS_CATEGORY_NAME_LOWER = "drinks"; // Used for case-insensitive matching

		if (!posSelectedCategory) {
			// "All Products" tab
			let productsToConsider = [];
			// Iterate over all categories in productsData
			for (const categoryNameKey in productsData) {
				// Exclude products from a category explicitly named "Grocery" (case-insensitive)
				if (categoryNameKey.toLowerCase() !== "grocery") {
					productsToConsider.push(...productsData[categoryNameKey]);
				}
			}

			// Apply search query if present
			if (posSearchQuery) {
				const lowerCaseQuery = posSearchQuery.toLowerCase();
				productsToConsider = productsToConsider.filter(
					(product) =>
						product.name.toLowerCase().includes(lowerCaseQuery) ||
						(product.barcode && product.barcode.includes(posSearchQuery))
				);
			}

			// Group the filtered products by their original category_name
			const groupedAfterSearch = productsToConsider.reduce((acc, product) => {
				const categoryName = product.category_name || "Uncategorized";
				if (!acc[categoryName]) {
					acc[categoryName] = [];
				}
				acc[categoryName].push(product);
				return acc;
			}, {});

			for (const categoryNameKey in groupedAfterSearch) {
				const currentProductsInGroup = groupedAfterSearch[categoryNameKey];
				if (currentProductsInGroup.length > 0) {
					if (categoryNameKey.toLowerCase() === DRINKS_CATEGORY_NAME_LOWER) {
						const freshDrinks = [];
						const groceryDrinks = [];
						currentProductsInGroup.forEach((p) => {
							if (p.is_grocery_item) {
								// Differentiate based on is_grocery_item
								groceryDrinks.push(p);
							} else {
								freshDrinks.push(p);
							}
						});

						const subGroups = [];
						if (freshDrinks.length > 0)
							subGroups.push({
								subHeading: "Fresh Drinks",
								products: freshDrinks,
							});
						if (groceryDrinks.length > 0)
							subGroups.push({
								subHeading: "Grocery Drinks",
								products: groceryDrinks,
							});

						if (subGroups.length > 0) {
							result.push({
								categoryName: categoryNameKey, // e.g., "Drinks"
								isDrinksCategory: true,
								subGroups,
							});
						} else if (currentProductsInGroup.length > 0) {
							// Fallback: If Drinks category has products but no sub-groups were formed
							result.push({
								categoryName: categoryNameKey,
								products: currentProductsInGroup,
							});
						}
					} else {
						// Not the "Drinks" category
						result.push({
							categoryName: categoryNameKey,
							products: currentProductsInGroup,
						});
					}
				}
			}
			result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
		} else {
			// Specific category selected (posSelectedCategory has a value)
			let categoryProducts = productsData[posSelectedCategory] || [];
			if (posSearchQuery) {
				const lowerCaseQuery = posSearchQuery.toLowerCase();
				categoryProducts = categoryProducts.filter(
					(product) =>
						product.name.toLowerCase().includes(lowerCaseQuery) ||
						(product.barcode && product.barcode.includes(posSearchQuery))
				);
			}

			if (categoryProducts.length > 0) {
				if (posSelectedCategory.toLowerCase() === DRINKS_CATEGORY_NAME_LOWER) {
					// Selected category is "Drinks", apply sub-grouping
					const freshDrinks = [];
					const groceryDrinks = [];
					categoryProducts.forEach((p) => {
						if (p.is_grocery_item) {
							groceryDrinks.push(p);
						} else {
							freshDrinks.push(p);
						}
					});
					const subGroups = [];
					if (freshDrinks.length > 0)
						subGroups.push({
							subHeading: "Fresh Drinks",
							products: freshDrinks,
						});
					if (groceryDrinks.length > 0)
						subGroups.push({
							subHeading: "Grocery Drinks",
							products: groceryDrinks,
						});

					if (subGroups.length > 0) {
						result.push({
							categoryName: posSelectedCategory,
							isDrinksCategory: true,
							subGroups,
						});
					} else if (categoryProducts.length > 0) {
						// Fallback: If selected "Drinks" category has products but no sub-groups
						result.push({
							categoryName: posSelectedCategory,
							products: categoryProducts,
						});
					}
				} else {
					// Any other specific category
					result.push({
						categoryName: posSelectedCategory,
						products: categoryProducts,
					});
				}
			}
		}
		return result;
	}, [productsData, posSelectedCategory, posSearchQuery]);

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
			setPosSearchQuery("");

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
				if (isMountedRef.current) {
					setIsFetchingProductByBarcode(false);
				}
			}
		},
		[isFetchingProductByBarcode, addToCartAction, showOverlay]
	);

	const isBarcodeScanningActive =
		!showOverlay && !isModalOpen && !isFetchingProductByBarcode;

	useBarcodeScanner(onBarcodeScannedHandler, isBarcodeScanningActive);

	const noProductsMatchFilters =
		Object.keys(productsData).length > 0 &&
		processedProductsForDisplay.length === 0 &&
		(posSearchQuery || posSelectedCategory);

	const noProductsAvailableAtAll =
		Object.keys(productsData).length > 0 &&
		processedProductsForDisplay.length === 0 &&
		!posSearchQuery &&
		!posSelectedCategory;

	return (
		<POSLayout
			searchQuery={posSearchQuery}
			onSearchChange={(e) => setPosSearchQuery(e.target.value)}
			selectedCategory={posSelectedCategory}
			onCategoryChange={setPosSelectedCategory}
			isFetchingProductByBarcode={isFetchingProductByBarcode}
		>
			<div className="flex flex-1 h-full overflow-hidden">
				<div className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100/50 relative">
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

					{Object.keys(productsData).length === 0 &&
						!isFetchingProductByBarcode && (
							<div className="flex items-center justify-center h-[calc(100vh-200px)]">
								<div className="text-center">
									<Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-xl font-semibold mb-2">
										Loading Products
									</h3>
									<p className="text-muted-foreground">
										Please wait while we load your inventory...
									</p>
								</div>
							</div>
						)}

					{noProductsMatchFilters && (
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

					{noProductsAvailableAtAll && (
						<div className="flex items-center justify-center h-[calc(100vh-200px)]">
							<div className="text-center">
								<Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
								<h3 className="text-xl font-semibold mb-2">
									No Products Available
								</h3>
								<p className="text-muted-foreground">
									There are no products to display in the system.
								</p>
							</div>
						</div>
					)}

					{processedProductsForDisplay.map(
						({
							categoryName,
							products: productList,
							isDrinksCategory,
							subGroups,
						}) => (
							<div
								key={categoryName}
								className="mb-8"
							>
								{/* Main Category Heading */}
								{(productList?.length > 0 || subGroups?.length > 0) && ( // Only show heading if there's content
									<h2 className="text-xl font-semibold my-3 border-b pb-2 text-slate-700">
										{categoryName}
									</h2>
								)}
								{isDrinksCategory && subGroups && subGroups.length > 0 ? (
									// Render Drinks category with its sub-groups
									subGroups.map(
										({ subHeading, products: subProductList }) =>
											subProductList.length > 0 && ( // Only render sub-group if it has products
												<div
													key={subHeading}
													className="mb-6"
												>
													<h3 className="text-lg font-medium text-slate-600 my-2 pt-2 border-t border-slate-100">
														{" "}
														{/* Sub-sub-heading */}
														{subHeading}
														<span className="text-sm font-normal text-slate-500 ml-2">
															({subProductList.length} items)
														</span>
													</h3>
													<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
														{subProductList.map((product) => (
															// YOUR POS PRODUCT CARD (motion.div and its content)
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
												</div>
											)
									)
								) : productList && productList.length > 0 ? (
									// Render other categories (or Drinks if it had no matching sub-groups but still had products)
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
										{productList.map((product) => (
											// YOUR POS PRODUCT CARD (motion.div and its content)
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
								) : null}{" "}
								{/* End of conditional rendering for category/subgroup content */}
							</div>
						)
					)}
				</div>
				<div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg bg-background border-l border-border flex flex-col shadow-xl h-full">
					<Cart />
				</div>
			</div>
		</POSLayout>
	);
}
