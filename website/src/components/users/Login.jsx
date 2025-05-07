import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

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

	// Redirect if already authenticated
	useEffect(() => {
		if (isAuthenticated) {
			const from = location.state?.from || "/";
			navigate(from);
		}
	}, [isAuthenticated, navigate, location.state]);

	// Get redirect path from location state
	const from = location.state?.from || "/";

	// Clear any error when form values change
	useEffect(() => {
		if (error) setError("");
	}, [username, password]);

	const handleLogin = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			// Validate input
			if (!username.trim() || !password.trim()) {
				setError("Please enter both username and password");
				setIsLoading(false);
				return;
			}

			// Use the login function from context
			const result = await login({
				username,
				password,
				remember_me: rememberMe,
			});

			if (result.success) {
				// Redirect to the previous page or home
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
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col justify-center">
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

			{/* Login Form Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="max-w-md w-full mx-auto px-6"
			>
				<div className="bg-white rounded-xl shadow-xl overflow-hidden">
					<div className="p-8">
						<h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
							Welcome Back
						</h2>

						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
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
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
										placeholder="Enter your username"
										required
									/>
								</div>
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
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
										placeholder="Enter your password"
										required
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
							</div>

							{/* Remember Me & Forgot Password */}
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<input
										id="remember-me"
										type="checkbox"
										checked={rememberMe}
										onChange={() => setRememberMe(!rememberMe)}
										className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
									/>
									<label
										htmlFor="remember-me"
										className="ml-2 block text-sm text-gray-700"
									>
										Remember me
									</label>
								</div>

								<div className="text-sm">
									<Link
										to="/forgot-password"
										className="text-green-600 hover:text-green-500"
									>
										Forgot password?
									</Link>
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
					<div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
						<p className="text-center text-sm text-gray-600">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="font-medium text-green-600 hover:text-green-500"
							>
								Create an account
							</Link>
						</p>
					</div>
				</div>

				{/* Security Notice */}
				<p className="mt-6 text-center text-xs text-gray-600">
					Secure login with industry-standard encryption
				</p>
			</motion.div>
		</div>
	);
};

export default Login;
