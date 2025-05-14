import React from "react";
import { Link } from "react-router-dom";
import {
	FaFacebookSquare,
	FaInstagramSquare,
	FaTwitterSquare,
	FaYelp,
	FaHeart,
} from "react-icons/fa";

const Footer = () => {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-gray-900 text-gray-300">
			{/* Main Footer Content */}
			<div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-10">
					{/* Logo and About */}
					<div className="col-span-1 md:col-span-1">
						<Link
							to="/"
							className="text-3xl font-serif italic font-bold text-white"
						>
							Ajeen
						</Link>
						<p className="mt-4 text-gray-400 text-sm">
							Authentic Middle Eastern cuisine made with love and tradition.
							Serving the community with fresh, delicious food since 2010.
						</p>
						{/* Social Media */}
						<div className="mt-6 flex space-x-4">
							<a
								href="https://www.facebook.com/nadir.mustafa.737"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-white transition-colors duration-300 transform hover:scale-110"
								aria-label="Facebook"
							>
								<FaFacebookSquare size={24} />
							</a>
							<a
								href="https://www.instagram.com/bake_ajeen/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-white transition-colors duration-300 transform hover:scale-110"
								aria-label="Instagram"
							>
								<FaInstagramSquare size={24} />
							</a>
							<a
								href="#"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-white transition-colors duration-300 transform hover:scale-110"
								aria-label="Twitter"
							>
								<FaTwitterSquare size={24} />
							</a>
							<a
								href="#"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-white transition-colors duration-300 transform hover:scale-110"
								aria-label="Yelp"
							>
								<FaYelp size={24} />
							</a>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<h3 className="text-white text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
							Quick Links
						</h3>
						<ul className="space-y-2">
							{[
								{ name: "Home", path: "/", isLink: true },
								{ name: "Menu", path: "/menu", isLink: true },
								{ name: "About Us", path: "/#about", isLink: false },
								{ name: "Contact", path: "/#contact", isLink: false },
								{ name: "FAQ", path: "/#faq", isLink: false },
							].map((item) => (
								<li key={item.name}>
									{item.isLink ? (
										<Link
											to={item.path}
											className="text-gray-400 hover:text-green-400 transition-colors duration-300 flex items-center group"
										>
											<span className="w-0 group-hover:w-2 h-1 bg-green-400 mr-0 group-hover:mr-2 transition-all duration-300"></span>
											{item.name}
										</Link>
									) : (
										<a
											href={item.path}
											className="text-gray-400 hover:text-green-400 transition-colors duration-300 flex items-center group"
										>
											<span className="w-0 group-hover:w-2 h-1 bg-green-400 mr-0 group-hover:mr-2 transition-all duration-300"></span>
											{item.name}
										</a>
									)}
								</li>
							))}
						</ul>
					</div>

					{/* Contact Info */}
					<div>
						<h3 className="text-white text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
							Contact Us
						</h3>
						<ul className="space-y-3 text-sm text-gray-400">
							<li className="flex items-start group">
								<svg
									className="h-5 w-5 text-gray-500 group-hover:text-green-400 mr-3 mt-0.5 transition-colors duration-300"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span className="group-hover:text-gray-300 transition-colors duration-300">
									2105 Cliff Rd Suite 300, Eagan, MN, 55124
								</span>
							</li>
							<li className="flex items-start group">
								<svg
									className="h-5 w-5 text-gray-500 group-hover:text-green-400 mr-3 mt-0.5 transition-colors duration-300"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
									/>
								</svg>
								<a
									href="tel:+11234567890"
									className="group-hover:text-gray-300 transition-colors duration-300"
								>
									(651) 412-5336
								</a>
							</li>
							<li className="flex items-start group">
								<svg
									className="h-5 w-5 text-gray-500 group-hover:text-green-400 mr-3 mt-0.5 transition-colors duration-300"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
								<a
									href="mailto:contact@ajeen.com"
									className="group-hover:text-gray-300 transition-colors duration-300"
								>
									contact@bakeajeen.com
								</a>
							</li>
						</ul>
					</div>

					{/* Opening Hours */}
					<div>
						<h3 className="text-white text-lg font-semibold mb-4 border-b border-gray-700 pb-2">
							Opening Hours
						</h3>
						<div className="bg-gray-800 rounded-lg p-4">
							<ul className="space-y-2 text-sm">
								<li className="flex justify-between items-center">
									<span className="text-gray-400">Monday - Friday</span>
									<span className="text-green-400 font-medium">
										6:00 AM - 7:00 PM
									</span>
								</li>
								<li className="flex justify-between items-center">
									<span className="text-gray-400">Saturday</span>
									<span className="text-green-400 font-medium">
										6:00 AM - 7:00 PM
									</span>
								</li>
								<li className="flex justify-between items-center">
									<span className="text-gray-400">Sunday</span>
									<span className="text-green-400 font-medium">
										6:00 AM - 7:00 PM
									</span>
								</li>
							</ul>
							<div className="mt-4 pt-3 border-t border-gray-700">
								<Link
									to="/menu"
									className="text-white bg-green-600 hover:bg-green-700 transition-colors duration-300 text-sm font-medium rounded-md py-2 px-4 inline-block w-full text-center"
								>
									Order Online
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Newsletter Subscription */}
				{/* <div className="mt-12 pt-8 border-t border-gray-800">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="mb-6 md:mb-0">
							<h4 className="text-white text-lg font-medium mb-2">
								Subscribe to our newsletter
							</h4>
							<p className="text-gray-400 text-sm">
								Stay updated with our latest offers and events.
							</p>
						</div>
						<div className="w-full md:w-auto">
							<form className="flex">
								<input
									type="email"
									placeholder="Your email address"
									className="bg-gray-800 text-gray-300 px-4 py-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64"
								/>
								<button
									type="submit"
									className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-md transition-colors duration-300"
								>
									Subscribe
								</button>
							</form>
						</div>
					</div>
				</div> */}
			</div>

			{/* Copyright Bar */}
			<div className="border-t border-gray-800">
				<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
					<p className="text-sm text-gray-400">
						&copy; {currentYear} Ajeen. All rights reserved.
					</p>
					<div className="mt-4 md:mt-0 flex flex-wrap justify-center gap-4 text-sm text-gray-400">
						{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
						<a
							href="#"
							className="hover:text-green-400 transition-colors duration-300"
						>
							Privacy Policy
						</a>
						{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
						<a
							href="#"
							className="hover:text-green-400 transition-colors duration-300"
						>
							Terms of Service
						</a>
						{/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
						<a
							href="#"
							className="hover:text-green-400 transition-colors duration-300"
						>
							Accessibility
						</a>
						<span className="flex items-center">
							Made with{" "}
							<FaHeart
								className="text-red-500 mx-1"
								size={14}
							/>{" "}
							in Minnesota
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
