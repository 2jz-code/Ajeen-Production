// src/pages/products/Products.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { authService } from "../../api/services/authService";
import {
	PencilSquareIcon as PencilSolidIcon,
	TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import {
	PlusIcon,
	AdjustmentsHorizontalIcon,
	// Bars3Icon, // Handled by MainLayout
	ExclamationTriangleIcon,
	EyeIcon,
	// PackageIcon as PageIcon // Use specific icon below or pass from MainLayout context if needed
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react"; // Example if using lucide for main page icon
import CategoryManagementModal from "../../components/CategoryManagementModal";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

// Helper function to get category-specific colors
const getCategoryColors = (categoryId) => {
	const colors = [
		["border-blue-300", "bg-blue-50", "text-blue-700"],
		["border-emerald-300", "bg-emerald-50", "text-emerald-700"],
		["border-amber-300", "bg-amber-50", "text-amber-700"],
		["border-indigo-300", "bg-indigo-50", "text-indigo-700"],
		// Add more colors if needed
		["border-pink-300", "bg-pink-50", "text-pink-700"],
		["border-sky-300", "bg-sky-50", "text-sky-700"],
	];
	const id = parseInt(categoryId, 10);
	if (isNaN(id) || id === null) {
		return ["border-slate-300", "bg-slate-100", "text-slate-600"]; // Default
	}
	return colors[Math.abs(id) % colors.length];
};

export default function Products() {
	const [categories, setCategories] = useState([]);
	const [products, setProducts] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState("");
	const [isAdmin, setIsAdmin] = useState(false);
	// const [userName, setUserName] = useState(""); // Handled by MainLayout
	const navigate = useNavigate();
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const pageContentRef = useRef(null); // Ref for the main content area of this page
	const tabsRef = useRef(null); // Ref for the category tabs section
	const pageHeaderRef = useRef(null); // Ref for the page-specific header section
	const [gridHeight, setGridHeight] = useState("auto");

	const handleCategoryChange = useCallback(
		(action, data) => {
			// Wrapped in useCallback
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
						prevProds.filter((p) => p.category !== categoryIdToDelete)
					);
					break;
				default:
					console.error("Unknown category action:", action);
			}
		},
		[selectedCategory]
	); // Added selectedCategory as it's used in delete case

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError(null);
		const fetchData = async () => {
			try {
				const [categoriesRes, productsRes, authRes] = await Promise.all([
					axiosInstance.get("products/categories/"),
					axiosInstance.get("products/"),
					authService.checkStatus(),
				]);
				if (isMounted) {
					setCategories(categoriesRes.data);
					setSelectedCategory("");
					setProducts(productsRes.data);
					setIsAdmin(authRes.is_admin);
					// setUserName(authRes.username); // Handled by MainLayout
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
				const mainLayoutHeaderHeight = 56; // Approx height of MainLayout's header (h-14)
				const mainLayoutFooterHeight = 40; // Approx height of MainLayout's footer (h-10)
				const pageHeaderActualHeight = pageHeaderRef.current.offsetHeight;
				const tabsActualHeight = tabsRef.current.offsetHeight;
				const verticalPadding = 32; // Approx p-4 (1rem top, 1rem bottom) for the main content area of MainLayout

				const availableHeight =
					window.innerHeight -
					mainLayoutHeaderHeight -
					mainLayoutFooterHeight -
					pageHeaderActualHeight -
					tabsActualHeight -
					verticalPadding -
					16; // Extra 1rem for footer margin
				setGridHeight(`${Math.max(200, availableHeight)}px`); // Min height 200px
			}
		};
		if (!loading) {
			// Calculate after initial data load
			calculateHeight();
			window.addEventListener("resize", calculateHeight);
			return () => window.removeEventListener("resize", calculateHeight);
		}
	}, [loading]);

	const handleDelete = async (productName) => {
		if (window.confirm(`Are you sure you want to delete "${productName}"?`)) {
			try {
				await axiosInstance.delete(
					`products/${encodeURIComponent(productName)}/`
				);
				setProducts((prev) => prev.filter((p) => p.name !== productName));
			} catch (err) {
				console.error("Failed to delete product:", err);
				setError(`Failed to delete ${productName}.`);
			}
		}
	};

	const filteredProducts = useMemo(() => {
		return products.filter((product) => {
			if (!selectedCategory) return true;
			if (product.category != null)
				return product.category.toString() === selectedCategory;
			const selectedCategoryObj = categories.find(
				(cat) => cat.id.toString() === selectedCategory
			);
			return product.category_name === selectedCategoryObj?.name;
		});
	}, [products, selectedCategory, categories]);

	if (loading && products.length === 0) {
		// Show full page loader only on initial absolute load
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
				{/* Page-specific header */}
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
								onClick={() => navigate("/products/add")}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
							>
								<PlusIcon className="h-4 w-4" /> Add Product
							</button>
						)}
						{/* Dashboard button handled by MainLayout */}
					</div>
				</header>

				{/* Category Tabs Section */}
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

				{error && !loading && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm flex-shrink-0">
						<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
						<span>{error}</span>
						<button
							onClick={() => window.location.reload()}
							className="ml-auto text-xs font-medium text-red-800 hover:underline"
						>
							Retry
						</button>
					</div>
				)}

				{/* Product Grid Area */}
				<div
					className="flex-1 overflow-y-auto custom-scrollbar pb-4"
					style={{ height: gridHeight }}
				>
					{loading &&
						products.length > 0 && ( // Show inline loader when refreshing/filtering
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
								getCategoryColors(product.category);
							const categoryName =
								categories.find((c) => c.id === product.category)?.name ||
								product.category_name ||
								"Uncategorized";
							return (
								<div
									key={product.id || product.name}
									className={`bg-white max-h-[320px] w-full rounded-lg shadow hover:shadow-lg transition-all overflow-hidden border-t-4 ${borderColor} border border-slate-200 flex flex-col group relative`}
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
											<span
												className={`inline-block ${badgeBgColor} ${badgeTextColor} text-xs font-medium px-1.5 py-0.5 rounded mb-1`}
											>
												{categoryName}
											</span>
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
				{/* Footer/Status Bar (now handled by MainLayout) */}
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
