import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Import icons from react-icons
import { SiUbereats, SiDoordash, SiGrubhub } from "react-icons/si";

// Define your delivery service links (IMPORTANT: Replace these placeholders)
const UBER_EATS_RESTAURANT_LINK =
	process.env.REACT_APP_UBEREATS_LINK || "https://www.ubereats.com"; // Or your restaurant's actual page if available as default
const DOORDASH_RESTAURANT_LINK =
	process.env.REACT_APP_DOORDASH_LINK || "https://www.doordash.com"; // Valid fallback
const GRUBHUB_RESTAURANT_LINK =
	process.env.REACT_APP_GRUBHUB_LINK || "https://www.grubhub.com"; // Valid fallback

const deliveryServices = [
	{
		name: "Uber Eats",
		IconComponent: SiUbereats,
		href: UBER_EATS_RESTAURANT_LINK,
		iconColorClassName: "text-[#06C167]", // Official Uber Eats Green
		ariaLabel: "Order Ajeen on Uber Eats",
	},
	{
		name: "DoorDash",
		IconComponent: SiDoordash,
		href: DOORDASH_RESTAURANT_LINK,
		iconColorClassName: "text-[#FF3008]", // Official DoorDash Red
		ariaLabel: "Order Ajeen on DoorDash",
	},
	{
		name: "Grubhub",
		IconComponent: SiGrubhub,
		href: GRUBHUB_RESTAURANT_LINK,
		iconColorClassName: "text-[#F68B1F]", // Official Grubhub Orange
		ariaLabel: "Order Ajeen on Grubhub",
	},
];

const Order = () => {
	return (
		<div className="relative py-20 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-r from-green-400 via-green-500 to-green-600"></div>

			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-24 -right-24 w-72 h-72 md:w-96 md:h-96 bg-white opacity-5 rounded-full"></div>
				<div className="absolute top-1/2 left-1/4 w-56 h-56 md:w-64 md:h-64 bg-white opacity-5 rounded-full"></div>
				<div className="absolute -bottom-32 -left-32 w-72 h-72 md:w-96 md:h-96 bg-white opacity-5 rounded-full"></div>
			</div>

			<div className="relative max-w-5xl mx-auto px-4 text-center z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, ease: "easeOut" }}
					viewport={{ once: true, amount: 0.2 }}
				>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
						Ready to Satisfy Your Cravings?
					</h2>

					<p className="text-lg sm:text-xl text-green-50 mb-10 max-w-3xl mx-auto leading-relaxed">
						Experience authentic Middle Eastern flavors with our freshly
						prepared dishes. Order now for pickup or delivery and enjoy a taste
						of tradition!
					</p>

					<div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
						<Link
							to="/menu"
							className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-white text-green-700 font-semibold text-base sm:text-lg shadow-xl hover:bg-green-50 transform hover:scale-105 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
						>
							Order Online
							<svg
								className="ml-2.5 w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2.5}
									d="M14 5l7 7m0 0l-7 7m7-7H3"
								/>
							</svg>
						</Link>

						<a
							href="tel:+11234567890" // IMPORTANT: Replace with your actual phone number
							className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-transparent border-2 border-white text-white font-semibold text-base sm:text-lg hover:bg-white/20 transform hover:scale-105 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
						>
							<svg
								className="mr-2.5 w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
								/>
							</svg>
							Call to Order
						</a>
					</div>

					{/* Delivery Service Icons */}
					<div className="mt-12 flex flex-wrap justify-center items-center gap-x-6 gap-y-6 sm:gap-x-8">
						{deliveryServices.map((service) => (
							// eslint-disable-next-line jsx-a11y/anchor-is-valid
							<a
								key={service.name}
								href={
									service.href === "#" || service.href.includes("YOUR_")
										? "#"
										: service.href
								}
								target={
									service.href === "#" || service.href.includes("YOUR_")
										? "_self"
										: "_blank"
								}
								rel="noopener noreferrer"
								aria-label={service.ariaLabel}
								title={`Order on ${service.name}`}
								className={`rounded-full transition-all duration-300 ease-out group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-500 focus:ring-white ${
									service.href === "#" || service.href.includes("YOUR_")
										? "cursor-default" // Keep cursor default if link is placeholder
										: "hover:scale-105" // Scale effect on the whole <a>
								}`}
								onClick={(e) => {
									if (service.href === "#" || service.href.includes("YOUR_")) {
										e.preventDefault();
										console.warn(`Link for ${service.name} is not configured.`);
									}
								}}
							>
								<div // This div acts as the opaque background "plaquette"
									className={`flex items-center justify-center p-3 sm:p-3.5 bg-white rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300 ease-out ${
										service.href === "#" || service.href.includes("YOUR_")
											? "opacity-60"
											: "" // Dim if placeholder
									}`}
								>
									<service.IconComponent
										className={`w-10 h-10 sm:w-11 md:w-12 ${service.iconColorClassName} transition-transform duration-300 ease-out`}
									/>
								</div>
							</a>
						))}
					</div>
					{deliveryServices.some(
						(s) => s.href.includes("YOUR_") || s.href === "#"
					) && (
						<p className="mt-4 text-xs text-green-100">
							(Delivery partner links will be active soon)
						</p>
					)}
				</motion.div>
			</div>
		</div>
	);
};

export default Order;
