import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import ScrollToTop from "./components/Scroll";
import Faq from "./components/Faq";
import Cards from "./components/Cards";
import Order from "./components/Order";
import Location from "./components/Location";
import Login from "./components/users/Login";
import Register from "./components/users/Register";
import Dashboard from "./components/users/dashboard";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import "./globals.css";
import ProductPage from "./components/menu/ProductPage";
import ProductDetails from "./components/menu/ProductDetails";
import useCart from "./components/utility/CartUtils";
import CheckoutPage from "./components/checkout";
import ConfirmationPage from "./components/confirmation";
import { AuthProvider } from "./contexts/AuthContext";
import { check_and_refresh_token } from "./api/api";

// Create a component to handle scrolling after navigation
function ScrollHandler() {
	const location = useLocation();

	useEffect(() => {
		// Check if there's a hash in the URL
		check_and_refresh_token();
		if (location.hash) {
			const id = location.hash.substring(1);
			const element = document.getElementById(id);

			if (element) {
				setTimeout(() => {
					const offsetTop = element.offsetTop - 70; // Adjust based on your fixed header height
					window.scrollTo({
						top: offsetTop,
						behavior: "smooth",
					});
				}, 100); // Small delay to ensure DOM is ready
			}
		} else {
			// Scroll to top for new page navigations without hash
			window.scrollTo(0, 0);
		}
	}, [location]);

	return null;
}

function App() {
	const { cartItemCount, updateCartItemCount } = useCart();

	useEffect(() => {
		const handleLinkClick = (event) => {
			// Check if it's a link element or has a parent that is a link
			const target = event.target.closest('a[href^="#"]');

			if (target) {
				const href = target.getAttribute("href");

				// Only handle internal anchor links (starting with #)
				if (href.startsWith("#")) {
					event.preventDefault();
					const id = href.slice(1);
					const element = document.getElementById(id);

					if (element) {
						const offsetTop = element.offsetTop - 70; // Adjust based on your fixed header height
						window.scrollTo({
							top: offsetTop,
							behavior: "smooth",
						});
					}
				}
			}
		};

		document.addEventListener("click", handleLinkClick);
		return () => {
			document.removeEventListener("click", handleLinkClick);
		};
	}, []);

	return (
		<AuthProvider>
			<Router>
				<ScrollHandler />
				<div className="App min-h-screen flex flex-col">
					{/* Navbar and main content should be inside the flex-grow container */}
					<div className="flex-grow">
						<Routes>
							<Route
								path="/"
								element={
									<>
										<Navbar />
										<Hero />
										<div className="common-bg">
											<Cards />
											<Faq />
											<Location />
											<Order />
										</div>
									</>
								}
							/>
							<Route
								path="/menu"
								element={
									<>
										<ProductPage />
									</>
								}
							/>
							<Route
								path="/product/:productName"
								element={
									<>
										<ProductDetails
											cartItemCount={cartItemCount}
											updateCartItemCount={updateCartItemCount}
										/>
									</>
								}
							/>
							<Route
								path="/login"
								element={
									<>
										<Login />
									</>
								}
							/>
							<Route
								path="/dashboard"
								element={
									<>
										<Dashboard />
									</>
								}
							/>
							<Route
								path="/register"
								element={
									<>
										<Register />
									</>
								}
							/>
							<Route
								path="/checkout"
								element={
									<>
										<CheckoutPage />
									</>
								}
							/>
							<Route
								path="/confirmation"
								element={
									<>
										<ConfirmationPage />
									</>
								}
							/>
						</Routes>
					</div>

					{/* Footer stays outside flex-grow */}
					<Footer />
					<ScrollToTop />
				</div>
			</Router>
		</AuthProvider>
	);
}

export default App;
