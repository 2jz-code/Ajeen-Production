import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	AiOutlineClose,
	AiOutlineMenu,
	AiOutlineUser,
	AiOutlineShoppingCart,
} from "react-icons/ai";
import ProfileImage from "./users/ProfileImage";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../api/api";
import Logo from "../assests/logo.png"; // Your logo import

const Navbar = () => {
	const [nav, setNav] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [cartItemCount, setCartItemCount] = useState(0);
	const navigate = useNavigate();
	const { isAuthenticated, logout, user } = useAuth();

	// Handle scroll effects for navbar appearance
	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 50) {
				setScrolled(true);
			} else {
				setScrolled(false);
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Fetch cart count when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			fetchCartCount();
		} else {
			setCartItemCount(0);
		}
	}, [isAuthenticated]);

	// Fetch cart count for the badge
	const fetchCartCount = async () => {
		try {
			const response = await axiosInstance.get("website/cart/");
			const totalItems = response.data.items.reduce(
				(sum, item) => sum + item.quantity,
				0
			);
			setCartItemCount(totalItems);
		} catch (error) {
			console.error("Failed to fetch cart count:", error);
		}
	};

	// Define text colors based on scroll state for better readability with new palette
	const textColor = scrolled
		? "text-accent-dark-green"
		: "text-accent-light-beige";
	const hoverTextColor = scrolled
		? "hover:text-primary-green"
		: "hover:text-primary-beige";
	const iconColor = scrolled
		? "text-accent-dark-green"
		: "text-accent-light-beige";
	const iconHoverBg = scrolled ? "hover:bg-primary-beige" : "hover:bg-white/20";
	const mobileMenuButtonColor = scrolled
		? "text-accent-dark-green"
		: "text-accent-light-beige";

	const navbarBaseClasses =
		"fixed top-0 w-full z-50 transition-all duration-500";
	// --- MODIFICATION: Test without opacity first ---
	const scrolledClasses =
		"bg-accent-light-beige backdrop-blur-md shadow-lg py-2";
	const unscrolledClasses = "bg-transparent py-4";
	const dynamicNavbarClasses = `${navbarBaseClasses} ${
		scrolled ? scrolledClasses : unscrolledClasses
	}`;

	return (
		<div
			className={dynamicNavbarClasses} // Use the constructed classes
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center">
					{/* Logo */}
					<Link
						to="/"
						className="flex items-center"
					>
						<img
							src={Logo}
							alt="Ajeen Logo"
							className="h-12 w-auto"
						/>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center space-x-1">
						{["Home", "About", "FAQ", "Contact"].map((item) => (
							<a
								key={item}
								href={`#${item.toLowerCase()}`}
								className={`relative px-3 py-2 font-medium transition-colors duration-300
                  ${textColor} ${hoverTextColor}
                  after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0
                  after:bg-primary-green after:transition-all after:duration-300
                  hover:after:w-full`}
							>
								{item}
							</a>
						))}

						{/* Order Now Button */}
						<Link
							to="/menu"
							className={`ml-4 px-5 py-2 rounded-full font-medium transition-all duration-300
                bg-accent-warm-brown text-accent-light-beige hover:bg-opacity-80
               shadow-md hover:shadow-lg transform hover:scale-105`}
						>
							Order Now
						</Link>

						{/* Login/Profile */}
						{!isAuthenticated ? (
							<Link
								to="/login"
								className={`ml-2 p-2 rounded-full transition-all duration-300
                  ${iconColor} ${iconHoverBg}`}
							>
								<AiOutlineUser size={24} />
							</Link>
						) : (
							<div className="relative ml-2">
								<ProfileImage handleLogout={logout} />
							</div>
						)}

						{/* Cart Icon */}
						<Link
							to={isAuthenticated ? "/menu" : "/login"}
							className={`ml-2 p-2 rounded-full transition-all duration-300 relative
                ${iconColor} ${iconHoverBg}`}
						>
							<AiOutlineShoppingCart size={24} />
							{cartItemCount > 0 && (
								<motion.span
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									className="absolute -top-1 -right-1 w-5 h-5 bg-accent-warm-brown text-accent-light-beige text-xs rounded-full flex items-center justify-center"
								>
									{cartItemCount}
								</motion.span>
							)}
						</Link>
					</div>

					{/* Mobile Menu Button */}
					<div className="md:hidden flex items-center">
						<button
							onClick={() => setNav(!nav)}
							className={`p-2 rounded-md transition-colors ${mobileMenuButtonColor}`}
							aria-label="Toggle mobile menu"
						>
							{nav ? <AiOutlineClose size={24} /> : <AiOutlineMenu size={24} />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu */}
			<AnimatePresence>
				{nav && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.3 }}
						className="md:hidden bg-accent-light-beige overflow-hidden shadow-lg"
					>
						<div className="px-4 py-3 space-y-1">
							{["Home", "About", "FAQ", "Contact"].map((item) => (
								<a
									key={item}
									href={`#${item.toLowerCase()}`}
									className="block py-3 px-4 text-accent-dark-green font-medium border-b border-primary-beige hover:bg-primary-beige"
									onClick={() => setNav(false)}
								>
									{item}
								</a>
							))}

							<Link
								to="/menu"
								className="block py-3 px-4 mt-2 text-center bg-accent-warm-brown text-accent-light-beige rounded-lg font-medium hover:bg-opacity-80"
								onClick={() => setNav(false)}
							>
								Order Now
							</Link>

							{!isAuthenticated ? (
								<Link
									to="/login"
									className="block py-3 px-4 text-accent-dark-green font-medium border-t border-primary-beige mt-2 hover:bg-primary-beige"
									onClick={() => setNav(false)}
								>
									Login
								</Link>
							) : (
								<>
									<Link
										to="/dashboard"
										className="block py-3 px-4 text-accent-dark-green font-medium border-t border-primary-beige mt-2 hover:bg-primary-beige"
										onClick={() => setNav(false)}
									>
										My Profile
									</Link>
									<button
										onClick={() => {
											logout();
											setNav(false);
										}}
										className="block w-full text-left py-3 px-4 text-accent-dark-green font-medium hover:bg-primary-beige"
									>
										Logout
									</button>
								</>
							)}

							{/* Mobile Cart Link */}
							<Link
								to={isAuthenticated ? "/menu" : "/login"}
								className="block py-3 px-4 text-accent-dark-green font-medium border-t border-primary-beige hover:bg-primary-beige"
								onClick={() => setNav(false)}
							>
								<div className="flex items-center">
									<AiOutlineShoppingCart className="mr-2" />
									Cart
									{cartItemCount > 0 && (
										<span className="ml-2 bg-accent-warm-brown text-accent-light-beige text-xs px-2 py-1 rounded-full">
											{cartItemCount}
										</span>
									)}
								</div>
							</Link>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Navbar;
