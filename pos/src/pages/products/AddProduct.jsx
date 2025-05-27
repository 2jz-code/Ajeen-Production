// src/pages/products/AddProduct.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { ENDPOINTS } from "../../api/config/apiEndpoints";
import {
	ArrowLeftIcon,
	PlusCircleIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	QrCodeIcon,
	ArchiveBoxIcon, // For inventory
} from "@heroicons/react/24/outline";
import { PackageIcon } from "lucide-react";
import { toast } from "react-toastify";
import MainLayout from "../layout/MainLayout";
import { Switch } from "@/components/ui/switch"; // Assuming you have a Switch component
import { Label } from "@/components/ui/label"; // Assuming you have a Label component

export default function AddProduct() {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [barcode, setBarcode] = useState("");
	const [isGroceryItem, setIsGroceryItem] = useState(false);
	const [inventoryQuantity, setInventoryQuantity] = useState(0);
	const [categories, setCategories] = useState([]);
	const [error, setError] = useState(null);
	const [fieldErrors, setFieldErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		axiosInstance
			.get(ENDPOINTS.PRODUCTS.CATEGORIES)
			.then((response) => setCategories(response.data))
			.catch((err) => {
				console.error("Error fetching categories:", err);
				toast.error("Could not load categories.");
			});
	}, []);

	const validateForm = () => {
		const errors = {};
		if (!name.trim()) errors.name = "Product name is required.";
		if (!price.trim()) errors.price = "Price is required.";
		else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
			errors.price = "Price must be a positive number.";
		if (!description.trim()) errors.description = "Description is required.";
		if (!category) errors.category = "Category is required.";
		if (
			isGroceryItem &&
			(isNaN(parseInt(inventoryQuantity)) || parseInt(inventoryQuantity) < 0)
		) {
			errors.inventoryQuantity =
				"Inventory must be a non-negative number for grocery items.";
		}
		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setFieldErrors({});
		if (!validateForm()) {
			toast.error("Please correct the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		try {
			const payload = {
				name,
				price,
				description,
				category,
				barcode: barcode.trim() === "" ? null : barcode.trim(),
				is_grocery_item: isGroceryItem,
				inventory_quantity: isGroceryItem ? parseInt(inventoryQuantity) : 0,
			};
			await axiosInstance.post(ENDPOINTS.PRODUCTS.ADD, payload);
			toast.success("Product added successfully!");
			navigate("/products");
		} catch (err) {
			console.error("Add product error:", err);
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
					toast.error("Failed to add product. Please check the details.");
				}
			} else {
				const errorMsg = "Failed to add product. Please try again.";
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

	return (
		<MainLayout pageTitle="Add New Product">
			<div className="max-w-2xl mx-auto">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
						<PackageIcon className="h-6 w-6 text-slate-600" />
						Product Information
					</h2>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/products")}
						disabled={isSubmitting}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Cancel
					</button>
				</div>
				<div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8">
					{error && (
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
						className="space-y-5"
						noValidate
					>
						<div>
							<label
								htmlFor="product-name"
								className={labelClass}
							>
								Product Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="product-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={
									fieldErrors.name ? inputErrorClass : inputNormalClass
								}
								required
								placeholder="e.g., Zaatar Mana'eesh"
							/>
							{fieldErrors.name && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
							)}
						</div>
						<div>
							<label
								htmlFor="product-barcode"
								className="flex items-center text-xs font-medium text-slate-600 mb-1"
							>
								<QrCodeIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />{" "}
								Barcode (Optional)
							</label>
							<input
								type="text"
								id="product-barcode"
								value={barcode}
								onChange={(e) => setBarcode(e.target.value)}
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
								htmlFor="product-price"
								className={labelClass}
							>
								Price <span className="text-red-500">*</span>
							</label>
							<div className="relative">
								<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
									$
								</span>
								<input
									type="number"
									id="product-price"
									step="0.01"
									min="0"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									className={`pl-7 pr-3 ${
										fieldErrors.price ? inputErrorClass : inputNormalClass
									}`}
									required
									placeholder="0.00"
								/>
							</div>
							{fieldErrors.price && (
								<p className="mt-1 text-xs text-red-500">{fieldErrors.price}</p>
							)}
						</div>
						<div>
							<label
								htmlFor="product-description"
								className={labelClass}
							>
								Description <span className="text-red-500">*</span>
							</label>
							<textarea
								id="product-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className={`h-24 resize-none ${
									fieldErrors.description ? inputErrorClass : inputNormalClass
								}`}
								required
								placeholder="Enter a brief description..."
							/>
							{fieldErrors.description && (
								<p className="mt-1 text-xs text-red-500">
									{fieldErrors.description}
								</p>
							)}
						</div>
						<div>
							<label
								htmlFor="product-category"
								className={labelClass}
							>
								Category <span className="text-red-500">*</span>
							</label>
							<select
								id="product-category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
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
						<div className="space-y-2 border-t border-slate-200 pt-4">
							<div className="flex items-center space-x-2">
								<Switch
									id="is-grocery-item"
									checked={isGroceryItem}
									onCheckedChange={setIsGroceryItem}
								/>
								<Label
									htmlFor="is-grocery-item"
									className="text-sm font-medium text-slate-700"
								>
									This is a grocery item (track inventory)
								</Label>
							</div>

							{isGroceryItem && (
								<div>
									<label
										htmlFor="inventory-quantity"
										className="flex items-center text-xs font-medium text-slate-600 mb-1"
									>
										<ArchiveBoxIcon className="h-3.5 w-3.5 mr-1 text-slate-500" />
										Initial Inventory Quantity{" "}
										<span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										id="inventory-quantity"
										value={inventoryQuantity}
										onChange={(e) => setInventoryQuantity(e.target.value)}
										min="0"
										className={
											fieldErrors.inventoryQuantity
												? inputErrorClass
												: inputNormalClass
										}
										placeholder="e.g., 100"
										required={isGroceryItem}
									/>
									{fieldErrors.inventoryQuantity && (
										<p className="mt-1 text-xs text-red-500">
											{fieldErrors.inventoryQuantity}
										</p>
									)}
								</div>
							)}
						</div>

						<div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
							<button
								type="button"
								onClick={() => navigate("/products")}
								className={secondaryButtonClass}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className={`${primaryButtonClass} min-w-[120px]`}
							>
								{isSubmitting ? (
									<ArrowPathIcon className="h-4 w-4 animate-spin" />
								) : (
									<PlusCircleIcon className="h-5 w-5" />
								)}
								{isSubmitting ? "Adding..." : "Add Product"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</MainLayout>
	);
}
