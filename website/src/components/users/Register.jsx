import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
	FaUser,
	FaEnvelope,
	FaLock,
	FaEye,
	FaEyeSlash,
	FaArrowLeft,
	FaCheck,
	FaTimes,
	FaGift,
} from "react-icons/fa";
import axiosInstance from "../../api/api";

const Register = () => {
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		username: "",
		email: "",
		password: "",
		confirm_password: "",
		is_rewards_opted_in: false, // Added rewards opt-in
	});

	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [formError, setFormError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState(0);
	const [agreeToTerms, setAgreeToTerms] = useState(false);

	const navigate = useNavigate();

	// Password strength requirements
	const passwordRequirements = [
		{
			id: "length",
			label: "At least 8 characters",
			test: (password) => password.length >= 8,
		},
		{
			id: "uppercase",
			label: "At least one uppercase letter",
			test: (password) => /[A-Z]/.test(password),
		},
		{
			id: "lowercase",
			label: "At least one lowercase letter",
			test: (password) => /[a-z]/.test(password),
		},
		{
			id: "number",
			label: "At least one number",
			test: (password) => /[0-9]/.test(password),
		},
		{
			id: "special",
			label: "At least one special character",
			test: (password) => /[^A-Za-z0-9]/.test(password),
		},
	];

	// Handle form input changes
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));

		// Clear specific field error when typing
		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}

		// Clear form error when any field changes
		if (formError) {
			setFormError("");
		}
	};

	// Calculate password strength when password changes
	useEffect(() => {
		if (formData.password) {
			const passedTests = passwordRequirements.filter((req) =>
				req.test(formData.password)
			).length;
			setPasswordStrength((passedTests / passwordRequirements.length) * 100);
		} else {
			setPasswordStrength(0);
		}
	}, [formData.password]);

	// Toggle password visibility
	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	// Validate form before submission
	const validateForm = () => {
		const newErrors = {};

		// Check required fields
		for (const field of [
			"first_name",
			"last_name",
			"username",
			"email",
			"password",
		]) {
			if (!formData[field].trim()) {
				newErrors[field] = `${field.replace("_", " ")} is required`;
			}
		}

		// Validate email format
		if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		// Validate username (alphanumeric and underscore only)
		if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
			newErrors.username =
				"Username can only contain letters, numbers, and underscores";
		}

		// Check password strength
		if (formData.password && passwordStrength < 60) {
			newErrors.password = "Password is too weak";
		}

		// Check if passwords match
		if (formData.password !== formData.confirm_password) {
			newErrors.confirm_password = "Passwords do not match";
		}

		// Check terms agreement
		if (!agreeToTerms) {
			newErrors.terms = "You must agree to the terms and conditions";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		// Validate form
		if (!validateForm()) {
			return;
		}

		setIsLoading(true);
		setFormError("");

		try {
			// Prepare data for API call (exclude confirm_password)
			const { confirm_password, ...apiData } = formData;

			const response = await axiosInstance.post("website/register/", apiData);
			console.log("Registration successful:", response.data);

			// Show success message and redirect to login
			alert("Account created successfully! Please log in.");
			navigate("/login");
		} catch (err) {
			console.error("Registration error:", err);

			if (err.response?.data) {
				// Handle validation errors from the API
				const apiErrors = err.response.data;

				// Map API errors to form fields
				const newErrors = {};
				for (const [key, value] of Object.entries(apiErrors)) {
					// If the error is an array, join the messages
					newErrors[key] = Array.isArray(value) ? value.join(" ") : value;
				}

				if (Object.keys(newErrors).length > 0) {
					setErrors(newErrors);
				} else {
					// If no specific field errors, set a general form error
					setFormError("Registration failed. Please try again.");
				}
			} else if (err.request) {
				// Request was made but no response received
				setFormError(
					"Network error. Please check your connection and try again."
				);
			} else {
				// Something else caused the error
				setFormError("An unexpected error occurred. Please try again later.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	// Get strength color based on password strength percentage
	const getStrengthColor = () => {
		if (passwordStrength < 30) return "bg-red-500";
		if (passwordStrength < 60) return "bg-yellow-500";
		return "bg-green-500";
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col justify-center py-12">
			{/* Logo and Back Button */}
			<div className="absolute top-0 left-0 p-6 flex items-center">
				<button
					onClick={() => navigate("/")}
					className="mr-4 text-green-800 hover:text-green-600 transition-colors"
					aria-label="Back to home"
				>
					<FaArrowLeft size={20} />
				</button>
				<Link
					to="/"
					className="text-3xl font-serif italic font-bold text-green-800"
				>
					Ajeen
				</Link>
			</div>

			{/* Registration Form Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-2xl w-full mx-auto px-6"
			>
				<div className="bg-white rounded-xl shadow-xl overflow-hidden">
					<div className="p-8">
						<h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
							Create Your Account
						</h2>

						{formError && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
							>
								{formError}
							</motion.div>
						)}

						<form
							onSubmit={handleSubmit}
							className="space-y-6"
						>
							{/* Name Fields */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label
										htmlFor="first_name"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										First Name
									</label>
									<input
										id="first_name"
										name="first_name"
										type="text"
										value={formData.first_name}
										onChange={handleChange}
										className={`w-full px-3 py-2 border ${
											errors.first_name
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Enter your first name"
									/>
									{errors.first_name && (
										<p className="mt-1 text-sm text-red-600">
											{errors.first_name}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="last_name"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Last Name
									</label>
									<input
										id="last_name"
										name="last_name"
										type="text"
										value={formData.last_name}
										onChange={handleChange}
										className={`w-full px-3 py-2 border ${
											errors.last_name
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Enter your last name"
									/>
									{errors.last_name && (
										<p className="mt-1 text-sm text-red-600">
											{errors.last_name}
										</p>
									)}
								</div>
							</div>

							{/* Username Field */}
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Username
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaUser className="text-gray-400" />
									</div>
									<input
										id="username"
										name="username"
										type="text"
										value={formData.username}
										onChange={handleChange}
										className={`w-full pl-10 px-3 py-2 border ${
											errors.username
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Choose a username"
									/>
								</div>
								{errors.username && (
									<p className="mt-1 text-sm text-red-600">{errors.username}</p>
								)}
							</div>

							{/* Email Field */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Email Address
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaEnvelope className="text-gray-400" />
									</div>
									<input
										id="email"
										name="email"
										type="email"
										value={formData.email}
										onChange={handleChange}
										className={`w-full pl-10 px-3 py-2 border ${
											errors.email
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Enter your email address"
									/>
								</div>
								{errors.email && (
									<p className="mt-1 text-sm text-red-600">{errors.email}</p>
								)}
							</div>

							{/* Password Field */}
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Password
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaLock className="text-gray-400" />
									</div>
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={formData.password}
										onChange={handleChange}
										className={`w-full pl-10 pr-10 py-2 border ${
											errors.password
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Create a password"
									/>
									<button
										type="button"
										onClick={togglePasswordVisibility}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
									>
										{showPassword ? (
											<FaEyeSlash size={16} />
										) : (
											<FaEye size={16} />
										)}
									</button>
								</div>
								{errors.password && (
									<p className="mt-1 text-sm text-red-600">{errors.password}</p>
								)}

								{/* Password strength meter */}
								{formData.password && (
									<div className="mt-2">
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full ${getStrengthColor()}`}
												style={{ width: `${passwordStrength}%` }}
											></div>
										</div>
										<div className="mt-2 space-y-1">
											{passwordRequirements.map((req) => (
												<div
													key={req.id}
													className="flex items-center text-sm"
												>
													{req.test(formData.password) ? (
														<FaCheck
															className="text-green-500 mr-2"
															size={12}
														/>
													) : (
														<FaTimes
															className="text-red-500 mr-2"
															size={12}
														/>
													)}
													<span
														className={
															req.test(formData.password)
																? "text-green-700"
																: "text-gray-600"
														}
													>
														{req.label}
													</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Confirm Password Field */}
							<div>
								<label
									htmlFor="confirm_password"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Confirm Password
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaLock className="text-gray-400" />
									</div>
									<input
										id="confirm_password"
										name="confirm_password"
										type={showPassword ? "text" : "password"}
										value={formData.confirm_password}
										onChange={handleChange}
										className={`w-full pl-10 py-2 border ${
											errors.confirm_password
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-gray-300 focus:ring-green-500 focus:border-green-500"
										} rounded-md focus:outline-none focus:ring-2`}
										placeholder="Confirm your password"
									/>
								</div>
								{errors.confirm_password && (
									<p className="mt-1 text-sm text-red-600">
										{errors.confirm_password}
									</p>
								)}
							</div>

							{/* Terms and Conditions */}
							<div className="flex items-start">
								<div className="flex items-center h-5">
									<input
										id="terms"
										type="checkbox"
										checked={agreeToTerms}
										onChange={() => setAgreeToTerms(!agreeToTerms)}
										className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
									/>
								</div>
								<div className="ml-3 text-sm">
									<label
										htmlFor="terms"
										className="text-gray-600"
									>
										I agree to the{" "}
										<a
											href="#"
											className="text-green-600 hover:text-green-500"
										>
											Terms of Service
										</a>{" "}
										and{" "}
										<a
											href="#"
											className="text-green-600 hover:text-green-500"
										>
											Privacy Policy
										</a>
									</label>
									{errors.terms && (
										<p className="mt-1 text-sm text-red-600">{errors.terms}</p>
									)}
								</div>
							</div>

							{/* Rewards Program Opt-In */}
							<div className="flex items-start mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
								<div className="flex items-center h-5">
									<input
										id="rewards-opt-in"
										type="checkbox"
										checked={formData.is_rewards_opted_in}
										onChange={(e) =>
											setFormData({
												...formData,
												is_rewards_opted_in: e.target.checked,
											})
										}
										className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
									/>
								</div>
								<div className="ml-3">
									<label
										htmlFor="rewards-opt-in"
										className="text-gray-700 font-medium flex items-center"
									>
										<FaGift className="text-green-500 mr-2" /> Join our Rewards
										Program
									</label>
									<p className="text-sm text-gray-600 mt-1">
										Earn points on every purchase and receive exclusive offers
										and discounts
									</p>
								</div>
							</div>

							{/* Submit Button */}
							<button
								type="submit"
								disabled={isLoading}
								className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
									isLoading ? "opacity-70 cursor-not-allowed" : ""
								}`}
							>
								{isLoading ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0  12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Creating Account...
									</>
								) : (
									"Create Account"
								)}
							</button>
						</form>
					</div>

					{/* Login Link */}
					<div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
						<p className="text-center text-sm text-gray-600">
							Already have an account?{" "}
							<Link
								to="/login"
								className="font-medium text-green-600 hover:text-green-500"
							>
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default Register;
