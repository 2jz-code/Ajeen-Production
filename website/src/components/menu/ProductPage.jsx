import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MenuNav from "./MenuNav";
import ProductList from "./ProductList";
import Layout from "./Layout"; // This is the styled Layout we just did
import useCart from "../utility/CartUtils"; // Assuming path is correct

const ProductPage = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const isMenuPage = location.pathname === "/menu";
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [activeView, setActiveView] = useState("grid");

	const {
		categories, // This is the categories array we need to pass
		cartItemCount,
		isLoadingCategories,
		updateCartItemCount,
	} = useCart(isMenuPage);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const categoryId = params.get("category");
		if (categoryId) {
			setSelectedCategory(Number(categoryId));
		} else {
			setSelectedCategory(null);
		}
	}, [location.search]);

	useEffect(() => {
		if (selectedCategory) {
			navigate(`/menu?category=${selectedCategory}`, { replace: true });
		} else if (location.pathname === "/menu" && location.search) {
			if (new URLSearchParams(location.search).get("category")) {
				navigate("/menu", { replace: true });
			}
		}
	}, [selectedCategory, navigate, location.pathname, location.search]);

	return (
		<Layout
			cartItemCount={cartItemCount}
			updateCartItemCount={updateCartItemCount}
		>
			<div className="min-h-screen">
				<div className="bg-gradient-to-r from-primary-green to-accent-dark-green text-accent-light-beige py-12">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center">
							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="text-3xl md:text-4xl font-bold mb-4"
							>
								Our Menu
							</motion.h1>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.1 }}
								className="text-lg max-w-2xl mx-auto"
							>
								Explore our selection of authentic Middle Eastern dishes made
								with fresh ingredients and traditional recipes.
							</motion.p>
						</div>
					</div>
				</div>

				{isLoadingCategories ? (
					<div className="py-4 flex justify-center">
						<div className="animate-pulse flex space-x-4">
							<div className="h-8 w-20 bg-accent-subtle-gray/50 rounded-full"></div>
							<div className="h-8 w-24 bg-accent-subtle-gray/50 rounded-full"></div>
							<div className="h-8 w-20 bg-accent-subtle-gray/50 rounded-full"></div>
						</div>
					</div>
				) : (
					<MenuNav
						categories={categories}
						selectedCategory={selectedCategory}
						setSelectedCategory={setSelectedCategory}
					/>
				)}

				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-end">
					<div className="flex space-x-1 bg-accent-light-beige p-1 rounded-lg shadow-sm border border-accent-subtle-gray/30">
						<button
							onClick={() => setActiveView("grid")}
							className={`p-2 rounded-md ${
								activeView === "grid"
									? "bg-primary-green/20 text-primary-green"
									: "text-accent-dark-brown hover:bg-primary-beige/70"
							} transition-colors`}
							aria-label="Grid view"
						>
							<svg
								className="w-5 h-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
								/>
							</svg>
						</button>
						<button
							onClick={() => setActiveView("list")}
							className={`p-2 rounded-md ${
								activeView === "list"
									? "bg-primary-green/20 text-primary-green"
									: "text-accent-dark-brown hover:bg-primary-beige/70"
							} transition-colors`}
							aria-label="List view"
						>
							<svg
								className="w-5 h-5"
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

				<ProductList
					categories={categories} // --- Pass categories prop here ---
					selectedCategory={selectedCategory}
					setSelectedCategory={setSelectedCategory}
					updateCartItemCount={updateCartItemCount}
					activeView={activeView}
				/>
			</div>
		</Layout>
	);
};

export default ProductPage;
