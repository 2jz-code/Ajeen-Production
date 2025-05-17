import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/config/axiosConfig";
import { ENDPOINTS } from "../../api/config/apiEndpoints"; // Import ENDPOINTS
import {
	ArrowLeftIcon,
	CheckIcon,
	XMarkIcon,
	ExclamationTriangleIcon,
	PhotoIcon,
	QrCodeIcon, // Icon for barcode
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner"; // Assuming you have this
import { toast } from "react-toastify"; // For user feedback

const EditProduct = () => {
	const { name: productNameParam } = useParams(); // Renamed to avoid conflict with product.name
	const navigate = useNavigate();

	const [product, setProduct] = useState({
		name: "",
		price: "",
		description: "",
		category: "",
		image: "",
		barcode: "", // <-- Initialize barcode field
	});
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null); // General error for the page
	const [fieldErrors, setFieldErrors] = useState({}); // For individual field errors
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		let isMounted = true;
		setLoading(true);
		setError(null);
		setFieldErrors({});

		const fetchProduct = axiosInstance
			.get(ENDPOINTS.PRODUCTS.DETAIL(productNameParam)) // Use ENDPOINTS and param
			.then((response) => {
				if (isMounted) {
					const fetchedProduct = response.data;
					if (
						fetchedProduct.category &&
						typeof fetchedProduct.category === "object"
					) {
						fetchedProduct.category = fetchedProduct.category.id;
					} else if (
						fetchedProduct.category === null ||
						fetchedProduct.category === undefined
					) {
						fetchedProduct.category = "";
					}
					// Ensure barcode is a string, default to empty if null/undefined
					fetchedProduct.barcode = fetchedProduct.barcode || "";
					setProduct(fetchedProduct);
				}
			})
			.catch((err) => {
				// Catch block for fetchProduct
				console.error("Error fetching product:", err);
				if (isMounted) {
					setError(
						"Failed to fetch product details. It might have been deleted or the name changed."
					);
					toast.error("Failed to load product details.");
				}
			});

		const fetchCategories = axiosInstance
			.get(ENDPOINTS.PRODUCTS.CATEGORIES) // Use ENDPOINTS
			.then((response) => {
				if (isMounted) setCategories(response.data);
			})
			.catch((err) => {
				// Catch block for fetchCategories
				console.error("Error fetching categories:", err);
				if (isMounted) {
					// Don't overwrite product fetch error unless it's the only error
					if (!error) setError("Failed to load categories.");
					toast.error("Failed to load categories.");
				}
			});

		Promise.all([fetchProduct, fetchCategories])
			.catch((err) => {
				// This catch is for Promise.all itself, e.g., if one of the promises is already rejected
				console.error(
					"Error in Promise.all while fetching product/category data:",
					err
				);
				if (isMounted && !error) {
					// Avoid overwriting more specific errors
					setError("An unexpected error occurred while loading data.");
				}
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [productNameParam, error]); // Added `error` to dependency array to avoid potential stale closure issues if setError was called inside

	const handleChange = (e) => {
		const { name, value } = e.target;
		setProduct({ ...product, [name]: value });
		if (fieldErrors[name]) {
			setFieldErrors((prev) => ({ ...prev, [name]: null }));
		}
		if (error) setError(null); // Clear general page error on input change
	};

	const validateForm = () => {
		const errors = {};
		if (!product.name.trim()) errors.name = "Product name is required.";
		if (!product.price.toString().trim()) errors.price = "Price is required.";
		else if (isNaN(parseFloat(product.price)) || parseFloat(product.price) <= 0)
			errors.price = "Price must be a positive number.";
		if (!product.description.trim())
			errors.description = "Description is required.";
		if (!product.category) errors.category = "Category is required.";
		// Optional barcode validation
		// if (product.barcode.trim() && product.barcode.trim().length < 6) errors.barcode = "Barcode seems too short.";
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
		const updatedProductData = { ...product };
		delete updatedProductData.image; // Remove image URL before sending

		if (updatedProductData.category === "") {
			delete updatedProductData.category;
		} else {
			updatedProductData.category = parseInt(updatedProductData.category, 10);
		}
		// Ensure barcode is null if empty, otherwise send the trimmed string
		updatedProductData.barcode =
			updatedProductData.barcode.trim() === ""
				? null
				: updatedProductData.barcode.trim();

		try {
			await axiosInstance.put(
				ENDPOINTS.PRODUCTS.EDIT(productNameParam), // Use original name for endpoint
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
					if (Array.isArray(errorData[key])) {
						backendFieldErrors[key] = errorData[key].join(" ");
					} else {
						backendFieldErrors[key] = String(errorData[key]);
					}
				}
				setFieldErrors(backendFieldErrors);

				if (errorData.detail) {
					// General detail error from backend
					setError(errorData.detail);
					toast.error(errorData.detail);
				} else {
					toast.error("Failed to update product. Please check the details.");
				}
			} else {
				const errorMsg =
					"Failed to update product. Check details or ensure you have admin rights.";
				setError(errorMsg);
				toast.error(errorMsg);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-slate-100">
				<LoadingSpinner />
				<p className="text-slate-500 ml-3">Loading product details...</p>
			</div>
		);
	}
	// If there's a general page error (e.g. product not found) and no product data loaded
	if (error && !product?.name) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-6">
				<div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
					<ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={() => navigate("/products")}
						className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
					>
						Back to Products
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 p-4 sm:p-6">
			<header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
				<h1 className="text-xl sm:text-2xl font-bold text-slate-800">
					Edit Product
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

			<div className="flex-grow flex items-center justify-center py-6">
				<div className="flex flex-col md:flex-row max-w-4xl w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
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
										e.target.src =
											"https://placehold.co/300x300/e2e8f0/94a3b8?text=No+Image";
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
						<h3 className="text-lg font-semibold mb-5 text-slate-700">
							Edit Product Details
						</h3>
						{error &&
							!fieldErrors.detail && ( // Show general error if not a field-specific detail error
								<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
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
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Product Name <span className="text-red-500">*</span>
								</label>
								<input
									id="product-name-edit"
									type="text"
									name="name"
									value={product.name}
									onChange={handleChange}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm placeholder-slate-400 ${
										fieldErrors.name
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
									}`}
									required
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
									htmlFor="product-barcode-edit"
									className="flex items-center text-sm font-medium text-slate-700 mb-1.5"
								>
									<QrCodeIcon className="h-4 w-4 mr-1 text-slate-500" /> Barcode
									(Optional)
								</label>
								<input
									id="product-barcode-edit"
									type="text"
									name="barcode"
									value={product.barcode || ""} // Ensure controlled component even if barcode is null
									onChange={handleChange}
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
									htmlFor="product-price-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
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
									htmlFor="product-description-edit"
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Description <span className="text-red-500">*</span>
								</label>
								<textarea
									id="product-description-edit"
									name="description"
									value={product.description}
									onChange={handleChange}
									className={`w-full px-3 py-2 border rounded-md focus:ring-1 transition-shadow duration-150 ease-in-out shadow-sm h-24 resize-none placeholder-slate-400 ${
										fieldErrors.description
											? "border-red-500 ring-red-500"
											: "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
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
									className="block text-sm font-medium text-slate-700 mb-1.5"
								>
									Category <span className="text-red-500">*</span>
								</label>
								<select
									id="product-category-edit"
									name="category"
									value={product.category || ""}
									onChange={handleChange}
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

							<div className="flex space-x-3 pt-2">
								<button
									type="submit"
									disabled={isSubmitting}
									className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:opacity-50"
								>
									<CheckIcon className="h-5 w-5" />
									{isSubmitting ? "Saving..." : "Save Changes"}
								</button>
								<button
									type="button"
									disabled={isSubmitting}
									onClick={() => navigate("/products")}
									className="flex-1 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 shadow-sm disabled:opacity-50"
								>
									<XMarkIcon className="h-5 w-5" />
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EditProduct;
