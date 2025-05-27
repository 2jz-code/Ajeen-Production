import React, { useState, useEffect, useMemo, useRef } from "react"; // Added React for createRef
import { useNavigate } from "react-router-dom";
import { productService } from "../../api/services/productService";
import MainLayout from "../layout/MainLayout";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	CheckCircleIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	MagnifyingGlassIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

const BulkRestockPage = () => {
	const [groceryProducts, setGroceryProducts] = useState([]);
	const [restockQuantities, setRestockQuantities] = useState({});
	const [loading, setLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const navigate = useNavigate();
	const quantityInputRefs = useRef({});
	const searchInputRef = useRef(null);

	// Barcode scanner handler
	const handleBarcodeScanned = (scannedBarcode) => {
		setSearchTerm(scannedBarcode); // Replace current search term with new scan
	};

	useBarcodeScanner(handleBarcodeScanned); // Activate global barcode scanner

	useEffect(() => {
		const fetchGroceryProducts = async () => {
			setLoading(true);
			setError(null);
			try {
				const allProducts = await productService.getProductsList();
				const filtered = allProducts.filter((p) => p.is_grocery_item);
				setGroceryProducts(filtered);
				// Initialize refs for inputs
				quantityInputRefs.current = filtered.reduce((acc, product) => {
					acc[product.id] = React.createRef();
					return acc;
				}, {});
			} catch (err) {
				console.error("Error fetching grocery products:", err);
				setError("Failed to load grocery products. Please try again.");
				toast.error("Failed to load grocery products.");
			} finally {
				setLoading(false);
			}
		};
		fetchGroceryProducts();
	}, []);

	const handleQuantityChange = (productId, value) => {
		const intValue = parseInt(value, 10);
		setRestockQuantities((prev) => ({
			...prev,
			[productId]: isNaN(intValue) || intValue < 0 ? "" : intValue,
		}));
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);
		setError(null);

		const itemsToRestock = Object.entries(restockQuantities)
			.map(([productId, quantity]) => ({
				product_id: parseInt(productId, 10),
				restock_quantity: parseInt(quantity, 10),
			}))
			.filter((item) => item.restock_quantity > 0);

		if (itemsToRestock.length === 0) {
			toast.info("No restock quantities entered.");
			setIsSubmitting(false);
			return;
		}

		try {
			const response = await productService.restockProducts(itemsToRestock);
			toast.success(response.message || "Products restocked successfully!");
			if (response.errors && response.errors.length > 0) {
				toast.warn(
					`Some items had issues: ${response.errors
						.map((e) => `${e.product_id || "Unknown"}: ${e.error}`)
						.join(", ")}`
				);
			}
			navigate("/products");
		} catch (apiError) {
			console.error("Bulk restock failed:", apiError);
			const errorMessage =
				apiError?.error ||
				apiError?.message ||
				"An unexpected error occurred during bulk restock.";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const filteredGroceryProducts = useMemo(() => {
		if (!searchTerm) {
			return groceryProducts;
		}
		const lowerSearchTerm = searchTerm.toLowerCase();
		// Prioritize exact barcode match for filtering
		const exactBarcodeMatch = groceryProducts.find(
			(product) => product.barcode === searchTerm
		);
		if (exactBarcodeMatch) {
			return [exactBarcodeMatch];
		}
		return groceryProducts.filter(
			(product) =>
				product.name.toLowerCase().includes(lowerSearchTerm) ||
				(product.barcode &&
					product.barcode.toLowerCase().includes(lowerSearchTerm))
		);
	}, [groceryProducts, searchTerm]);

	useEffect(() => {
		if (
			searchTerm &&
			filteredGroceryProducts.length === 1 &&
			filteredGroceryProducts[0].barcode === searchTerm // Check if the filter is due to this specific barcode
		) {
			const product = filteredGroceryProducts[0];
			const inputRef = quantityInputRefs.current[product.id];
			if (inputRef && inputRef.current) {
				inputRef.current.focus();
				inputRef.current.select();
			}
		}
	}, [filteredGroceryProducts, searchTerm]);

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	const clearSearch = () => {
		setSearchTerm("");
		if (searchInputRef.current) {
			searchInputRef.current.focus();
		}
	};

	const inputClass =
		"mt-1 block w-24 rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 text-center";
	const buttonPrimaryClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
	const buttonSecondaryClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500";
	const searchInputContainerClass = "relative mb-4";
	const searchInputClass =
		"w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

	if (loading) {
		return (
			<MainLayout pageTitle="Loading Restock Page...">
				<div className="flex justify-center items-center h-64">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle="Bulk Restock Grocery Items">
			<div className="max-w-4xl mx-auto p-4">
				{/* Header section with title and buttons */}
				<div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
					<h1 className="text-2xl font-semibold text-slate-800">
						Restock Inventory
					</h1>
					<div className="flex flex-col sm:flex-row gap-2">
						<button
							onClick={() => navigate("/products")}
							className={`${buttonSecondaryClass} w-full sm:w-auto`}
						>
							<ArrowLeftIcon className="h-4 w-4 mr-1.5" /> Back to Products
						</button>
						<button
							onClick={handleSubmit}
							disabled={
								isSubmitting ||
								Object.values(restockQuantities).every(
									(qty) => !qty || parseInt(qty, 10) === 0
								)
							}
							className={`${buttonPrimaryClass} min-w-[150px] w-full sm:w-auto`}
						>
							{isSubmitting ? (
								<ArrowPathIcon className="h-4 w-4 animate-spin mr-1.5" />
							) : (
								<CheckCircleIcon className="h-5 w-5 mr-1.5" />
							)}
							{isSubmitting ? "Saving..." : "Save Restock"}
						</button>
					</div>
				</div>

				{error && (
					<div
						role="alert"
						className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm"
					>
						<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<div className={searchInputContainerClass}>
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
					</div>
					<input
						ref={searchInputRef}
						type="text"
						placeholder="Search by product name or scan barcode..."
						value={searchTerm}
						onChange={handleSearchChange}
						className={searchInputClass}
					/>
					{searchTerm && (
						<button
							onClick={clearSearch}
							className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700"
							aria-label="Clear search"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>
					)}
				</div>

				{filteredGroceryProducts.length === 0 &&
					!loading &&
					groceryProducts.length > 0 && (
						<p className="text-slate-600 text-center py-4">
							No products match your search &apos;{searchTerm}&apos;.
						</p>
					)}

				{groceryProducts.length === 0 && !loading && (
					<p className="text-slate-600 text-center py-4">
						No grocery items found to restock.
					</p>
				)}

				{filteredGroceryProducts.length > 0 && (
					<div className="space-y-3">
						<div className="overflow-x-auto bg-white shadow-md rounded-lg border border-slate-200">
							<table className="min-w-full divide-y divide-slate-200">
								<thead className="bg-slate-50">
									<tr>
										<th
											scope="col"
											className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Product Name
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Current Stock
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Barcode
										</th>
										<th
											scope="col"
											className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
										>
											Restock Quantity
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-slate-200">
									{filteredGroceryProducts.map((product) => (
										<tr key={product.id}>
											<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
												{product.name}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
												{product.inventory_quantity}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
												{product.barcode || "N/A"}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">
												<input
													ref={quantityInputRefs.current[product.id]}
													type="number"
													min="0"
													value={restockQuantities[product.id] || ""}
													onChange={(e) =>
														handleQuantityChange(product.id, e.target.value)
													}
													className={inputClass}
													placeholder="0"
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{/* Save button removed from here */}
					</div>
				)}
			</div>
		</MainLayout>
	);
};

export default BulkRestockPage;
