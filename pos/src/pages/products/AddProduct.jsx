import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { ENDPOINTS } from "../../api/config/apiEndpoints"; // Import ENDPOINTS
import {
	ArrowLeftIcon,
	PlusIcon,
	ExclamationTriangleIcon,
	QrCodeIcon, // Icon for barcode
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify"; // For user feedback

const AddProduct = () => {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [barcode, setBarcode] = useState(""); // <-- New state for barcode
	const [categories, setCategories] = useState([]);
	const [error, setError] = useState(null);
	const [fieldErrors, setFieldErrors] = useState({}); // For individual field errors
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		axiosInstance
			.get(ENDPOINTS.PRODUCTS.CATEGORIES) // Use ENDPOINTS
			.then((response) => setCategories(response.data))
			.catch((error) => {
				console.error("Error fetching categories:", error);
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
		// Barcode can be optional or have specific validation (e.g., length, checksum)
		// For now, we'll make it optional. Add validation if needed:
		// if (barcode.trim() && barcode.trim().length < 6) errors.barcode = "Barcode seems too short.";
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
				category, // Send category ID
				barcode: barcode.trim() === "" ? null : barcode.trim(), // Send barcode, or null if empty
			};
			await axiosInstance.post(ENDPOINTS.PRODUCTS.ADD, payload); // Use ENDPOINTS
			toast.success("Product added successfully!");
			navigate("/products");
		} catch (error) {
			console.error("Add product error:", error);
			const errorData = error.response?.data;
			if (errorData && typeof errorData === "object") {
				// Handle specific field errors from backend
				const backendFieldErrors = {};
				for (const key in errorData) {
					if (Array.isArray(errorData[key])) {
						backendFieldErrors[key] = errorData[key].join(" ");
					} else {
						backendFieldErrors[key] = String(errorData[key]);
					}
				}
				setFieldErrors(backendFieldErrors);
				if (errorData.detail) {
					setError(errorData.detail);
					toast.error(errorData.detail);
				} else {
					toast.error("Failed to add product. Please check the details.");
				}
			} else {
				const errorMsg =
					"Failed to add product. Check details or ensure you have admin rights.";
				setError(errorMsg);
				toast.error(errorMsg);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="w-screen h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6">
			<header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Add New Product
				</h1>
				<button
					onClick={() => navigate("/products")}
					disabled={isSubmitting}
					className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
				>
					<ArrowLeftIcon className="h-4 w-4" />
					Back to Products
				</button>
			</header>

			<div className="flex-1 flex items-center justify-center py-6">
				<div className="w-full max-w-lg">
					<div className="bg-white rounded-lg shadow-xl border border-slate-200 p-6 sm:p-8">
						{error && (
							<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
								<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
								<span>{error}</span>
							</div>
						)}
						<form
							onSubmit={handleSubmit}
							className="space-y-5"
						>
							<div>
								<label
									htmlFor="product-name"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Product Name <span className="text-red-500">*</span>
								</label>
								<input
									id="product-name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400 ${
										fieldErrors.name
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
									}`}
									required
									placeholder="e.g., Zaatar Mana'eesh"
								/>
								{fieldErrors.name && (
									<p className="mt-1 text-xs text-red-500">
										{fieldErrors.name}
									</p>
								)}
							</div>

							{/* Barcode Field */}
							<div>
								<label
									htmlFor="product-barcode"
									className="flex items-center text-sm font-medium text-slate-700 mb-1.5"
								>
									<QrCodeIcon className="h-4 w-4 mr-1 text-slate-500" /> Barcode
									(Optional)
								</label>
								<input
									id="product-barcode"
									type="text"
									value={barcode}
									onChange={(e) => setBarcode(e.target.value)}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400 ${
										fieldErrors.barcode
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
									}`}
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
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Price <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
										$
									</span>
									<input
										id="product-price"
										type="number"
										step="0.01"
										min="0"
										value={price}
										onChange={(e) => setPrice(e.target.value)}
										className={`w-full pl-7 pr-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400 ${
											fieldErrors.price
												? "border-red-500 ring-red-500"
												: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
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
									htmlFor="product-description"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Description <span className="text-red-500">*</span>
								</label>
								<textarea
									id="product-description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm h-24 resize-none placeholder-slate-400 ${
										fieldErrors.description
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
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
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Category <span className="text-red-500">*</span>
								</label>
								<select
									id="product-category"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm appearance-none bg-white bg-no-repeat bg-right-3 text-slate-700 ${
										fieldErrors.category
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
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

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:opacity-50"
							>
								<PlusIcon className="h-5 w-5" />
								{isSubmitting ? "Adding Product..." : "Add Product"}
							</button>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AddProduct;
