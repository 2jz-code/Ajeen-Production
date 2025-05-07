import React from "react";
import { Link } from "react-router-dom";
import CartButton from "./CartButton";
import { FaHome, FaUtensils, FaInfoCircle, FaPhone } from "react-icons/fa";

const Layout = ({ children, cartItemCount, updateCartItemCount }) => {
	return (
		<div className="min-h-screen flex flex-col bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow-sm sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
					<Link
						to="/"
						className="flex items-center"
					>
						<span className="text-2xl font-serif italic font-bold text-green-800">
							Ajeen
						</span>
					</Link>

					<nav className="hidden md:flex space-x-8">
						<NavLink
							href="/"
							icon={<FaHome />}
							text="Home"
						/>
						<NavLink
							href="/menu"
							icon={<FaUtensils />}
							text="Menu"
						/>
						<NavLink
							href="/#about"
							icon={<FaInfoCircle />}
							text="About"
						/>
						<NavLink
							href="/#contact"
							icon={<FaPhone />}
							text="Contact"
						/>
					</nav>

					{/* Cart Button is always visible */}
					<div className="relative">
						<CartButton
							cartItemCount={cartItemCount}
							refreshCartCount={updateCartItemCount} // Pass the function using the name CartButton expects
						/>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-grow">{children}</main>
		</div>
	);
};

// Helper component for navigation links
const NavLink = ({ href, icon, text }) => (
	<Link
		to={href}
		className="flex items-center text-gray-600 hover:text-green-600 transition-colors"
	>
		<span className="mr-1">{icon}</span>
		<span>{text}</span>
	</Link>
);

export default Layout;
