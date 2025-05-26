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
import ComingSoonWrapper from "../utility/ComingSoonWrapper";
import Logo from "../../assests/logo.png"; // Adjusted path if necessary

const Register = () => {
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		username: "",
		email: "",
		password: "",
		confirm_password: "",
		is_rewards_opted_in: false,
	});

	const [showPassword, setShowPassword] = useState(false);
	const [errors, setErrors] = useState({});
	const [formError, setFormError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState(0);
	const [agreeToTerms, setAgreeToTerms] = useState(false);

	const navigate = useNavigate();

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

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));

		if (errors[name]) {
			setErrors((prev) => ({ ...prev, [name]: "" }));
		}
		if (formError) {
			setFormError("");
		}
	};

	useEffect(() => {
		if (formData.password) {
			const passedTests = passwordRequirements.filter((req) =>
				req.test(formData.password)
			).length;
			setPasswordStrength((passedTests / passwordRequirements.length) * 100);
		} else {
			setPasswordStrength(0);
		}
	}, [formData.password, passwordRequirements]); // Added passwordRequirements to dependency array

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
	};

	const validateForm = () => {
		const newErrors = {};
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
		if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}
		if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
			newErrors.username =
				"Username can only contain letters, numbers, and underscores";
		}
		if (formData.password && passwordStrength < 60) {
			// Consider adjusting strength threshold
			newErrors.password =
				"Password is too weak. Please meet all requirements.";
		}
		if (formData.password !== formData.confirm_password) {
			newErrors.confirm_password = "Passwords do not match";
		}
		if (!agreeToTerms) {
			newErrors.terms = "You must agree to the terms and conditions";
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}
		setIsLoading(true);
		setFormError("");
		try {
			const { confirm_password, ...apiData } = formData;
			// eslint-disable-next-line no-unused-vars
			const response = await axiosInstance.post("website/register/", apiData);
			alert("Account created successfully! Please log in.");
			navigate("/login");
		} catch (err) {
			console.error("Registration error:", err);
			if (err.response?.data) {
				const apiErrors = err.response.data;
				const newErrors = {};
				for (const [key, value] of Object.entries(apiErrors)) {
					newErrors[key] = Array.isArray(value) ? value.join(" ") : value;
				}
				if (Object.keys(newErrors).length > 0) {
					setErrors(newErrors);
				} else {
					setFormError("Registration failed. Please try again.");
				}
			} else if (err.request) {
				setFormError(
					"Network error. Please check your connection and try again."
				);
			} else {
				setFormError("An unexpected error occurred. Please try again later.");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const getStrengthColor = () => {
		if (passwordStrength < 30) return "bg-red-500"; // Standard red for weak
		if (passwordStrength < 60) return "bg-yellow-500"; // Standard yellow for medium
		return "bg-primary-green"; // Primary green for strong
	};

	return (
		// Main background: Gradient from primary-beige to accent-light-beige
		<div className="min-h-screen bg-gradient-to-br from-primary-beige via-accent-light-beige to-primary-beige flex flex-col justify-center py-12">
			{/* Logo and Back Button */}
			<div className="absolute top-0 left-0 p-6 flex items-center">
				<button
					onClick={() => navigate("/")}
					// Text color: Dark green for visibility on light beige background
					className="mr-4 text-accent-dark-green hover:text-primary-green transition-colors"
					aria-label="Back to home"
				>
					<FaArrowLeft size={20} />
				</button>
				<Link to="/">
					<img
						src={Logo}
						alt="Ajeen Logo"
						className="h-10 w-auto"
					/>
				</Link>
			</div>

			{/* Registration Form Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-2xl w-full mx-auto px-6" // max-w-2xl for wider form
			>
				{/* Card background: Light beige, with subtle border and shadow */}
				<div className="bg-accent-light-beige rounded-xl shadow-xl overflow-hidden border border-accent-subtle-gray/50">
					<div className="p-8">
						{/* Heading: Dark Green */}
						<h2 className="text-2xl font-bold text-accent-dark-green mb-6 text-center">
							Create Your Account
						</h2>

						{formError && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								// Error message: Standard red for error, light red background
								className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm"
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
									{/* Label: Dark Green */}
									<label
										htmlFor="first_name"
										className="block text-sm font-medium text-accent-dark-green mb-1"
									>
										First Name
									</label>
									<input
										id="first_name"
										name="first_name"
										type="text"
										value={formData.first_name}
										onChange={handleChange}
										// Input: White bg, Dark Brown text, Subtle Gray border, Primary Green focus
										className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.first_name
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Enter your first name"
									/>
									{errors.first_name && (
										<p className="mt-1 text-xs text-red-600">
											{" "}
											{/* Smaller error text */}
											{errors.first_name}
										</p>
									)}
								</div>

								<div>
									<label
										htmlFor="last_name"
										className="block text-sm font-medium text-accent-dark-green mb-1"
									>
										Last Name
									</label>
									<input
										id="last_name"
										name="last_name"
										type="text"
										value={formData.last_name}
										onChange={handleChange}
										className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.last_name
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Enter your last name"
									/>
									{errors.last_name && (
										<p className="mt-1 text-xs text-red-600">
											{errors.last_name}
										</p>
									)}
								</div>
							</div>

							{/* Username Field */}
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-accent-dark-green mb-1"
								>
									Username
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										{/* Icon: Subtle Gray */}
										<FaUser className="text-accent-subtle-gray" />
									</div>
									<input
										id="username"
										name="username"
										type="text"
										value={formData.username}
										onChange={handleChange}
										className={`w-full pl-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.username
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Choose a username"
									/>
								</div>
								{errors.username && (
									<p className="mt-1 text-xs text-red-600">{errors.username}</p>
								)}
							</div>

							{/* Email Field */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-accent-dark-green mb-1"
								>
									Email Address
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaEnvelope className="text-accent-subtle-gray" />
									</div>
									<input
										id="email"
										name="email"
										type="email"
										value={formData.email}
										onChange={handleChange}
										className={`w-full pl-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.email
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Enter your email address"
									/>
								</div>
								{errors.email && (
									<p className="mt-1 text-xs text-red-600">{errors.email}</p>
								)}
							</div>

							{/* Password Field */}
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-accent-dark-green mb-1"
								>
									Password
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaLock className="text-accent-subtle-gray" />
									</div>
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={formData.password}
										onChange={handleChange}
										className={`w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.password
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Create a password"
									/>
									<button
										type="button"
										onClick={togglePasswordVisibility}
										// Eye icon: Subtle Gray, hover to Dark Green
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-accent-subtle-gray hover:text-accent-dark-green"
									>
										{showPassword ? (
											<FaEyeSlash size={16} />
										) : (
											<FaEye size={16} />
										)}
									</button>
								</div>
								{errors.password && (
									<p className="mt-1 text-xs text-red-600">{errors.password}</p>
								)}

								{/* Password strength meter */}
								{formData.password && (
									<div className="mt-2">
										<div className="w-full bg-accent-subtle-gray/50 rounded-full h-2">
											<div
												className={`h-2 rounded-full ${getStrengthColor()} transition-all duration-300`}
												style={{ width: `${passwordStrength}%` }}
											></div>
										</div>
										<div className="mt-2 space-y-1">
											{passwordRequirements.map((req) => (
												<div
													key={req.id}
													className="flex items-center text-xs" // Smaller text for requirements
												>
													{req.test(formData.password) ? (
														<FaCheck
															className="text-primary-green mr-2 flex-shrink-0" // Primary green for check
															size={12}
														/>
													) : (
														<FaTimes
															className="text-red-500 mr-2 flex-shrink-0" // Standard red for X
															size={12}
														/>
													)}
													<span
														className={
															req.test(formData.password)
																? "text-accent-dark-green" // Dark green for met requirement
																: "text-accent-dark-brown" // Dark brown for unmet
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
									className="block text-sm font-medium text-accent-dark-green mb-1"
								>
									Confirm Password
								</label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<FaLock className="text-accent-subtle-gray" />
									</div>
									<input
										id="confirm_password"
										name="confirm_password"
										type={showPassword ? "text" : "password"}
										value={formData.confirm_password}
										onChange={handleChange}
										className={`w-full pl-10 py-2 border rounded-md focus:outline-none focus:ring-2 bg-white text-accent-dark-brown placeholder-accent-subtle-gray ${
											errors.confirm_password
												? "border-red-300 focus:ring-red-500 focus:border-red-500"
												: "border-accent-subtle-gray focus:ring-primary-green focus:border-primary-green"
										}`}
										placeholder="Confirm your password"
									/>
								</div>
								{errors.confirm_password && (
									<p className="mt-1 text-xs text-red-600">
										{errors.confirm_password}
									</p>
								)}
							</div>

							{/* Rewards Program Opt-In */}
							{/* The ComingSoonWrapper should ideally be styled to fit the theme if it adds its own background */}
							<ComingSoonWrapper active={true}>
								<div className="flex items-start mt-4 p-4 bg-primary-beige/50 rounded-lg border border-primary-green/30">
									<div className="flex items-center h-5">
										<input
											id="is_rewards_opted_in"
											name="is_rewards_opted_in"
											type="checkbox"
											checked={formData.is_rewards_opted_in}
											onChange={handleChange}
											// Checkbox: Primary Green
											className="h-4 w-4 text-primary-green focus:ring-primary-green border-accent-subtle-gray rounded"
										/>
									</div>
									<div className="ml-3 text-sm">
										<label
											htmlFor="is_rewards_opted_in"
											// Label text: Dark Green
											className="text-accent-dark-green font-medium flex items-center"
										>
											<FaGift className="text-primary-green mr-2" /> Join our
											Rewards Program
										</label>
										{/* Description text: Dark Brown */}
										<p className="text-accent-dark-brown text-xs mt-1">
											Earn points on every purchase and receive exclusive
											offers!
										</p>
									</div>
								</div>
							</ComingSoonWrapper>

							{/* Terms and Conditions */}
							<div className="flex items-start">
								<div className="flex items-center h-5">
									<input
										id="terms"
										type="checkbox"
										checked={agreeToTerms}
										onChange={() => setAgreeToTerms(!agreeToTerms)}
										// Checkbox: Primary Green
										className="h-4 w-4 text-primary-green focus:ring-primary-green border-accent-subtle-gray rounded"
									/>
								</div>
								<div className="ml-3 text-sm">
									{/* Text: Dark Brown, Links: Primary Green */}
									<label
										htmlFor="terms"
										className="text-accent-dark-brown"
									>
										I agree to the{" "}
										<a
											href="#" // Replace with actual link
											className="font-medium text-primary-green hover:text-accent-dark-green"
										>
											Terms of Service
										</a>{" "}
										and{" "}
										<a
											href="#" // Replace with actual link
											className="font-medium text-primary-green hover:text-accent-dark-green"
										>
											Privacy Policy
										</a>
									</label>
									{errors.terms && (
										<p className="mt-1 text-xs text-red-600">{errors.terms}</p>
									)}
								</div>
							</div>

							{/* Submit Button: Primary Green background, Light Beige text */}
							<button
								type="submit"
								disabled={isLoading}
								className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-accent-light-beige bg-primary-green hover:bg-accent-dark-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-green ${
									isLoading ? "opacity-70 cursor-not-allowed" : ""
								}`}
							>
								{isLoading ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-light-beige"
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
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
					{/* Bottom panel: Primary Beige background, Subtle Gray border */}
					<div className="px-8 py-6 bg-primary-beige border-t border-accent-subtle-gray/30">
						{/* Text: Dark Brown, Link: Primary Green */}
						<p className="text-center text-sm text-accent-dark-brown">
							Already have an account?{" "}
							<Link
								to="/login"
								className="font-medium text-primary-green hover:text-accent-dark-green"
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
