// src/components/ComingSoonPage.jsx
import React from "react";
import Logo from "../assests/logo.png"; // Assuming your logo is here
import { FaFacebook, FaInstagram, FaYelp, FaTiktok } from "react-icons/fa"; // Removed Twitter as it's not in your footer

const ComingSoonPage = () => {
	const currentYear = new Date().getFullYear();

	return (
		// Using a very light, neutral background like Tailwind's 'bg-stone-100' or 'bg-gray-50'
		// For a slightly warmer off-white, 'bg-orange-50' or 'bg-yellow-50' could also be good choices.
		// Let's go with bg-stone-100 for a clean, modern, slightly warm off-white.
		<div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center text-gray-800 p-8 font-sans">
			{/* Logo */}
			<img
				src={Logo}
				alt="Ajeen Logo"
				className="h-24 w-auto mb-8" // Removed animate-pulse for a static feel
			/>

			{/* Main Message */}
			{/* Using a darker green for "Coming Soon!" */}
			<h2 className="text-3xl md:text-4xl font-semibold mb-6 text-center text-green-700">
				Coming Soon!
			</h2>
			{/* Using a mid-tone gray for paragraph text for readability */}
			<p className="text-lg md:text-xl text-gray-600 mb-4 text-center max-w-2xl">
				We're working hard to bring you an amazing online experience. Our new
				website is under construction but we'll be here soon!
			</p>
			<p className="text-md text-gray-500 mb-10 text-center">
				Stay tuned for authentic Middle Eastern flavors.
			</p>

			{/* Divider - using an accent color from logo (e.g., a lighter teal or green) */}
			<div className="w-20 h-1 bg-teal-500 rounded-full mb-10"></div>

			{/* Contact/Follow Us Section */}
			<div className="text-center mb-12">
				<h3 className="text-xl font-semibold mb-4 text-green-800">
					Follow Us for Updates:
				</h3>
				<div className="flex justify-center space-x-6">
					{/* Social icons using a dark color, with hover effect matching an accent */}
					<a
						href="https://www.facebook.com/share/1AdkSavHnT/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-600 hover:text-teal-600 transition-colors duration-300 transform hover:scale-110"
						aria-label="Facebook"
					>
						<FaFacebook size={28} />
					</a>
					<a
						href="https://www.instagram.com/bake_ajeen/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-600 hover:text-teal-600 transition-colors duration-300 transform hover:scale-110"
						aria-label="Instagram"
					>
						<FaInstagram size={28} />
					</a>
					<a
						href="https://www.tiktok.com/@bake_ajeen?_t=ZT-8wNu8CL8oaU&_r=1"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-600 hover:text-teal-600 transition-colors duration-300 transform hover:scale-110"
						aria-label="TikTok"
					>
						<FaTiktok size={28} />
					</a>
					<a
						href="https://www.yelp.com/biz/ajeen-bakery-eagan?osq=ajeen"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-600 hover:text-teal-600 transition-colors duration-300 transform hover:scale-110"
						aria-label="Yelp"
					>
						<FaYelp size={28} />
					</a>
				</div>
			</div>

			{/* Contact Info */}
			<div className="text-center text-sm text-gray-500 mb-10">
				<p>2105 Cliff Rd Suite 300, Eagan, MN, 55122</p>
			</div>

			{/* Footer Copyright */}
			<footer className="absolute bottom-8 text-center text-sm text-gray-500">
				&copy; {currentYear} Ajeen. All rights reserved.
			</footer>
		</div>
	);
};

export default ComingSoonPage;
