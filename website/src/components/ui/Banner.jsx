import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Banner = () => {
	return (
		<motion.header
			initial={{ y: -100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ type: "spring", stiffness: 100, damping: 15 }}
			className="bg-gradient-to-r from-green-700 to-green-900 text-white shadow-md"
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
				<Link
					to="/"
					className="flex items-center"
				>
					<span className="text-3xl italic font-serif font-bold tracking-wide">
						Ajeen
					</span>
					<span className="ml-2 text-xs uppercase tracking-widest bg-white bg-opacity-20 px-2 py-1 rounded">
						Authentic Taste
					</span>
				</Link>

				<nav className="hidden md:flex space-x-6">
					<NavLink href="/">Home</NavLink>
					<NavLink href="/menu">Menu</NavLink>
					<NavLink href="/#about">About</NavLink>
					<NavLink href="/#contact">Contact</NavLink>
				</nav>

				<div className="flex items-center space-x-4">
					<Link
						to="/menu"
						className="hidden md:inline-flex items-center px-4 py-2 bg-white text-green-800 rounded-full text-sm font-medium hover:bg-green-50 transition-colors"
					>
						Order Now
						<svg
							className="ml-1 w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M14 5l7 7m0 0l-7 7m7-7H3"
							/>
						</svg>
					</Link>

					<button className="md:hidden">
						<svg
							className="w-6 h-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
					</button>
				</div>
			</div>
		</motion.header>
	);
};

// Helper component for navigation links
const NavLink = ({ href, children }) => (
	<Link
		to={href}
		className="text-white hover:text-green-200 transition-colors font-medium text-sm"
	>
		{children}
	</Link>
);

export default Banner;
