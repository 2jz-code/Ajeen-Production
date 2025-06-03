// src/pages/products/Products.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
import { productService } from "../../api/services/productService";
import {
	PencilSquareIcon as PencilSolidIcon,
	TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import {
	PlusIcon,
	AdjustmentsHorizontalIcon,
	ExclamationTriangleIcon,
	EyeIcon,
	ArchiveBoxIcon,
	ArrowUpOnSquareStackIcon,
	ArrowDownTrayIcon,
	ArrowUpTrayIcon,
	EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import CategoryManagementModal from "../../components/CategoryManagementModal";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

const getCategoryColors = (categoryId) => {
	const colors = [
		["border-blue-300", "bg-blue-50", "text-blue-700"],
		["border-emerald-300", "bg-emerald-50", "text-emerald-700"],
		["border-amber-300", "bg-amber-50", "text-amber-700"],
		["border-indigo-300", "bg-indigo-50", "text-indigo-700"],
		["border-pink-300", "bg-pink-50", "text-pink-700"],
		["border-sky-300", "bg-sky-50", "text-sky-700"],
	];
	const id = parseInt(categoryId, 10);
	if (isNaN(id) || id === null) {
		return ["border-slate-300", "bg-slate-100", "text-slate-600"];
	}
	return colors[Math.abs(id) % colors.length];
};

export default function Products() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	const navigate = useNavigate();
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isExporting, setIsExporting] = useState(false);
	const [isImportingCsv, setIsImportingCsv] = useState(false);
	const fileInputRef = useRef(null);

	const pageContentRef = useRef(null);
	const tabsRef = useRef(null);
	const pageHeaderRef = useRef(null);
	const [gridHeight, setGridHeight] = useState("auto");

	const fetchData = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		setError(null);
		try {
			const [categoriesRes, productsRes, authRes] = await Promise.all([
				productService.getProductCategories(),
				productService.getProductsList(),
				authService.checkStatus(),
			]);
			setCategories(categoriesRes || []);
			setProducts(productsRes || []);
			setIsAdmin(authRes.is_admin);
		} catch (err) {
			console.error("Error fetching data:", err);
			setError("Failed to load product data. Please try again.");
		} finally {
			if (showLoading) setLoading(false);
		}
	}, []);

	const handleCategoryChange = useCallback(
		(action, data) => {
			let categoryIdToDelete;
			switch (action) {
				case "add":
					setCategories((prev) => [...prev, data]);
					break;
				case "edit":
					setCategories((prev) =>
						prev.map((cat) =>
							cat.id === data.id ? { ...cat, name: data.name } : cat
						)
					);
					break;
				case "delete":
					categoryIdToDelete = parseInt(data);
					setCategories((prev) =>
						prev.filter((cat) => cat.id !== categoryIdToDelete)
					);
					if (selectedCategory === categoryIdToDelete.toString())
						setSelectedCategory("");
					setProducts((prevProds) =>
						prevProds.filter((p) => {
							const productCategoryId = p.category?.id ?? p.category;
							return productCategoryId !== categoryIdToDelete;
						})
					);
					break;
				default:
					console.error("Unknown category action:", action);
			}
		},
		[selectedCategory]
	);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		const calculateHeight = () => {
			if (pageContentRef.current && tabsRef.current && pageHeaderRef.current) {
				const mainLayoutHeaderHeight = 56;
				const mainLayoutFooterHeight = 40;
				const pageHeaderActualHeight = pageHeaderRef.current.offsetHeight;
				const tabsActualHeight = tabsRef.current.offsetHeight;
				const verticalPadding = 32;
				const availableHeight =
					window.innerHeight -
					mainLayoutHeaderHeight -
					mainLayoutFooterHeight -
					pageHeaderActualHeight -
					tabsActualHeight -
					verticalPadding -
					16;
				setGridHeight(`${Math.max(200, availableHeight)}px`);
			}
		};
		if (!loading) {
			calculateHeight();
			window.addEventListener("resize", calculateHeight);
			return () => window.removeEventListener("resize", calculateHeight);
		}
	}, [loading]);

	const handleDelete = async (productName) => {
		if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
			try {
				await productService.deleteProduct(productName);
				setProducts((prev) => prev.filter((p) => p.name !== productName));
				alert(`Product "${productName}" deleted successfully.`);
			} catch (err) {
				console.error("Failed to delete product:", err);
				setError(`Failed to delete ${productName}. ${err.message || ""}`);
			}
		}
	};

	const groceryCategory = useMemo(
		() => categories.find((cat) => cat.name.toLowerCase() === "grocery"),
		[categories]
	);
	const groceryCategoryId = useMemo(
		() => (groceryCategory ? groceryCategory.id.toString() : null),
		[groceryCategory]
	);

	const drinksCategory = useMemo(
		() => categories.find((cat) => cat.name.toLowerCase() === "drinks"), // Adjust "drinks" if your category name is different
		[categories]
	);
	const drinksCategoryId = useMemo(
		() => (drinksCategory ? drinksCategory.id.toString() : null),
		[drinksCategory]
	);
	const processedProductsForDisplay = useMemo(() => {
		const result = [];
		let productsToProcess = [...products];

		if (!selectedCategory) {
			// "All Products" tab
			if (groceryCategoryId) {
				productsToProcess = productsToProcess.filter(
					(product) =>
						(product.category?.id ?? product.category)?.toString() !==
						groceryCategoryId
				);
			}

			const grouped = productsToProcess.reduce((acc, product) => {
				const productActualCategoryId = (
					product.category?.id ?? product.category
				)?.toString();
				let categoryName = "Uncategorized";
				// Attempt to get category name from the categories array first
				const categoryObj = categories.find(
					(c) => c.id.toString() === productActualCategoryId
				);
				if (categoryObj) {
					categoryName = categoryObj.name;
				} else if (product.category_name) {
					// Fallback to product's own category_name
					categoryName = product.category_name;
				}

				if (!acc[categoryName]) {
					acc[categoryName] = {
						products: [],
						categoryId: productActualCategoryId,
						actualCategoryName: categoryName,
					};
				}
				acc[categoryName].products.push(product);
				return acc;
			}, {});

			for (const groupKey in grouped) {
				const currentGroup = grouped[groupKey];
				const categoryIdForDisplay = currentGroup.categoryId;
				const categoryNameForDisplay = currentGroup.actualCategoryName;

				if (currentGroup.products.length > 0) {
					if (drinksCategoryId && categoryIdForDisplay === drinksCategoryId) {
						const freshDrinks = [];
						const cannedDrinks = [];
						currentGroup.products.forEach((p) => {
							if (p.is_grocery_item) {
								// Check if the drink is a grocery item
								cannedDrinks.push(p);
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
						if (cannedDrinks.length > 0)
							subGroups.push({
								subHeading: "Canned Drinks",
								products: cannedDrinks,
							});

						if (subGroups.length > 0) {
							result.push({
								categoryName: categoryNameForDisplay,
								isDrinksCategory: true,
								subGroups,
							});
						} else if (currentGroup.products.length > 0) {
							// Fallback if no sub-groups but products exist
							result.push({
								categoryName: categoryNameForDisplay,
								products: currentGroup.products,
							});
						}
					} else {
						result.push({
							categoryName: categoryNameForDisplay,
							products: currentGroup.products,
						});
					}
				}
			}
			result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
		} else {
			// Specific category selected
			const categoryDetails = categories.find(
				(c) => c.id.toString() === selectedCategory
			);
			const categoryName = categoryDetails?.name || "Selected Category";

			if (drinksCategoryId && selectedCategory === drinksCategoryId) {
				// Selected category is "Drinks"
				const productsInDrinksCategory = products.filter(
					(product) =>
						(product.category?.id ?? product.category)?.toString() ===
						selectedCategory
				);

				const freshDrinks = [];
				const cannedDrinks = [];
				productsInDrinksCategory.forEach((p) => {
					if (p.is_grocery_item) {
						// Check if the drink is a grocery item
						cannedDrinks.push(p);
					} else {
						freshDrinks.push(p);
					}
				});

				const subGroups = [];
				if (freshDrinks.length > 0)
					subGroups.push({ subHeading: "Fresh Drinks", products: freshDrinks });
				if (cannedDrinks.length > 0)
					subGroups.push({
						subHeading: "Grocery Drinks",
						products: cannedDrinks,
					});

				if (subGroups.length > 0) {
					result.push({
						categoryName,
						isDrinksCategory: true,
						subGroups,
					});
				} else if (productsInDrinksCategory.length > 0) {
					// Fallback: Drinks category has products but no sub-groups matched
					result.push({
						categoryName,
						products: productsInDrinksCategory,
					});
				}
			} else {
				// Other specific category (not "Drinks")
				const productsInCategory = products.filter(
					(product) =>
						(product.category?.id ?? product.category)?.toString() ===
						selectedCategory
				);

				if (productsInCategory.length > 0) {
					result.push({
						categoryName,
						products: productsInCategory,
					});
				}
			}
		}
		return result;
	}, [
		products,
		selectedCategory,
		categories,
		groceryCategoryId,
		drinksCategoryId,
	]); // Added drinksCategoryId

	const allProductsTabCount = useMemo(() => {
		if (groceryCategoryId) {
			return products.filter(
				(p) => (p.category?.id ?? p.category)?.toString() !== groceryCategoryId
			).length;
		}
		return products.length; // If no "Grocery" category, count all
	}, [products, groceryCategoryId]);

	const handleExportProducts = async () => {
		if (isExporting) return;
		setIsExporting(true);
		setError(null);
		try {
			await productService.exportProductsCSV();
			alert("Products exported successfully!");
		} catch (err) {
			console.error(err);
			setError(
				`Failed to export products. ${err.message || "Please try again."}`
			);
		} finally {
			setIsExporting(false);
		}
	};

	const handleImportProducts = async (fileToImport) => {
		if (!fileToImport || isImportingCsv) return;
		setIsImportingCsv(true);
		setError(null);
		try {
			const response = await productService.importProductsCSV(fileToImport);
			let successMessage =
				response.message || "Products imported successfully!";
			if (response.created_count > 0 || response.updated_count > 0) {
				successMessage += `\nCreated: ${
					response.created_count || 0
				}, Updated: ${response.updated_count || 0}.`;
			}
			alert(successMessage);
			if (response.errors && response.errors.length > 0) {
				console.error("Import errors:", response.errors);
				const errorDetails = response.errors
					.map(
						(err) =>
							`Row ${err.row || "-"}: ${err.error} (Product: ${
								err.product_name || "N/A"
							})`
					)
					.join("\n");
				setError(
					`Import completed with ${
						response.errors.length
					} errors. Some products may not have been imported or updated correctly. Details:\n${errorDetails.substring(
						0,
						500
					)}${errorDetails.length > 500 ? "..." : ""}`
				);
			} else {
				setError(null);
			}
			fetchData(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch (err) {
			console.error("Failed to import products from CSV:", err);
			let importError = "Failed to import products from CSV.";
			if (err && err.error) {
				importError = err.error;
				if (err.missing_headers)
					importError += ` Missing headers: ${err.missing_headers.join(", ")}.`;
				else if (err.errors && Array.isArray(err.errors)) {
					const specificErrors = err.errors
						.slice(0, 3)
						.map((e) => `Row ${e.row || "-"}: ${e.error}`)
						.join("; ");
					importError += ` Specific issues: ${specificErrors}${
						err.errors.length > 3 ? "..." : ""
					}`;
				}
			} else if (err && err.message) importError = err.message;
			setError(importError);
			alert(importError);
		} finally {
			setIsImportingCsv(false);
		}
	};

	const handleFileChangeAndInitiateImport = (event) => {
		const file = event.target.files[0];
		if (file) handleImportProducts(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const triggerFileInput = () => fileInputRef.current?.click();

	if (loading && products.length === 0 && !error) {
		return (
			<MainLayout pageTitle="Loading Products...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	if (error && products.length === 0 && loading) {
		return (
			<MainLayout pageTitle="Error Loading Products">
				<div className="flex flex-col items-center justify-center h-full p-4 text-center">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
					<p className="text-red-700 text-lg mb-2">
						Could not load product data.
					</p>
					<p className="text-red-600 text-sm mb-4">{error}</p>
					<button
						onClick={() => fetchData(true)}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Retry
					</button>
				</div>
			</MainLayout>
		);
	}

	const noProductsMatchFilters =
		!loading && processedProductsForDisplay.length === 0 && selectedCategory;

	const noProductsAvailableAtAllInAllTab =
		!loading &&
		processedProductsForDisplay.length === 0 &&
		!selectedCategory &&
		allProductsTabCount === 0;

	return (
		<MainLayout pageTitle="Product Management">
			<input
				type="file"
				accept=".csv"
				ref={fileInputRef}
				onChange={handleFileChangeAndInitiateImport}
				className="hidden"
				disabled={isImportingCsv}
			/>
			<div
				ref={pageContentRef}
				className="flex flex-col h-full"
			>
				<header
					ref={pageHeaderRef}
					className="flex flex-wrap justify-between items-center mb-4 pb-4 border-b border-slate-200 gap-3 flex-shrink-0"
				>
					<h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
						<PackageIcon className="h-6 w-6 text-slate-600" /> Product Catalog
					</h2>
					{isAdmin && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
									aria-label="Product Actions"
								>
									Actions <EllipsisVerticalIcon className="h-4 w-4" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-56"
							>
								<DropdownMenuLabel>Manage Products</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => navigate("/products/add")}>
									<PlusIcon className="mr-2 h-4 w-4" />
									<span>Add New Product</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => navigate("/products/bulk-restock")}
								>
									<ArrowUpOnSquareStackIcon className="mr-2 h-4 w-4" />
									<span>Bulk Restock Items</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuLabel>Manage Categories</DropdownMenuLabel>
								<DropdownMenuItem onClick={() => setIsCategoryModalOpen(true)}>
									<AdjustmentsHorizontalIcon className="mr-2 h-4 w-4" />
									<span>Manage Categories</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuLabel>Import / Export</DropdownMenuLabel>
								<DropdownMenuItem
									onClick={triggerFileInput}
									disabled={isImportingCsv}
								>
									<ArrowUpTrayIcon className="mr-2 h-4 w-4" />
									<span>
										{isImportingCsv ? "Importing..." : "Import from CSV"}
									</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={handleExportProducts}
									disabled={isExporting}
								>
									<ArrowDownTrayIcon className="mr-2 h-4 w-4" />
									<span>{isExporting ? "Exporting..." : "Export to CSV"}</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</header>

				<div
					ref={tabsRef}
					className="flex items-center flex-wrap gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar flex-shrink-0"
				>
					<button
						className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
							!selectedCategory
								? "bg-indigo-600 text-white shadow-sm"
								: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
						}`}
						onClick={() => setSelectedCategory("")}
					>
						All
					</button>
					{categories.map((category) => (
						<button
							key={category.id}
							className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
								selectedCategory === category.id.toString()
									? "bg-indigo-600 text-white shadow-sm"
									: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
							}`}
							onClick={() => setSelectedCategory(category.id.toString())}
						>
							{category.name}
						</button>
					))}
					{/* The standalone "Manage Categories" button was here and has been removed */}
				</div>

				{error && !loading && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm flex-shrink-0">
						<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
						<span className="flex-1 break-words">{error}</span>
						<button
							onClick={() => {
								setError(null);
								if (products.length === 0 && !loading) fetchData(true);
							}}
							className="ml-auto text-xs font-medium text-red-800 hover:underline flex-shrink-0"
						>
							Clear
						</button>
					</div>
				)}

				<div
					className="flex-1 overflow-y-auto custom-scrollbar pb-4"
					style={{ height: gridHeight }}
				>
					{loading && products.length > 0 && (
						<div className="text-center py-4">
							<LoadingSpinner size="md" />{" "}
							<span className="ml-2 text-slate-600">
								Refreshing products...
							</span>
						</div>
					)}

					{noProductsAvailableAtAllInAllTab && ( // When "All" is selected, and it results in no non-grocery items
						<div className="text-center py-10 text-slate-500">
							No products to display in the All view
						</div>
					)}

					{noProductsMatchFilters && ( // When a specific category is selected and it's empty
						<div className="text-center py-10 text-slate-500">
							No products found in &quot;
							{categories.find((c) => c.id.toString() === selectedCategory)
								?.name || selectedCategory}
							&quot;.
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
								{/* Render main category heading if it has products or subGroups */}
								{(productList?.length > 0 || subGroups?.length > 0) && (
									<h2 className="text-2xl font-semibold text-slate-700 mb-4 border-b border-slate-200 pb-2">
										{categoryName}
									</h2>
								)}
								{isDrinksCategory && subGroups && subGroups.length > 0 ? (
									subGroups.map(
										({ subHeading, products: subProductList }) =>
											subProductList.length > 0 && ( // Only render sub-group if it has products
												<div
													key={subHeading}
													className="mb-6"
												>
													<h3 className="text-xl font-medium text-slate-600 mb-3 pt-2 border-t border-slate-100 mt-4">
														{subHeading}
														<span className="text-sm font-normal text-slate-500 ml-2">
															({subProductList.length} items)
														</span>
													</h3>
													<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 grid-auto-rows-min">
														{subProductList.map((product) => {
															// PASTE YOUR EXISTING PRODUCT CARD JSX HERE
															// Ensure all variables like borderColor, badgeBgColor, etc. are defined
															const [
																borderColor,
																badgeBgColor,
																badgeTextColor,
															] = getCategoryColors(
																product.category?.id ?? product.category
															);
															const currentProductCategoryName = // Renamed to avoid conflict with outer categoryName
																product.category?.name ||
																product.category_name ||
																"Uncategorized";
															return (
																<div
																	key={product.id || product.name}
																	className={`bg-white max-h-[350px] w-full rounded-lg shadow hover:shadow-lg transition-all overflow-hidden border-t-4 ${borderColor} border border-slate-200 flex flex-col group relative`}
																>
																	<button
																		onClick={() =>
																			navigate(
																				`/products/${encodeURIComponent(
																					product.name
																				)}`
																			)
																		}
																		className="aspect-[4/3] bg-slate-100 overflow-hidden relative block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md"
																		aria-label={`View details for ${product.name}`}
																	>
																		<img
																			src={
																				product.image ||
																				`https://placehold.co/300x225/e2e8f0/94a3b8?text=${encodeURIComponent(
																					product.name.substring(0, 15)
																				)}`
																			}
																			alt={product.name}
																			className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
																			onError={(e) => {
																				e.target.onerror = null;
																				e.target.src = `https://placehold.co/300x225/e2e8f0/94a3b8?text=${encodeURIComponent(
																					product.name.substring(0, 15)
																				)}`;
																			}}
																		/>
																		<div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
																			<EyeIcon className="h-8 w-8 text-white opacity-80" />
																		</div>
																	</button>
																	<div className="flex-1 flex flex-col justify-between p-3">
																		<div>
																			<h3
																				className="text-sm font-medium text-slate-800 truncate mb-0.5"
																				title={product.name}
																			>
																				{product.name}
																			</h3>
																			<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
																				<span
																					className={`inline-block ${badgeBgColor} ${badgeTextColor} text-xs font-medium px-1.5 py-0.5 rounded`}
																				>
																					{currentProductCategoryName}
																				</span>
																				{product.is_grocery_item && ( // This refers to the general grocery badge, not specific to drink sub-type here
																					<span
																						className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
																							product.inventory_quantity > 5
																								? "bg-green-100 text-green-700"
																								: product.inventory_quantity > 0
																								? "bg-orange-100 text-orange-700"
																								: "bg-red-100 text-red-700"
																						}`}
																					>
																						<ArchiveBoxIcon className="h-3 w-3" />
																						{product.inventory_quantity}
																					</span>
																				)}
																			</div>
																			<p className="text-slate-800 font-semibold text-sm">
																				${Number(product.price).toFixed(2)}
																			</p>
																		</div>
																		{isAdmin && (
																			<div className="flex gap-1.5 mt-2 border-t border-slate-100 pt-2">
																				<button
																					onClick={() =>
																						navigate(
																							`/products/edit/${encodeURIComponent(
																								product.name
																							)}`
																						)
																					}
																					className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors flex items-center gap-1 flex-1 justify-center"
																					title="Edit"
																				>
																					<PencilSolidIcon className="h-3.5 w-3.5" />{" "}
																					Edit
																				</button>
																				<button
																					onClick={() =>
																						handleDelete(product.name)
																					}
																					className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 flex-1 justify-center"
																					title="Delete"
																				>
																					<TrashSolidIcon className="h-3.5 w-3.5" />{" "}
																					Delete
																				</button>
																			</div>
																		)}
																	</div>
																</div>
															);
														})}
													</div>
												</div>
											)
									)
								) : productList && productList.length > 0 ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 grid-auto-rows-min">
										{productList.map((product) => {
											// PASTE YOUR EXISTING PRODUCT CARD JSX HERE
											// Ensure all variables like borderColor, badgeBgColor, etc. are defined
											const [borderColor, badgeBgColor, badgeTextColor] =
												getCategoryColors(
													product.category?.id ?? product.category
												);
											const currentProductCategoryName = // Renamed to avoid conflict
												product.category?.name ||
												product.category_name ||
												"Uncategorized";
											return (
												<div
													key={product.id || product.name}
													className={`bg-white max-h-[350px] w-full rounded-lg shadow hover:shadow-lg transition-all overflow-hidden border-t-4 ${borderColor} border border-slate-200 flex flex-col group relative`}
												>
													<button
														onClick={() =>
															navigate(
																`/products/${encodeURIComponent(product.name)}`
															)
														}
														className="aspect-[4/3] bg-slate-100 overflow-hidden relative block w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md"
														aria-label={`View details for ${product.name}`}
													>
														<img
															src={
																product.image ||
																`https://placehold.co/300x225/e2e8f0/94a3b8?text=${encodeURIComponent(
																	product.name.substring(0, 15)
																)}`
															}
															alt={product.name}
															className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
															onError={(e) => {
																e.target.onerror = null;
																e.target.src = `https://placehold.co/300x225/e2e8f0/94a3b8?text=${encodeURIComponent(
																	product.name.substring(0, 15)
																)}`;
															}}
														/>
														<div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
															<EyeIcon className="h-8 w-8 text-white opacity-80" />
														</div>
													</button>
													<div className="flex-1 flex flex-col justify-between p-3">
														<div>
															<h3
																className="text-sm font-medium text-slate-800 truncate mb-0.5"
																title={product.name}
															>
																{product.name}
															</h3>
															<div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
																<span
																	className={`inline-block ${badgeBgColor} ${badgeTextColor} text-xs font-medium px-1.5 py-0.5 rounded`}
																>
																	{currentProductCategoryName}
																</span>
																{product.is_grocery_item && (
																	<span
																		className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
																			product.inventory_quantity > 5
																				? "bg-green-100 text-green-700"
																				: product.inventory_quantity > 0
																				? "bg-orange-100 text-orange-700"
																				: "bg-red-100 text-red-700"
																		}`}
																	>
																		<ArchiveBoxIcon className="h-3 w-3" />
																		{product.inventory_quantity}
																	</span>
																)}
															</div>
															<p className="text-slate-800 font-semibold text-sm">
																${Number(product.price).toFixed(2)}
															</p>
														</div>
														{isAdmin && (
															<div className="flex gap-1.5 mt-2 border-t border-slate-100 pt-2">
																<button
																	onClick={() =>
																		navigate(
																			`/products/edit/${encodeURIComponent(
																				product.name
																			)}`
																		)
																	}
																	className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors flex items-center gap-1 flex-1 justify-center"
																	title="Edit"
																>
																	<PencilSolidIcon className="h-3.5 w-3.5" />{" "}
																	Edit
																</button>
																<button
																	onClick={() => handleDelete(product.name)}
																	className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 flex-1 justify-center"
																	title="Delete"
																>
																	<TrashSolidIcon className="h-3.5 w-3.5" />{" "}
																	Delete
																</button>
															</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								) : null}{" "}
								{/* End of conditional rendering for category content */}
							</div>
						)
					)}
				</div>

				<CategoryManagementModal
					isOpen={isCategoryModalOpen}
					onClose={() => setIsCategoryModalOpen(false)}
					onCategoryChange={handleCategoryChange}
					categories={categories}
					axiosInstance={axiosInstance}
				/>
			</div>
		</MainLayout>
	);
}
