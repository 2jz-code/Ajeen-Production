import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Order = () => {
	return (
		<div className="relative py-20 overflow-hidden">
			{/* Background with gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600"></div>

			{/* Decorative elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-10 rounded-full"></div>
				<div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white opacity-10 rounded-full"></div>
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white opacity-10 rounded-full"></div>
			</div>

			<div className="relative max-w-5xl mx-auto px-4 text-center z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7 }}
					viewport={{ once: true, amount: 0.3 }}
				>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
						Ready to Satisfy Your Cravings?
					</h2>

					<p className="text-lg sm:text-xl text-green-100 mb-10 max-w-3xl mx-auto">
						Experience authentic Middle Eastern flavors with our freshly
						prepared dishes. Order now for pickup or delivery and enjoy a taste
						of tradition!
					</p>

					<div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
						<Link
							to="/menu"
							className="inline-flex items-center px-8 py-4 rounded-full bg-white text-green-700 font-bold text-lg shadow-lg hover:bg-green-50 transform hover:scale-105 transition-all duration-300"
						>
							Order Online
							<svg
								className="ml-2 w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M14 5l7 7m0 0l-7 7m7-7H3"
								/>
							</svg>
						</Link>

						<a
							href="tel:+11234567890"
							className="inline-flex items-center px-8 py-4 rounded-full bg-transparent border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition-all duration-300"
						>
							<svg
								className="mr-2 w-5 h-5"
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

					<div className="mt-10 flex flex-wrap justify-center gap-8">
						<div className="flex items-center">
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Uber_Eats_2020_logo.svg/2560px-Uber_Eats_2020_logo.svg.png"
								alt="UberEats"
								className="h-8 object-contain"
							/>
						</div>
						<div className="flex items-center">
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/DoorDash_logo.svg/2560px-DoorDash_logo.svg.png"
								alt="DoorDash"
								className="h-8 object-contain"
							/>
						</div>
						<div className="flex items-center">
							<img
								src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Grubhub_logo.svg/1200px-Grubhub_logo.svg.png"
								alt="GrubHub"
								className="h-8 object-contain"
							/>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
};

export default Order;
