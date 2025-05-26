import React from "react";
import { Link } from "react-router-dom";
import CartButton from "./CartButton"; // Assuming path is correct
import { FaHome, FaUtensils, FaInfoCircle, FaPhone } from "react-icons/fa";
import Logo from "../../assests/logo.png"; // Assuming path is correct

const Layout = ({ children, cartItemCount, updateCartItemCount }) => {
	return (
		// Main layout container: using global background (accent-light-beige)
		<div className="min-h-screen flex flex-col bg-background">
			{/* Header: Light beige background, subtle shadow, sticky */}
			<header className="bg-accent-light-beige shadow-md sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
					<Link
						to="/"
						className="flex items-center"
					>
						<img
							src={Logo}
							alt="Ajeen Logo"
							className="h-10 w-auto" // Slightly smaller for this header
						/>
					</Link>

					{/* Desktop Navigation: Dark green text, hover to primary green */}
					<nav className="hidden md:flex space-x-6">
						<NavLink
							href="/"
							icon={
								<FaHome className="text-accent-dark-green group-hover:text-primary-green" />
							}
							text="Home"
						/>
						<NavLink
							href="/menu"
							icon={
								<FaUtensils className="text-accent-dark-green group-hover:text-primary-green" />
							}
							text="Menu"
						/>
						<NavLink
							href="/#about" // Assuming these are hash links to the homepage
							icon={
								<FaInfoCircle className="text-accent-dark-green group-hover:text-primary-green" />
							}
							text="About"
						/>
						<NavLink
							href="/#contact" // Assuming these are hash links to the homepage
							icon={
								<FaPhone className="text-accent-dark-green group-hover:text-primary-green" />
							}
							text="Contact"
						/>
					</nav>

					{/* Cart Button */}
					<div className="relative">
						<CartButton
							cartItemCount={cartItemCount}
							refreshCartCount={updateCartItemCount}
							// Pass className to ensure it can be positioned if needed, though Navbar usually handles this
						/>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-grow">{children}</main>
			{/* Note: This Layout does not include a Footer. If a specific menu footer is needed, it would be added here. */}
			{/* The global Footer from App.js will apply if this Layout is used within those routes. */}
		</div>
	);
};

// Helper component for navigation links
const NavLink = ({ href, icon, text }) => (
	<Link
		to={href}
		// Text: Dark green, hover: primary green. Group hover for icon color change.
		className="flex items-center text-accent-dark-green hover:text-primary-green transition-colors group"
	>
		<span className="mr-1.5">{icon}</span>
		<span className="text-sm font-medium">{text}</span>
	</Link>
);

export default Layout;
