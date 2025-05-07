import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const MenuNav = ({ categories, selectedCategory, setSelectedCategory }) => {
	const [showScrollButtons, setShowScrollButtons] = useState(false);
	const navRef = useRef(null);

	// Check if we need scroll buttons based on container width
	useEffect(() => {
		const checkScroll = () => {
			if (navRef.current) {
				const { scrollWidth, clientWidth } = navRef.current;
				setShowScrollButtons(scrollWidth > clientWidth);
			}
		};

		checkScroll();
		window.addEventListener("resize", checkScroll);
		return () => window.removeEventListener("resize", checkScroll);
	}, [categories]);

	// Scroll the category container left or right
	const scroll = (direction) => {
		if (navRef.current) {
			const scrollAmount = 200;
			navRef.current.scrollBy({
				left: direction === "left" ? -scrollAmount : scrollAmount,
				behavior: "smooth",
			});
		}
	};

	return (
		<div className="bg-white shadow-sm sticky top-16 z-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative">
				<div className="flex items-center">
					{/* Left scroll button */}
					{showScrollButtons && (
						<button
							onClick={() => scroll("left")}
							className="absolute left-2 z-10 bg-white rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
							aria-label="Scroll categories left"
						>
							<svg
								className="h-6 w-6 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 19l-7-7 7-7"
								/>
							</svg>
						</button>
					)}

					{/* Categories container with horizontal scroll */}
					<div
						ref={navRef}
						className="flex space-x-2 overflow-x-auto py-2 scrollbar-hide mx-auto"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
					>
						{/* "All" button */}
						<CategoryButton
							isSelected={selectedCategory === null}
							onClick={() => setSelectedCategory(null)}
							name="All"
						/>

						{/* Category buttons */}
						{categories.map((category) => (
							<CategoryButton
								key={category.id}
								isSelected={selectedCategory === category.id}
								onClick={() => setSelectedCategory(category.id)}
								name={category.name}
							/>
						))}
					</div>

					{/* Right scroll button */}
					{showScrollButtons && (
						<button
							onClick={() => scroll("right")}
							className="absolute right-2 z-10 bg-white rounded-full shadow-md p-1 hover:bg-gray-100 transition-colors"
							aria-label="Scroll categories right"
						>
							<svg
								className="h-6 w-6 text-gray-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

// Helper component for category buttons
const CategoryButton = ({ isSelected, onClick, name }) => {
	return (
		<motion.button
			onClick={onClick}
			className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
				isSelected
					? "bg-green-500 text-white shadow-md"
					: "bg-gray-100 text-gray-700 hover:bg-gray-200"
			}`}
			whileTap={{ scale: 0.95 }}
		>
			{name}
		</motion.button>
	);
};

export default MenuNav;
