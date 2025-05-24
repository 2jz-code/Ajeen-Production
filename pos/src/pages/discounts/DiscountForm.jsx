// src/pages/discounts/DiscountForm.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { discountService } from "../../api/services/discountService";
import axiosInstance from "../../api/config/axiosConfig";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	TagIcon as PageIcon,
	ArrowLeftIcon,
	InformationCircleIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

// Helper component for form fields (assuming it's defined as before)
const FormField = ({
	label,
	id,
	children,
	required = false,
	helpText = null,
	error = null,
	className = "",
}) => (
	<div className={`mb-4 ${className}`}>
		<label
			htmlFor={id}
			className="mb-1 block text-sm font-medium text-slate-700"
		>
			{label} {required && <span className="text-red-500">*</span>}
		</label>
		{children}
		{helpText && !error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
				<InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
				{helpText}
			</p>
		)}
		{error && (
			<p className="mt-1 flex items-center gap-1 text-xs text-red-600">
				<ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
				{error}
			</p>
		)}
	</div>
);
FormField.propTypes = {
	label: PropTypes.string.isRequired,
	id: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
	required: PropTypes.bool,
	helpText: PropTypes.string,
	error: PropTypes.string,
	className: PropTypes.string,
};

// Helper component for section headings (assuming it's defined as before)
const FormSectionHeading = ({ children }) => (
	<h2 className="mb-4 border-b border-slate-200 pb-2 text-base font-semibold text-slate-700">
		{children}
	</h2>
);
FormSectionHeading.propTypes = { children: PropTypes.node.isRequired };

export default function DiscountForm() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { execute, isLoading: isApiLoadingHook } = useApi();
	const isEditMode = !!id;

	const [formData, setFormData] = useState({
		name: "",
		code: "",
		description: "",
		discount_type: "percentage",
		value: "",
		apply_to: "order",
		products: [],
		categories: [],
		is_active: true,
		start_date: "",
		end_date: "",
		minimum_order_amount: "",
		usage_limit: "",
		discount_category: "promotional",
	});
	const [allProducts, setAllProducts] = useState([]);
	const [allCategories, setAllCategories] = useState([]);
	const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Combined loading state
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formErrors, setFormErrors] = useState({});

	const fetchDiscountData = useCallback(async () => {
		if (!isEditMode) {
			setIsLoadingInitialData(false); // No data to fetch for new form
			return;
		}
		try {
			const discount = await execute(() => discountService.getDiscount(id));
			if (discount) {
				const formattedDiscount = {
					...discount,
					products: discount.products || [],
					categories: discount.categories || [],
					start_date: discount.start_date
						? new Date(discount.start_date).toISOString().split("T")[0]
						: "",
					end_date: discount.end_date
						? new Date(discount.end_date).toISOString().split("T")[0]
						: "",
					value: discount.value ?? "",
					minimum_order_amount: discount.minimum_order_amount ?? "",
					usage_limit: discount.usage_limit ?? "",
					is_active: discount.is_active ?? true,
				};
				setFormData(formattedDiscount);
			}
		} catch (error) {
			console.error("Error fetching discount:", error);
			toast.error("Failed to load discount details.");
		}
	}, [id, isEditMode, execute]);

	const fetchOptions = useCallback(async () => {
		try {
			const [productsResponse, categoriesResponse] = await Promise.all([
				axiosInstance.get("products/"),
				axiosInstance.get("products/categories/"),
			]);
			setAllProducts(productsResponse.data || []);
			setAllCategories(categoriesResponse.data || []);
		} catch (error) {
			console.error("Error fetching options:", error);
			toast.error("Failed to load product/category options.");
		}
	}, []);

	useEffect(() => {
		const loadAllData = async () => {
			setIsLoadingInitialData(true);
			await Promise.all([fetchDiscountData(), fetchOptions()]);
			setIsLoadingInitialData(false);
		};
		loadAllData();
	}, [fetchDiscountData, fetchOptions]);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		let newValue =
			type === "checkbox" && name === "is_active" ? checked : value;
		if (type === "radio" && name === "apply_to") {
			setFormData((prev) => ({
				...prev,
				apply_to: value,
				products: value !== "product" ? [] : prev.products,
				categories: value !== "category" ? [] : prev.categories,
			}));
			setFormErrors((prev) => ({ ...prev, products: null, categories: null }));
			return;
		}
		setFormData((prev) => ({ ...prev, [name]: newValue }));
		if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
	};

	const handleCheckboxListChange = (e, listType) => {
		const { value, checked } = e.target;
		const itemId = parseInt(value, 10);
		setFormData((prev) => {
			const currentList = prev[listType] || [];
			const updatedList = checked
				? currentList.includes(itemId)
					? currentList
					: [...currentList, itemId]
				: currentList.filter((idVal) => idVal !== itemId);
			return { ...prev, [listType]: updatedList };
		});
		if (formErrors[listType])
			setFormErrors((prev) => ({ ...prev, [listType]: null }));
	};

	const validateForm = () => {
		/* ... (validation logic remains the same) ... */
		const errors = {};
		if (!formData.name.trim()) errors.name = "Discount Name is required.";
		if (
			formData.value === "" ||
			formData.value === null ||
			isNaN(parseFloat(formData.value))
		)
			errors.value = "Discount Value is required and must be a number.";
		else {
			const numValue = parseFloat(formData.value);
			if (
				formData.discount_type === "percentage" &&
				(numValue < 0 || numValue > 100)
			)
				errors.value = "Percentage value must be between 0 and 100.";
			else if (formData.discount_type === "fixed" && numValue <= 0)
				errors.value = "Fixed amount must be greater than 0.";
		}
		if (formData.apply_to === "product" && formData.products.length === 0)
			errors.products = "Please select at least one product.";
		if (formData.apply_to === "category" && formData.categories.length === 0)
			errors.categories = "Please select at least one category.";
		if (
			formData.discount_category === "promotional" &&
			formData.start_date &&
			formData.end_date &&
			formData.start_date > formData.end_date
		)
			errors.end_date = "End date cannot be before the start date.";
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e) => {
		/* ... (submit logic remains the same) ... */
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		try {
			const submitData = {
				...formData,
				value: parseFloat(formData.value),
				minimum_order_amount: formData.minimum_order_amount
					? parseFloat(formData.minimum_order_amount)
					: null,
				usage_limit: formData.usage_limit
					? parseInt(formData.usage_limit, 10)
					: null,
				start_date:
					formData.discount_category === "permanent"
						? null
						: formData.start_date
						? `${formData.start_date}T00:00:00Z`
						: null,
				end_date:
					formData.discount_category === "permanent"
						? null
						: formData.end_date
						? `${formData.end_date}T23:59:59Z`
						: null,
				products: formData.products.map((idVal) => parseInt(idVal, 10)),
				categories: formData.categories.map((idVal) => parseInt(idVal, 10)),
			};
			if (submitData.apply_to !== "product") delete submitData.products;
			if (submitData.apply_to !== "category") delete submitData.categories;

			if (isEditMode)
				await execute(() => discountService.updateDiscount(id, submitData), {
					successMessage: "Discount updated successfully!",
				});
			else
				await execute(() => discountService.createDiscount(submitData), {
					successMessage: "Discount created successfully!",
				});
			navigate("/discounts");
		} catch (error) {
			console.error("Error saving discount:", error);
			if (error.response?.data && typeof error.response.data === "object") {
				const backendErrors = {};
				Object.keys(error.response.data).forEach((field) => {
					backendErrors[field] = Array.isArray(error.response.data[field])
						? error.response.data[field].join(" ")
						: error.response.data[field];
				});
				setFormErrors((prev) => ({ ...prev, ...backendErrors }));
				toast.error("Failed to save discount due to validation errors.");
			} else {
				toast.error(error.message || "An unexpected error occurred.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const pageTitle = isEditMode
		? `Edit Discount: ${formData?.name || "..."}`
		: "Create New Discount";
	const inputBaseClass =
		"block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6";
	const inputNormalClass = `${inputBaseClass} ring-slate-300 focus:ring-orange-600`;
	const inputErrorClass = `${inputBaseClass} ring-red-500 focus:ring-red-600`;
	const secondaryButtonClass =
		"rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
	const primaryButtonClass =
		"rounded-md border border-slate-300 bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

	if (isLoadingInitialData) {
		return (
			<MainLayout
				pageTitle={isEditMode ? "Loading Discount..." : "Create New Discount"}
			>
				<div className="flex h-full items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={pageTitle}>
			{/* Increased max-width for the form container */}
			<div className="max-w-5xl mx-auto">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
						<PageIcon className="h-6 w-6 text-orange-500" />
						{isEditMode ? "Edit Discount Details" : "New Discount Form"}
					</h2>
					<button
						className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						onClick={() => navigate("/discounts")}
						disabled={isSubmitting}
					>
						{" "}
						<ArrowLeftIcon className="h-4 w-4" /> Back to List
					</button>
				</div>

				<div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8">
					<form
						onSubmit={handleSubmit}
						noValidate
					>
						{/* Main grid for layout: sections side-by-side on larger screens */}
						<div className="grid grid-cols-1 lg:grid-cols-5 gap-x-8">
							{/* Left Column (Basic Info & Discount Details) - Spans 3 columns on lg */}
							<div className="lg:col-span-3 space-y-6">
								<section>
									<FormSectionHeading>Basic Information</FormSectionHeading>
									{/* Using grid for internal layout of basic info */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
										<FormField
											label="Discount Name"
											id="discount-name"
											required
											error={formErrors.name}
											className="sm:col-span-2"
										>
											<input
												type="text"
												id="discount-name"
												name="name"
												value={formData.name}
												onChange={handleChange}
												required
												className={`${
													formErrors.name ? inputErrorClass : inputNormalClass
												}`}
											/>
										</FormField>
										<FormField
											label="Discount Category"
											id="discount-category"
											required
											error={formErrors.discount_category}
											helpText={
												formData.discount_category === "promotional"
													? "Can have start/end dates."
													: "Applies indefinitely."
											}
										>
											<select
												id="discount-category"
												name="discount_category"
												value={formData.discount_category}
												onChange={handleChange}
												required
												className={`${inputNormalClass} ${
													formErrors.discount_category
														? "ring-red-500 border-red-500"
														: "ring-slate-300 focus:ring-orange-600"
												}`}
											>
												{/* ...options... */}
												<option value="promotional">Promotional</option>
												<option value="permanent">Permanent</option>
											</select>
										</FormField>
										<FormField
											label="Discount Code"
											id="discount-code"
											helpText="Optional. Leave blank for automatic."
											error={formErrors.code}
										>
											<input
												type="text"
												id="discount-code"
												name="code"
												value={formData.code ?? ""}
												onChange={handleChange}
												placeholder="e.g., SUMMER25"
												className={`font-mono uppercase placeholder:normal-case placeholder:font-sans ${
													formErrors.code ? inputErrorClass : inputNormalClass
												}`}
											/>
										</FormField>
									</div>
									<FormField
										label="Description"
										id="discount-description"
										helpText="Optional note."
										error={formErrors.description}
										className="mt-4"
									>
										<textarea
											id="discount-description"
											name="description"
											value={formData.description ?? ""}
											onChange={handleChange}
											rows="2"
											className={`${
												formErrors.description
													? inputErrorClass
													: inputNormalClass
											} min-h-[60px]`}
										/>
									</FormField>
								</section>

								<section>
									<FormSectionHeading>Discount Application</FormSectionHeading>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
										<FormField
											label="Discount Type"
											id="discount-type"
											required
											error={formErrors.discount_type}
										>
											<select
												id="discount-type"
												name="discount_type"
												value={formData.discount_type}
												onChange={handleChange}
												required
												className={`${inputNormalClass} ${
													formErrors.discount_type
														? "ring-red-500 border-red-500"
														: "ring-slate-300 focus:ring-orange-600"
												}`}
											>
												<option value="percentage">Percentage (%)</option>
												<option value="fixed">Fixed Amount ($)</option>
											</select>
										</FormField>
										<FormField
											label={`Value ${
												formData.discount_type === "percentage" ? "(%)" : "($)"
											}`}
											id="discount-value"
											required
											error={formErrors.value}
										>
											<input
												type="number"
												id="discount-value"
												name="value"
												value={formData.value}
												onChange={handleChange}
												required
												min={
													formData.discount_type === "percentage" ? "0" : "0.01"
												}
												max={
													formData.discount_type === "percentage"
														? "100"
														: undefined
												}
												step={
													formData.discount_type === "percentage" ? "1" : "0.01"
												}
												className={`${
													formErrors.value ? inputErrorClass : inputNormalClass
												}`}
											/>
										</FormField>
									</div>
									<div className="mt-4">
										<label className="block text-sm font-medium text-slate-700 mb-2">
											Apply To*
										</label>
										<div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
											{" "}
											{/* Radio buttons improved layout */}
											{["order", "product", "category"].map((applyType) => (
												<label
													key={applyType}
													className="flex items-center cursor-pointer rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-300 flex-1 min-w-[150px]"
												>
													<input
														type="radio"
														name="apply_to"
														value={applyType}
														checked={formData.apply_to === applyType}
														onChange={handleChange}
														className="h-4 w-4 border-slate-300 text-orange-600 focus:ring-orange-500"
													/>
													<span className="ml-2 text-sm text-slate-700 capitalize">
														{applyType === "order"
															? "Entire Order"
															: applyType === "product"
															? "Specific Products"
															: "Product Categories"}
													</span>
												</label>
											))}
										</div>
										{formErrors.apply_to && (
											<p className="mt-1 text-xs text-red-600">
												{formErrors.apply_to}
											</p>
										)}
									</div>
									{/* Product/Category lists remain in this column but only show if selected */}
									{formData.apply_to === "product" && (
										<FormField
											label="Select Products"
											id="products-list"
											required
											error={formErrors.products}
											className="mt-4"
										>
											<div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-300 bg-slate-50/50 p-2 custom-scrollbar">
												{isLoadingInitialData ? (
													<p className="text-sm text-slate-500 italic p-2">
														Loading...
													</p>
												) : allProducts.length === 0 ? (
													<p className="text-sm text-slate-500 italic p-2">
														No products.
													</p>
												) : (
													allProducts.map((product) => (
														<label
															key={product.id}
															className="flex items-center space-x-2 rounded p-1.5 hover:bg-slate-100 cursor-pointer"
														>
															<input
																type="checkbox"
																name="products"
																value={product.id}
																checked={formData.products.includes(product.id)}
																onChange={(e) =>
																	handleCheckboxListChange(e, "products")
																}
																className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
															/>
															<span className="text-sm text-slate-800">
																{product.name} - ${product.price}
															</span>
														</label>
													))
												)}
											</div>
										</FormField>
									)}
									{formData.apply_to === "category" && (
										<FormField
											label="Select Categories"
											id="categories-list"
											required
											error={formErrors.categories}
											className="mt-4"
										>
											<div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-300 bg-slate-50/50 p-2 custom-scrollbar">
												{isLoadingInitialData ? (
													<p className="text-sm text-slate-500 italic p-2">
														Loading...
													</p>
												) : allCategories.length === 0 ? (
													<p className="text-sm text-slate-500 italic p-2">
														No categories.
													</p>
												) : (
													allCategories.map((category) => (
														<label
															key={category.id}
															className="flex items-center space-x-2 rounded p-1.5 hover:bg-slate-100 cursor-pointer"
														>
															<input
																type="checkbox"
																name="categories"
																value={category.id}
																checked={formData.categories.includes(
																	category.id
																)}
																onChange={(e) =>
																	handleCheckboxListChange(e, "categories")
																}
																className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
															/>
															<span className="text-sm text-slate-800">
																{category.name}
															</span>
														</label>
													))
												)}
											</div>
										</FormField>
									)}
								</section>
							</div>

							{/* Right Column (Validity & Limits) - Spans 2 columns on lg */}
							<div className="lg:col-span-2 space-y-4">
								<section>
									<FormSectionHeading>Validity & Limits</FormSectionHeading>
									<div className="mb-4 flex items-center">
										<input
											type="checkbox"
											id="is_active"
											name="is_active"
											checked={formData.is_active}
											onChange={handleChange}
											className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
										/>
										<label
											htmlFor="is_active"
											className="ml-2 block text-sm font-medium text-slate-700"
										>
											Discount is Active
										</label>
									</div>

									{/* Date fields now in a 2-column grid within this section */}
									{formData.discount_category === "promotional" && (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
											<FormField
												label="Start Date"
												id="start-date"
												helpText="Optional."
												error={formErrors.start_date}
											>
												<input
													type="date"
													id="start-date"
													name="start_date"
													value={formData.start_date}
													onChange={handleChange}
													className={`${
														formErrors.start_date
															? inputErrorClass
															: inputNormalClass
													}`}
												/>
											</FormField>
											<FormField
												label="End Date"
												id="end-date"
												helpText="Optional."
												error={formErrors.end_date}
											>
												<input
													type="date"
													id="end-date"
													name="end_date"
													value={formData.end_date}
													onChange={handleChange}
													min={formData.start_date || ""}
													className={`${
														formErrors.end_date
															? inputErrorClass
															: inputNormalClass
													}`}
												/>
											</FormField>
										</div>
									)}
									{formData.discount_category === "permanent" && (
										<div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
											<p>Date limits are disabled for permanent discounts.</p>
										</div>
									)}

									{/* Min Order and Usage Limit also in a 2-column grid */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
										<FormField
											label="Minimum Order Amount ($)"
											id="min-order-amount"
											helpText="Optional."
											error={formErrors.minimum_order_amount}
										>
											<input
												type="number"
												id="min-order-amount"
												name="minimum_order_amount"
												value={formData.minimum_order_amount}
												onChange={handleChange}
												placeholder="e.g., 50.00"
												min="0"
												step="0.01"
												className={`${
													formErrors.minimum_order_amount
														? inputErrorClass
														: inputNormalClass
												}`}
											/>
										</FormField>
										<FormField
											label="Usage Limit"
											id="usage-limit"
											helpText="Optional. Max total uses."
											error={formErrors.usage_limit}
										>
											<input
												type="number"
												id="usage-limit"
												name="usage_limit"
												value={formData.usage_limit}
												onChange={handleChange}
												placeholder="e.g., 100"
												min="0"
												step="1"
												className={`${
													formErrors.usage_limit
														? inputErrorClass
														: inputNormalClass
												}`}
											/>
										</FormField>
									</div>
								</section>
							</div>
						</div>
						<div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
							<button
								type="button"
								onClick={() => navigate("/discounts")}
								disabled={isSubmitting}
								className={secondaryButtonClass}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || isApiLoadingHook}
								className={`min-w-[150px] ${primaryButtonClass}`}
							>
								{" "}
								{/* Ensure button text doesn't get too squished */}
								{isSubmitting ? (
									<>
										<ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
										{isEditMode ? "Updating..." : "Creating..."}
									</>
								) : (
									<>{isEditMode ? "Update Discount" : "Create Discount"}</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</MainLayout>
	);
}
