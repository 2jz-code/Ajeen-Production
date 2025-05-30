// src/App.js
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
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import the ComingSoonPage
import ComingSoonPage from "./components/ComingSoonPage"; // Adjust path if needed
import ReviewCarousel from "./components/ReviewCarousel";

// Create a component to handle scrolling after navigation
function ScrollHandler() {
	const location = useLocation();
	useDocumentTitle(); //
	useEffect(() => {
		check_and_refresh_token(); //
		if (location.hash) {
			const id = location.hash.substring(1);
			const element = document.getElementById(id);
			if (element) {
				setTimeout(() => {
					const offsetTop = element.offsetTop - 70;
					window.scrollTo({
						top: offsetTop,
						behavior: "smooth",
					});
				}, 100);
			}
		} else {
			window.scrollTo(0, 0);
		}
	}, [location]);
	return null;
}

function App() {
	const { cartItemCount, updateCartItemCount } = useCart(); //

	useEffect(() => {
		const handleLinkClick = (event) => {
			const target = event.target.closest('a[href^="#"]');
			if (target) {
				const href = target.getAttribute("href");
				if (href.startsWith("#")) {
					event.preventDefault();
					const id = href.slice(1);
					const element = document.getElementById(id);
					if (element) {
						const offsetTop = element.offsetTop - 70;
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

	// Check the environment variable
	// In development, you can set this in your .env file
	// For AWS, you'll set this in your environment configuration (e.g., Elastic Beanstalk, Amplify, S3/CloudFront with Lambda@Edge)
	const showComingSoon = process.env.REACT_APP_SHOW_COMING_SOON === "true";

	if (showComingSoon) {
		return <ComingSoonPage />;
	}

	return (
		<AuthProvider>
			{" "}
			{/* */}
			<Router>
				<ScrollHandler />
				<div className="App min-h-screen flex flex-col">
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
											<ReviewCarousel/>
											<Location /> 
											<Faq /> 
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
											cartItemCount={cartItemCount} //
											updateCartItemCount={updateCartItemCount} //
										/>
									</>
								}
							/>
							<Route
								path="/login"
								element={
									<>
										<Login /> {/* */}
									</>
								}
							/>
							<Route
								path="/dashboard"
								element={
									<>
										<Dashboard /> {/* */}
									</>
								}
							/>
							<Route
								path="/register"
								element={
									<>
										<Register /> {/* */}
									</>
								}
							/>
							<Route
								path="/checkout"
								element={
									<>
										<CheckoutPage /> {/* */}
									</>
								}
							/>
							<Route
								path="/confirmation"
								element={
									<>
										<ConfirmationPage /> {/* */}
									</>
								}
							/>
						</Routes>
					</div>
					<ToastContainer
						position="top-right"
						autoClose={1000}
						hideProgressBar={false}
						newestOnTop={false}
						closeOnClick
						rtl={false}
						draggable
						pauseOnHover
						theme="light"
					/>
					<Footer /> {/* */}
					<ScrollToTop /> {/* */}
				</div>
			</Router>
		</AuthProvider>
	);
}

export default App;
