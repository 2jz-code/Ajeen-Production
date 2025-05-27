// src/pages/products/Products.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig"; // Used by CategoryManagementModal
import { authService } from "../../api/services/authService";
import { productService } from "../../api/services/productService"; // Import productService
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
	ArrowDownTrayIcon, // New icon for export button
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react";
import CategoryManagementModal from "../../components/CategoryManagementModal";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

// ... (getCategoryColors function remains the same) ...
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
	const [isExporting, setIsExporting] = useState(false); // State for export loading

	// ... (refs and useEffect for height calculation remain the same) ...
	const pageContentRef = useRef(null);
	const tabsRef = useRef(null);
	const pageHeaderRef = useRef(null);
	const [gridHeight, setGridHeight] = useState("auto");

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
		let isMounted = true;
		setLoading(true);
		setError(null);
		const fetchData = async () => {
			try {
				const [categoriesRes, productsRes, authRes] = await Promise.all([
					// Using productService for consistency, assuming it's set up
					productService.getProductCategories(),
					productService.getProductsList(),
					authService.checkStatus(),
				]);
				if (isMounted) {
					// Assuming productService returns { data: [...] } like axios
					setCategories(categoriesRes); // If productService.getProductCategories() returns data directly
					setSelectedCategory("");
					setProducts(productsRes); // If productService.getProductsList() returns data directly
					setIsAdmin(authRes.is_admin);
				}
			} catch (err) {
				console.error("Error fetching data:", err);
				if (isMounted)
					setError("Failed to load product data. Please try again.");
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		fetchData();
		return () => {
			isMounted = false;
		};
	}, []);

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
		// ... (handleDelete logic remains the same) ...
		if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
			try {
				await productService.deleteProduct(productName); // Using productService
				setProducts((prev) => prev.filter((p) => p.name !== productName));
			} catch (err) {
				console.error("Failed to delete product:", err);
				setError(`Failed to delete ${productName}.`);
			}
		}
	};

	const filteredProducts = useMemo(() => {
		// ... (filteredProducts logic remains the same) ...
		return products.filter((product) => {
			if (!selectedCategory) return true;
			const productCategoryId = product.category?.id ?? product.category;
			return productCategoryId?.toString() === selectedCategory;
		});
	}, [products, selectedCategory]);

	const handleExportProducts = async () => {
		if (isExporting) return;
		setIsExporting(true);
		setError(null);
		try {
			await productService.exportProductsCSV();
			// Success message could be a toast notification if you have a system for it
		} catch (err) {
			console.error(err);
			// Error is handled and alerted by productService, but you could set local error state too
			setError("Failed to export products. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	if (loading && products.length === 0) {
		// ... (loading state remains the same) ...
		return (
			<MainLayout pageTitle="Loading Products...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle="Product Management">
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
					<div className="flex items-center gap-2 sm:gap-3">
						{isAdmin && (
							<button
								onClick={() => navigate("/products/bulk-restock")} // Navigate to new page
								className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
							>
								<ArrowUpOnSquareStackIcon className="h-4 w-4" /> Restock Items
							</button>
						)}
						{isAdmin && ( // Button to export products
							<button
								onClick={handleExportProducts}
								disabled={isExporting}
								className="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
							>
								<ArrowDownTrayIcon className="h-4 w-4" />
								{isExporting ? "Exporting..." : "Export Products"}
							</button>
						)}
						{isAdmin && (
							<button
								onClick={() => navigate("/products/add")}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
							>
								<PlusIcon className="h-4 w-4" /> Add Product
							</button>
						)}
					</div>
				</header>

				{/* Category Tabs and Product Grid remain largely the same */}
				{/* ... (rest of the component: tabs, error handling, product grid) ... */}
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
						All Products ({products.length})
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
					{isAdmin && (
						<button
							onClick={() => setIsCategoryModalOpen(true)}
							className="ml-auto flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 flex items-center gap-1 whitespace-nowrap"
						>
							<AdjustmentsHorizontalIcon className="h-4 w-4" /> Manage
							Categories
						</button>
					)}
				</div>

				{error &&
					!loading && ( // Ensure error doesn't show during initial load if export fails later
						<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm flex-shrink-0">
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{error}</span>
							<button
								onClick={() => {
									setError(null); // Clear error before retry
									// Potentially re-fetch data or just allow another export attempt
									if (products.length === 0) window.location.reload();
								}}
								className="ml-auto text-xs font-medium text-red-800 hover:underline"
							>
								Retry/Clear
							</button>
						</div>
					)}
				<div
					className="flex-1 overflow-y-auto custom-scrollbar pb-4"
					style={{ height: gridHeight }}
				>
					{loading &&
						products.length > 0 && ( // Show spinner if loading more while some products are already displayed
							<div className="text-center py-4">
								<LoadingSpinner size="md" />
							</div>
						)}
					{!loading && filteredProducts.length === 0 && (
						<div className="col-span-full text-center py-10 text-slate-500">
							No products found{" "}
							{selectedCategory
								? `in "${
										categories.find((c) => c.id.toString() === selectedCategory)
											?.name || "this category"
								  }"`
								: ""}
							.
						</div>
					)}
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 grid-auto-rows-min">
						{filteredProducts.map((product) => {
							const [borderColor, badgeBgColor, badgeTextColor] =
								getCategoryColors(product.category?.id ?? product.category);
							const categoryName = product.category_name || "Uncategorized";

							return (
								<div
									key={product.id || product.name}
									className={`bg-white max-h-[350px] w-full rounded-lg shadow hover:shadow-lg transition-all overflow-hidden border-t-4 ${borderColor} border border-slate-200 flex flex-col group relative`}
								>
									<button
										onClick={() =>
											navigate(`/products/${encodeURIComponent(product.name)}`)
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
													{categoryName}
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
													<PencilSolidIcon className="h-3.5 w-3.5" />
													Edit
												</button>
												<button
													onClick={() => handleDelete(product.name)}
													className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors flex items-center gap-1 flex-1 justify-center"
													title="Delete"
												>
													<TrashSolidIcon className="h-3.5 w-3.5" />
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

				<CategoryManagementModal
					isOpen={isCategoryModalOpen}
					onClose={() => setIsCategoryModalOpen(false)}
					onCategoryChange={handleCategoryChange}
					categories={categories}
					axiosInstance={axiosInstance} // Pass axiosInstance if modal makes its own API calls
				/>
			</div>
		</MainLayout>
	);
}
