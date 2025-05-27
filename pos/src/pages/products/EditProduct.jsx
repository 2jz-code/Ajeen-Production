// src/pages/products/EditProduct.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { ENDPOINTS } from "../../api/config/apiEndpoints";
import {
	ArrowLeftIcon,
	CheckIcon,
	XMarkIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
	QrCodeIcon,
	ArrowPathIcon,
	ArchiveBoxIcon, // For inventory
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { toast } from "react-toastify";
import MainLayout from "../layout/MainLayout";
import { Switch } from "@/components/ui/switch"; // Assuming you have a Switch component
import { Label } from "@/components/ui/label"; // Assuming you have a Label component

export default function EditProduct() {
	const { name: productNameParam } = useParams();
	const navigate = useNavigate();
	const [product, setProduct] = useState(null);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [fieldErrors, setFieldErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const fetchProductData = useCallback(async () => {
		setLoading(true);
		setError(null);
		setFieldErrors({});
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.PRODUCTS.DETAIL(productNameParam)
			);
			const fetchedProduct = response.data;
			fetchedProduct.category =
				fetchedProduct.category?.id ?? fetchedProduct.category ?? "";
			fetchedProduct.barcode = fetchedProduct.barcode || "";
			// Initialize new fields if they come from backend
			fetchedProduct.is_grocery_item = fetchedProduct.is_grocery_item || false;
			fetchedProduct.inventory_quantity =
				fetchedProduct.inventory_quantity || 0;
			setProduct(fetchedProduct);
		} catch (err) {
			console.error("Error fetching product:", err);
			setError(
				"Failed to fetch product details. It might have been deleted or the name changed."
			);
			toast.error("Failed to load product details.");
			setProduct(null);
		} finally {
			setLoading(false);
		}
	}, [productNameParam]);

	useEffect(() => {
		fetchProductData();
		axiosInstance
			.get(ENDPOINTS.PRODUCTS.CATEGORIES)
			.then((response) => setCategories(response.data))
			.catch((err) => {
				console.error("Error fetching categories:", err);
				toast.error("Could not load categories.");
			});
	}, [fetchProductData]);

	const handleChange = (e) => {
		if (!product) return;
		const { name, value, type, checked } = e.target;

		setProduct((prevProduct) => ({
			...prevProduct,
			[name]: type === "checkbox" ? checked : value,
		}));

		if (fieldErrors[name])
			setFieldErrors((prev) => ({ ...prev, [name]: null }));
		if (error) setError(null);
	};

	// Specific handler for the Switch component if it doesn't use standard event target
	const handleGroceryItemChange = (checked) => {
		if (!product) return;
		setProduct((prevProduct) => ({
			...prevProduct,
			is_grocery_item: checked,
		}));
	};

	const validateForm = () => {
		if (!product) return false;
		const errors = {};
		if (!product.name.trim()) errors.name = "Product name is required.";
		if (!product.price.toString().trim()) errors.price = "Price is required.";
		else if (isNaN(parseFloat(product.price)) || parseFloat(product.price) <= 0)
			errors.price = "Price must be a positive number.";
		if (!product.description.trim())
			errors.description = "Description is required.";
		if (!product.category) errors.category = "Category is required.";

		if (
			product.is_grocery_item &&
			(isNaN(parseInt(product.inventory_quantity)) ||
				parseInt(product.inventory_quantity) < 0)
		) {
			errors.inventory_quantity =
				"Inventory must be a non-negative number for grocery items.";
		}
		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!product) return;
		setError(null);
		setFieldErrors({});
		if (!validateForm()) {
			toast.error("Please correct the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		const updatedProductData = { ...product };
		delete updatedProductData.image; // Image upload not handled here
		updatedProductData.category = parseInt(updatedProductData.category, 10);
		updatedProductData.barcode =
			updatedProductData.barcode && updatedProductData.barcode.trim() === ""
				? null
				: updatedProductData.barcode?.trim();
		updatedProductData.inventory_quantity = product.is_grocery_item
			? parseInt(product.inventory_quantity)
			: 0;

		try {
			await axiosInstance.put(
				ENDPOINTS.PRODUCTS.EDIT(productNameParam),
				updatedProductData
			);
			toast.success("Product updated successfully!");
			navigate("/products");
		} catch (err) {
			console.error("Update product error:", err);
			const errorData = err.response?.data;
			if (errorData && typeof errorData === "object") {
				const backendFieldErrors = {};
				for (const key in errorData) {
					backendFieldErrors[key] = Array.isArray(errorData[key])
						? errorData[key].join(" ")
						: String(errorData[key]);
				}
				setFieldErrors(backendFieldErrors);
				if (errorData.detail) {
					setError(errorData.detail);
					toast.error(errorData.detail);
				} else {
					toast.error("Failed to update product. Check details.");
				}
			} else {
				const errorMsg =
					"Failed to update product. Check details or ensure admin rights.";
				setError(errorMsg);
				toast.error(errorMsg);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputBaseClass =
		"block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6";
	const inputNormalClass = `${inputBaseClass} ring-slate-300`;
	const inputErrorClass = `${inputBaseClass} ring-red-500 focus:ring-red-600 text-red-800 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`;
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const primaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500";

	if (loading) {
		return (
			<MainLayout pageTitle="Loading Product...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}
	if (error && !product) {
		return (
			<MainLayout pageTitle="Error">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
					<h1 className="mb-2 text-xl font-semibold text-slate-800">
						Error Loading Product
					</h1>
					<p className="mb-6 text-slate-600">{error}</p>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/products")}
					>
						<ArrowLeftIcon className="h-4 w-4 mr-1.5" /> Back to Products
					</button>
				</div>
			</MainLayout>
		);
	}
	if (!product) {
		return (
			<MainLayout pageTitle="Product Not Found">
				<div className="p-8 text-center">Product data could not be loaded.</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={`Edit: ${product.name || "Product"}`}>
			<div className="max-w-4xl mx-auto">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
						<PackageIcon className="h-6 w-6 text-slate-600" />
						Modify Product
					</h2>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/products")}
						disabled={isSubmitting}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Cancel
					</button>
				</div>
				<div className="flex flex-col md:flex-row bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
					<div className="w-full md:w-1/3 p-5 flex flex-col justify-center items-center bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
						<label className="block text-sm font-medium text-slate-700 mb-2 self-start">
							Product Image
						</label>
						<div className="w-full aspect-square bg-slate-200 rounded-md flex flex-col items-center justify-center text-slate-500 overflow-hidden mb-3 shadow-inner">
							{product.image ? (
								<img
									src={product.image}
									alt={product.name}
									className="w-full h-full object-cover"
									onError={(e) => {
										e.target.onerror = null;
										e.target.src = `https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image`;
									}}
								/>
							) : (
								<>
									<PhotoIcon className="h-12 w-12 mb-1 text-slate-400" />
									<span className="text-xs">No image</span>
								</>
							)}
						</div>
						<button
							disabled
							className="w-full text-xs px-3 py-1.5 bg-slate-200 text-slate-500 rounded-md cursor-not-allowed"
						>
							Change Image (Not Available)
						</button>
					</div>

					<div className="w-full md:w-2/3 p-6 sm:p-8">
						{error &&
							!fieldErrors.detail && ( // Show general error if not a field-specific one from backend
								<div
									role="alert"
									className="mb-5 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm"
								>
									<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
									<span>{error}</span>
								</div>
							)}
						<form
							onSubmit={handleSubmit}
							className="flex flex-col space-y-4"
						>
							<div>
								<label
									htmlFor="product-name-edit"
									className={labelClass}
								>
									Product Name <span className="text-red-500">*</span>
								</label>
								<input
									id="product-name-edit"
									type="text"
									name="name"
									value={product.name}
									onChange={handleChange}
									className={
										fieldErrors.name ? inputErrorClass : inputNormalClass
									}
									required
								/>
								{fieldErrors.name && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.name}
									</p>
								)}
							</div>
							<div>
								<label
									htmlFor="product-barcode-edit"
									className="flex items-center text-xs font-medium text-slate-600 mb-1"
								>
									<QrCodeIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />
									Barcode (Optional)
								</label>
								<input
									id="product-barcode-edit"
									type="text"
									name="barcode"
									value={product.barcode || ""}
									onChange={handleChange}
									className={
										fieldErrors.barcode ? inputErrorClass : inputNormalClass
									}
									placeholder="Scan or type product barcode"
								/>
								{fieldErrors.barcode && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.barcode}
									</p>
								)}
							</div>
							<div>
								<label
									htmlFor="product-price-edit"
									className={labelClass}
								>
									Price <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="product-price-edit"
										type="number"
										step="0.01"
										min="0"
										name="price"
										value={product.price}
										onChange={handleChange}
										className={`pl-7 pr-3 ${
											fieldErrors.price ? inputErrorClass : inputNormalClass
										}`}
										required
										placeholder="0.00"
									/>
								</div>
								{fieldErrors.price && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.price}
									</p>
								)}
							</div>
							<div>
								<label
									htmlFor="product-description-edit"
									className={labelClass}
								>
									Description <span className="text-red-500">*</span>
								</label>
								<textarea
									id="product-description-edit"
									name="description"
									value={product.description}
									onChange={handleChange}
									className={`h-24 resize-none ${
										fieldErrors.description ? inputErrorClass : inputNormalClass
									}`}
									required
									placeholder="Enter description..."
								/>
								{fieldErrors.description && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.description}
									</p>
								)}
							</div>
							<div>
								<label
									htmlFor="product-category-edit"
									className={labelClass}
								>
									Category <span className="text-red-500">*</span>
								</label>
								<select
									id="product-category-edit"
									name="category"
									value={product.category || ""}
									onChange={handleChange}
									className={`${selectClass} ${
										fieldErrors.category
											? "ring-red-500 border-red-500"
											: "ring-slate-300 border-slate-300"
									}`}
									required
								>
									<option
										value=""
										disabled
									>
										Select Category...
									</option>
									{categories.map((cat) => (
										<option
											key={cat.id}
											value={cat.id}
										>
											{cat.name}
										</option>
									))}
								</select>
								{fieldErrors.category && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.category}
									</p>
								)}
							</div>

							{/* Grocery Item and Inventory Fields */}
							<div className="space-y-3 border-t border-slate-200 pt-4">
								<div className="flex items-center space-x-2">
									<Switch
										id="is-grocery-item-edit"
										checked={product.is_grocery_item}
										onCheckedChange={handleGroceryItemChange} // Use specific handler
										name="is_grocery_item" // Keep name for consistency if needed, though Switch might not use it
									/>
									<Label
										htmlFor="is-grocery-item-edit"
										className="text-sm font-medium text-slate-700"
									>
										This is a grocery item (track inventory)
									</Label>
								</div>

								{product.is_grocery_item && (
									<div>
										<label
											htmlFor="inventory-quantity-edit"
											className="flex items-center text-xs font-medium text-slate-600 mb-1"
										>
											<ArchiveBoxIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />
											Current Inventory Quantity{" "}
											<span className="text-red-500">*</span>
										</label>
										<input
											type="number"
											id="inventory-quantity-edit"
											name="inventory_quantity"
											value={product.inventory_quantity}
											onChange={handleChange}
											min="0"
											className={
												fieldErrors.inventory_quantity
													? inputErrorClass
													: inputNormalClass
											}
											placeholder="e.g., 100"
											required={product.is_grocery_item}
										/>
										{fieldErrors.inventory_quantity && (
											<p className="mt-1 text-xs text-red-500">
												{fieldErrors.inventory_quantity}
											</p>
										)}
									</div>
								)}
							</div>

							<div className="flex justify-end space-x-3 pt-2">
								<button
									type="button"
									onClick={() => navigate("/products")}
									className={secondaryButtonClass}
									disabled={isSubmitting}
								>
									<XMarkIcon className="h-5 w-5" /> Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting || loading}
									className={`${primaryButtonClass} min-w-[140px]`}
								>
									{isSubmitting ? (
										<ArrowPathIcon className="h-4 w-4 animate-spin" />
									) : (
										<CheckIcon className="h-5 w-5" />
									)}
									{isSubmitting ? "Saving..." : "Save Changes"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
