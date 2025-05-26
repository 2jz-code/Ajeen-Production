import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import Logo from "../../assests/logo.png"; // Adjusted path if necessary

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const { login, isAuthenticated } = useAuth();

	useEffect(() => {
		if (isAuthenticated) {
			const from = location.state?.from || "/";
			navigate(from);
		}
	}, [isAuthenticated, navigate, location.state]);

	const from = location.state?.from || "/";

	useEffect(() => {
		if (error) setError("");
	}, [username, password]);

	const handleLogin = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			if (!username.trim() || !password.trim()) {
				setError("Please enter both username and password");
				setIsLoading(false);
				return;
			}

			const result = await login({
				username,
				password,
				remember_me: rememberMe,
			});

			if (result.success) {
				navigate(from);
			} else {
				setError(result.error);
			}
		} catch (err) {
			console.error("Login error:", err);
			setError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword);
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
				<Link
					to="/"
					// Wrapping logo in a div with beige background for contrast if needed
				>
					<img
						src={Logo}
						alt="Ajeen Logo"
						className="h-10 w-auto"
					/>
				</Link>
			</div>

			{/* Login Form Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-md w-full mx-auto px-6"
			>
				{/* Card background: Light beige, with subtle border and shadow */}
				<div className="bg-accent-light-beige rounded-xl shadow-xl overflow-hidden border border-accent-subtle-gray/50">
					<div className="p-8">
						{/* Heading: Dark Green */}
						<h2 className="text-2xl font-bold text-accent-dark-green mb-6 text-center">
							Welcome Back
						</h2>

						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								// Error message: Standard red for error, light red background
								className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm"
							>
								{error}
							</motion.div>
						)}

						<form
							onSubmit={handleLogin}
							className="space-y-6"
						>
							{/* Username Field */}
							<div>
								{/* Label: Dark Green */}
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
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										// Input: White bg, Dark Brown text, Subtle Gray border, Primary Green focus
										className="w-full pl-10 pr-3 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
										placeholder="Enter your username"
										required
									/>
								</div>
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
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full pl-10 pr-10 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
										placeholder="Enter your password"
										required
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
							</div>

							{/* Remember Me & Forgot Password */}
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<input
										id="remember-me"
										type="checkbox"
										checked={rememberMe}
										onChange={() => setRememberMe(!rememberMe)}
										// Checkbox: Primary Green
										className="h-4 w-4 text-primary-green focus:ring-primary-green border-accent-subtle-gray rounded"
									/>
									{/* Text: Dark Brown */}
									<label
										htmlFor="remember-me"
										className="ml-2 block text-sm text-accent-dark-brown"
									>
										Remember me
									</label>
								</div>

								<div className="text-sm">
									{/* Link: Primary Green */}
									<Link
										to="/forgot-password" // Assuming this route exists or will be created
										className="text-primary-green hover:text-accent-dark-green"
									>
										Forgot password?
									</Link>
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
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</button>
						</form>
					</div>

					{/* Register Link */}
					{/* Bottom panel: Primary Beige background, Subtle Gray border */}
					<div className="px-8 py-6 bg-primary-beige border-t border-accent-subtle-gray/30">
						{/* Text: Dark Brown, Link: Primary Green */}
						<p className="text-center text-sm text-accent-dark-brown">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="font-medium text-primary-green hover:text-accent-dark-green"
							>
								Create an account
							</Link>
						</p>
					</div>
				</div>

				{/* Security Notice: Dark Brown */}
				<p className="mt-6 text-center text-xs text-accent-dark-brown">
					Secure login with industry-standard encryption
				</p>
			</motion.div>
		</div>
	);
};

export default Login;
