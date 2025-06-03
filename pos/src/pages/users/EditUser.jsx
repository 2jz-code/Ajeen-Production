// src/pages/users/EditUser.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import PropTypes from "prop-types"; // Import PropTypes
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	CheckIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	// UserCircleIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

export default function EditUser() {
	const navigate = useNavigate();
	const { userId } = useParams();
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState({});
	const [formData, setFormData] = useState(null);
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [currentUserId, setCurrentUserId] = useState(null);
	const [targetUserRole, setTargetUserRole] = useState("");
	const [generalError, setGeneralError] = useState(null);

	const fetchInitialData = useCallback(async () => {
		setIsLoading(true);
		setGeneralError(null);
		setErrors({});
		setFormData(null);
		try {
			const [userDataResponse, currentUserData] = await Promise.all([
				userService.getUserById(userId),
				userService.getCurrentUser(),
			]);
			if (
				userDataResponse &&
				typeof userDataResponse === "object" &&
				currentUserData
			) {
				setFormData({
					...userDataResponse,
					password: "", // Initialize password fields for edit form
					confirm_password: "",
				});
				setTargetUserRole(userDataResponse.role);
				setCurrentUserRole(currentUserData.role);
				setCurrentUserId(currentUserData.id);
			} else {
				throw new Error("User data could not be loaded or is invalid.");
			}
		} catch (error) {
			console.error("Error fetching initial data:", error);
			const message =
				error.message ||
				"Failed to load user data. Please try again or go back.";
			setGeneralError(message);
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		fetchInitialData();
	}, [fetchInitialData]);

	const handleChange = (e) => {
		if (!formData) return;
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
			if (name === "is_website_user" && checked)
				updatedFormData.role = "customer";
			else if (
				name === "is_website_user" &&
				!checked &&
				formData.role === "customer"
			)
				updatedFormData.role = "cashier"; // Default back to cashier if website unchecked
		} else if (name === "role") {
			// Role change permission checks
			if (value === "owner" && currentUserRole !== "owner") {
				toast.warning("Only owners can assign the owner role.");
				return;
			}
			const editingSelf = parseInt(userId) === currentUserId;
			if (
				currentUserRole === "admin" &&
				!editingSelf &&
				(targetUserRole === "admin" || targetUserRole === "owner")
			) {
				toast.warning(
					"Admins cannot change the role of owners or other admins."
				);
				return;
			}
			if (value === "admin" && currentUserRole === "admin" && !editingSelf) {
				toast.warning("Admins cannot promote other users to admin.");
				return;
			}
			// Logic for customer role
			if (value === "customer") {
				updatedFormData.is_website_user = true;
				updatedFormData.is_pos_user = false;
			} else if (formData.role === "customer" && formData.is_pos_user) {
				// If changing from customer with POS access (which shouldn't happen based on UI logic but as a safeguard)
				updatedFormData.is_website_user = false; // Or true, depending on desired behavior
			}
			updatedFormData = { ...updatedFormData, [name]: value };
		} else {
			updatedFormData = { ...updatedFormData, [name]: value };
		}
		setFormData(updatedFormData);
		// Clear specific errors on change
		if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
		if (name === "password" && errors.confirm_password)
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		if (name === "confirm_password" && errors.confirm_password)
			setErrors((prev) => ({ ...prev, confirm_password: null }));
		setGeneralError(null); // Clear general error on any change
	};

	const validateForm = () => {
		if (!formData) return false;
		const newErrors = {};
		if (!formData.username?.trim()) newErrors.username = "Username is required";
		else if (formData.username.length < 3)
			newErrors.username = "Username must be at least 3 characters";
		// Email is optional, but if provided, it must be valid
		if (formData.email?.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
			// <--- MODIFIED LINE
			newErrors.email = "Email is invalid"; // <--- MODIFIED LINE
		}
		// Password validation only if password is being changed
		if (formData.password) {
			if (formData.password.length < 8)
				newErrors.password = "Password must be at least 8 characters";
			if (formData.password !== formData.confirm_password)
				newErrors.confirm_password = "Passwords do not match";
		} else if (formData.confirm_password && !formData.password) {
			// If confirm_password is filled but password is not
			newErrors.password = "Please enter the new password as well.";
		}
		if (!formData.is_pos_user && !formData.is_website_user)
			newErrors.system =
				"User must have access to at least one system (POS or Website).";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!formData) return;
		setGeneralError(null);
		if (!validateForm()) {
			toast.error("Please correct the errors in the form.");
			return;
		}
		setIsSubmitting(true);
		try {
			// Prepare userData for API, remove password if not being changed
			const userData = { ...formData };
			if (!userData.password) {
				delete userData.password;
				delete userData.confirm_password; // Also remove confirm_password if password is blank
			} else {
				// Password is being changed, ensure confirm_password is not sent if it matches
				// The backend serializer might handle confirm_password, but good to clean up here
				delete userData.confirm_password;
			}

			await userService.updateUser(userId, userData);
			toast.success("User updated successfully");
			navigate("/users");
		} catch (error) {
			console.error("Error updating user:", error);
			const apiErrors = error.response?.data;
			if (apiErrors && typeof apiErrors === "object") {
				const formattedErrors = Object.entries(apiErrors).reduce(
					(acc, [key, value]) => {
						const frontendKey = key === "detail" ? "_general" : key; // Handle general backend errors
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
					apiErrors?.message || // General message from error object
					apiErrors?.detail || // Django REST framework detail error
					"Failed to update user. Please check the details and try again.";
				setGeneralError(errorMessage);
				toast.error(errorMessage);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputBaseClass =
		"block w-full rounded-md border-0 px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:ring-slate-200";
	const inputNormalClass = `${inputBaseClass} ring-slate-300`;
	const inputErrorClass = `${inputBaseClass} ring-red-500 focus:ring-red-600 text-red-800 placeholder-red-300`;
	const selectClass = `${inputNormalClass} appearance-none bg-white bg-no-repeat bg-right-3`; // Customize arrow if needed
	const labelClass = "block text-xs font-medium text-slate-600 mb-1";
	const primaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500";
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500";

	// Determine if role and system access fields should be disabled
	const isRoleSystemDisabled =
		(currentUserRole === "admin" && targetUserRole === "owner") || // Admin cannot edit owner's role
		(currentUserRole === "admin" &&
			targetUserRole === "admin" && // Admin cannot edit another admin's role (unless it's themselves)
			parseInt(userId) !== currentUserId);

	if (isLoading) {
		return (
			<MainLayout pageTitle="Loading User...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	if (generalError && !formData) {
		return (
			<MainLayout pageTitle="Error">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
					<h1 className="mb-2 text-xl font-semibold text-slate-800">
						Error Loading User
					</h1>
					<p className="mb-6 text-slate-600">{generalError}</p>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/users")}
					>
						<ArrowLeftIcon className="h-4 w-4 mr-1.5" /> Back to Users List
					</button>
				</div>
			</MainLayout>
		);
	}

	if (!formData) {
		// This should ideally not be reached if error handling above is comprehensive
		return (
			<MainLayout pageTitle="Error">
				<div className="text-center p-8">User data not available.</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={`Edit User: ${formData.username || "..."}`}>
			<div className="max-w-3xl mx-auto">
				{/* Page-specific header */}
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800">
						User Information {/* Or "Edit User Details" */}
					</h2>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/users")}
						disabled={isSubmitting}
					>
						<ArrowLeftIcon className="h-4 w-4" /> Cancel Edit
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
										required
										value={formData.username}
										onChange={handleChange}
										className={
											errors.username ? inputErrorClass : inputNormalClass
										}
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
										value={formData.email || ""} // Ensure it handles null email from backend
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
										value={formData.first_name || ""}
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
										value={formData.last_name || ""}
										onChange={handleChange}
										className={inputNormalClass}
									/>
								</div>
							</div>
						</section>

						<section
							aria-labelledby="password-heading"
							className="mb-5"
						>
							<h3
								id="password-heading"
								className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100"
							>
								Change Password (Optional)
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="password"
										className={labelClass}
									>
										New Password
									</label>
									<input
										type="password"
										id="password"
										name="password"
										value={formData.password}
										onChange={handleChange}
										placeholder="Leave blank to keep current"
										className={
											errors.password ? inputErrorClass : inputNormalClass
										}
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
										Confirm New Password
									</label>
									<input
										type="password"
										id="confirm_password"
										name="confirm_password"
										value={formData.confirm_password}
										onChange={handleChange}
										placeholder="Confirm new password"
										className={
											errors.confirm_password
												? inputErrorClass
												: inputNormalClass
										}
									/>
									{errors.confirm_password && (
										<p className="mt-1 text-xs text-red-600">
											{errors.confirm_password}
										</p>
									)}
								</div>
							</div>
							<p className="mt-2 text-xs text-slate-500">
								Leave both fields blank to keep the current password.
							</p>
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
										required
										value={formData.role}
										onChange={handleChange}
										disabled={isRoleSystemDisabled || formData.is_website_user} // Disable if website user or due to role hierarchy
										className={`${selectClass} ${
											isRoleSystemDisabled || formData.is_website_user
												? "disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
												: ""
										}`}
									>
										{/* Role options based on current user's role and target user's role */}
										{currentUserRole === "owner" && (
											<option value="owner">Owner</option>
										)}
										{(currentUserRole === "owner" ||
											(currentUserRole === "admin" && // Admin can edit their own role
												parseInt(userId) === currentUserId)) && (
											<option value="admin">Admin</option>
										)}
										{/* Allow demotion from admin/owner by owner, or by admin for self */}
										<option value="manager">Manager</option>
										<option value="cashier">Cashier</option>
										<option value="customer">Customer (Website Only)</option>
									</select>
									{isRoleSystemDisabled && (
										<p className="mt-1 text-xs text-amber-600">
											Role cannot be changed for this user by your account.
										</p>
									)}
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
												disabled={
													isRoleSystemDisabled || formData.role === "customer"
												} // Disable if customer or role system disabled
												className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
											/>
										</div>
										<div className="ml-3 text-sm leading-6">
											<label
												htmlFor="is_pos_user"
												className={`font-medium ${
													isRoleSystemDisabled || formData.role === "customer"
														? "text-slate-400" // Muted text if disabled
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
												disabled={
													isRoleSystemDisabled || formData.role === "customer"
												} // Disable if customer or role system disabled
												className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
											/>
										</div>
										<div className="ml-3 text-sm leading-6">
											<label
												htmlFor="is_website_user"
												className={`font-medium ${
													isRoleSystemDisabled || formData.role === "customer"
														? "text-slate-400" // Muted text if disabled
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
								disabled={isSubmitting} // Disable cancel if submitting
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || isLoading} // Disable if submitting or initial load
								className={primaryButtonClass}
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
		</MainLayout>
	);
}

// No direct props for EditUser, so PropTypes for the component itself is optional.
