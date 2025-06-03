// src/pages/users/AddUser.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import PropTypes from "prop-types"; // Import PropTypes
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	PlusCircleIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
} from "@heroicons/react/24/outline";
import MainLayout from "../layout/MainLayout";

export default function AddUser() {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		username: "",
		email: "",
		password: "",
		confirm_password: "",
		role: "cashier",
		is_pos_user: true,
		is_website_user: false,
		first_name: "",
		last_name: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState({});
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [generalError, setGeneralError] = useState(null);

	useEffect(() => {
		const fetchCurrentUserRole = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
			} catch (error) {
				console.error("Error fetching current user:", error);
				toast.error("Could not verify user role.");
			}
		};
		fetchCurrentUserRole();
	}, []);

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		let updatedFormData = { ...formData };

		if (type === "checkbox") {
			if (name === "is_pos_user" && !checked && !formData.is_website_user) {
				toast.warning(
					"User must belong to at least one system (POS or Website)."
				);
				return;
			}
			if (name === "is_website_user" && !checked && !formData.is_pos_user) {
				toast.warning(
					"User must belong to at least one system (POS or Website)."
				);
				return;
			}
			updatedFormData = { ...updatedFormData, [name]: checked };
			if (name === "is_website_user" && checked) {
				updatedFormData.role = "customer";
			} else if (
				name === "is_website_user" &&
				!checked &&
				formData.role === "customer"
			) {
				updatedFormData.role = "cashier";
			}
		} else if (name === "role") {
			if (value === "owner" && currentUserRole !== "owner") {
				toast.warning("Only owners can create owner users.");
				return;
			}
			if (value === "admin" && currentUserRole === "admin") {
				toast.warning("Admins cannot create other admin users.");
				return;
			}
			if (value === "customer") {
				updatedFormData.is_website_user = true;
				updatedFormData.is_pos_user = false;
			} else if (formData.role === "customer" && formData.is_pos_user) {
				updatedFormData.is_website_user = false;
			}
			updatedFormData = { ...updatedFormData, [name]: value };
		} else {
			updatedFormData = { ...updatedFormData, [name]: value };
		}

		setFormData(updatedFormData);
		if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
		if (name === "password" && errors.confirm_password)
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		if (name === "confirm_password" && errors.confirm_password)
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		setGeneralError(null);
	};

	const validateForm = () => {
		const newErrors = {};
		if (!formData.username.trim()) newErrors.username = "Username is required";
		else if (formData.username.length < 3)
			newErrors.username = "Username must be at least 3 characters";
		// Remove email required validation, but keep format validation if email is provided
		if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email))
			// <--- MODIFIED LINE
			newErrors.email = "Email is invalid"; // <--- MODIFIED LINE
		if (!formData.password) newErrors.password = "Password is required";
		else if (formData.password.length < 8)
			newErrors.password = "Password must be at least 8 characters";
		if (formData.password !== formData.confirm_password)
			newErrors.confirm_password = "Passwords do not match";
		if (!formData.is_pos_user && !formData.is_website_user)
			newErrors.system =
				"User must have access to at least one system (POS or Website).";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setGeneralError(null);
		if (!validateForm()) {
			toast.error("Please correct the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		try {
			const userData = { ...formData };
			await userService.createUser(userData);
			toast.success("User created successfully");
			navigate("/users");
		} catch (error) {
			console.error("Error creating user:", error);
			const apiErrors = error.response?.data;
			if (apiErrors && typeof apiErrors === "object") {
				const formattedErrors = Object.entries(apiErrors).reduce(
					(acc, [key, value]) => {
						const frontendKey = key === "detail" ? "_general" : key;
						acc[frontendKey] = Array.isArray(value)
							? value.join(" ")
							: String(value);
						return acc;
					},
					{}
				);
				setErrors(formattedErrors);
				if (formattedErrors._general) {
					setGeneralError(formattedErrors._general);
					toast.error(formattedErrors._general);
				} else {
					toast.error("Please fix the errors highlighted below.");
				}
			} else {
				const errorMessage =
					apiErrors?.message ||
					apiErrors?.detail ||
					"Failed to create user. Please check the details and try again.";
				setGeneralError(errorMessage);
				toast.error(errorMessage);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputBaseClass =
		"block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6";
	const inputNormalClass = `${inputBaseClass} ring-slate-300`;
	const inputErrorClass = `${inputBaseClass} ring-red-500 focus:ring-red-600 text-red-800 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`; // Customize arrow if needed
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const primaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500";

	return (
		<MainLayout pageTitle="Add New User">
			<div className="max-w-3xl mx-auto">
				{/* Page-specific header moved from MainLayout's responsibility */}
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800">
						Create a New User
					</h2>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/users")}
						disabled={isSubmitting}
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Back to Users
					</button>
				</div>

				<div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8">
					{generalError && (
						<div
							role="alert"
							className="mb-5 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm"
						>
							<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
							<span>{generalError}</span>
						</div>
					)}
					<form
						onSubmit={handleSubmit}
						className="space-y-5"
						noValidate
					>
						<section
							aria-labelledby="basic-info-heading"
							className="mb-5"
						>
							<h3
								id="basic-info-heading"
								className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100"
							>
								Basic Information
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="username"
										className={labelClass}
									>
										Username <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										id="username"
										name="username"
										value={formData.username}
										onChange={handleChange}
										className={
											errors.username ? inputErrorClass : inputNormalClass
										}
										required
									/>
									{errors.username && (
										<p className="mt-1 text-xs text-red-600">
											{errors.username}
										</p>
									)}
								</div>
								<div>
									<label
										htmlFor="email"
										className={labelClass}
									>
										Email {/* <--- MODIFIED LINE: Removed asterisk span */}
									</label>
									<input
										type="email"
										id="email"
										name="email"
										value={formData.email}
										onChange={handleChange}
										className={
											// <--- MODIFIED LINE: Removed required attribute
											errors.email ? inputErrorClass : inputNormalClass
										}
									/>
									{errors.email && (
										<p className="mt-1 text-xs text-red-600">{errors.email}</p>
									)}
								</div>
								<div>
									<label
										htmlFor="first_name"
										className={labelClass}
									>
										First Name
									</label>
									<input
										type="text"
										id="first_name"
										name="first_name"
										value={formData.first_name}
										onChange={handleChange}
										className={inputNormalClass}
									/>
								</div>
								<div>
									<label
										htmlFor="last_name"
										className={labelClass}
									>
										Last Name
									</label>
									<input
										type="text"
										id="last_name"
										name="last_name"
										value={formData.last_name}
										onChange={handleChange}
										className={inputNormalClass}
									/>
								</div>
							</div>
						</section>

						{/* ... rest of the component ... */}

						<section
							aria-labelledby="password-heading"
							className="mb-5"
						>
							<h3
								id="password-heading"
								className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100"
							>
								Password
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="password"
										className={labelClass}
									>
										Password <span className="text-red-500">*</span>
									</label>
									<input
										type="password"
										id="password"
										name="password"
										value={formData.password}
										onChange={handleChange}
										className={
											errors.password ? inputErrorClass : inputNormalClass
										}
										required
									/>
									{errors.password && (
										<p className="mt-1 text-xs text-red-600">
											{errors.password}
										</p>
									)}
								</div>
								<div>
									<label
										htmlFor="confirm_password"
										className={labelClass}
									>
										Confirm Password <span className="text-red-500">*</span>
									</label>
									<input
										type="password"
										id="confirm_password"
										name="confirm_password"
										value={formData.confirm_password}
										onChange={handleChange}
										className={
											errors.confirm_password
												? inputErrorClass
												: inputNormalClass
										}
										required
									/>
									{errors.confirm_password && (
										<p className="mt-1 text-xs text-red-600">
											{errors.confirm_password}
										</p>
									)}
								</div>
							</div>
						</section>

						<section aria-labelledby="role-access-heading">
							<h3
								id="role-access-heading"
								className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100"
							>
								Role & System Access
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="role"
										className={labelClass}
									>
										Role <span className="text-red-500">*</span>
									</label>
									<select
										id="role"
										name="role"
										value={formData.role}
										onChange={handleChange}
										className={`${selectClass} ${
											formData.is_website_user
												? "disabled:bg-slate-100 disabled:text-slate-500"
												: ""
										}`}
										required
										disabled={formData.is_website_user}
									>
										{currentUserRole === "owner" && (
											<option value="owner">Owner</option>
										)}
										{currentUserRole === "owner" && (
											<option value="admin">Admin</option>
										)}
										{!formData.is_website_user && (
											<option value="manager">Manager</option>
										)}
										{!formData.is_website_user && (
											<option value="cashier">Cashier</option>
										)}
										<option value="customer">Customer (Website Only)</option>
									</select>
								</div>
								<fieldset className="space-y-2 pt-1">
									<legend className="block text-xs font-medium text-slate-600 mb-1">
										System Access <span className="text-red-500">*</span>
									</legend>
									<div className="relative flex items-start">
										<div className="flex h-6 items-center">
											<input
												id="is_pos_user"
												name="is_pos_user"
												type="checkbox"
												checked={formData.is_pos_user}
												onChange={handleChange}
												disabled={formData.role === "customer"}
												className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
											/>
										</div>
										<div className="ml-3 text-sm leading-6">
											<label
												htmlFor="is_pos_user"
												className={`font-medium ${
													formData.role === "customer"
														? "text-slate-400"
														: "text-slate-700"
												}`}
											>
												POS User
											</label>
										</div>
									</div>
									<div className="relative flex items-start">
										<div className="flex h-6 items-center">
											<input
												id="is_website_user"
												name="is_website_user"
												type="checkbox"
												checked={formData.is_website_user}
												onChange={handleChange}
												disabled={formData.role === "customer"}
												className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
											/>
										</div>
										<div className="ml-3 text-sm leading-6">
											<label
												htmlFor="is_website_user"
												className={`font-medium ${
													formData.role === "customer"
														? "text-slate-400"
														: "text-slate-700"
												}`}
											>
												Website User{" "}
												<span className="text-xs text-slate-500">
													(Sets Role to Customer)
												</span>
											</label>
										</div>
									</div>
									{errors.system && (
										<p className="mt-1 text-xs text-red-600">{errors.system}</p>
									)}
								</fieldset>
							</div>
						</section>

						<div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
							<button
								type="button"
								onClick={() => navigate("/users")}
								className={secondaryButtonClass}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className={primaryButtonClass}
							>
								{isSubmitting ? (
									<ArrowPathIcon className="h-4 w-4 animate-spin" />
								) : (
									<PlusCircleIcon className="h-5 w-5" />
								)}
								{isSubmitting ? "Creating..." : "Create User"}
							</button>
						</div>
					</form>
				</div>
			</div>
		</MainLayout>
	);
}

// AddUser does not receive props directly via routing, so PropTypes for the component itself isn't critical
// unless you plan to reuse it elsewhere with props.
