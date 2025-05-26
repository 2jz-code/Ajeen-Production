// src/components/confirmation/components/ActionButtons.jsx
import React from "react";
import { Link } from "react-router-dom"; // Assuming useNavigate is passed as a prop if used for non-Link buttons
import { FaUtensils, FaHome } from "react-icons/fa";

// The `navigate` prop was passed in ConfirmationPage, but Link to="/" is used for home.
// If direct navigation via navigate() is needed for other buttons, it should be passed.
const ActionButtons = ({ navigate }) => {
	return (
		<div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
			{/* "Order More Food" Button: Primary Green bg, Light Beige text */}
			<Link
				to="/menu"
				className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-accent-light-beige bg-primary-green hover:bg-accent-dark-green transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-accent-light-beige"
			>
				<FaUtensils className="mr-2 h-5 w-5" /> Order More Food
			</Link>
			{/* "Return to Home" Button: Primary Beige bg, Dark Green text, Subtle Gray border */}
			<button
				onClick={() => navigate("/")} // Using navigate prop for consistency if other buttons might need it
				className="inline-flex justify-center items-center px-6 py-3 border border-accent-subtle-gray rounded-lg shadow-md text-base font-semibold text-accent-dark-green bg-primary-beige hover:bg-primary-beige/70 hover:border-accent-subtle-gray/70 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-green focus:ring-offset-2 focus:ring-offset-accent-light-beige"
			>
				<FaHome className="mr-2 h-5 w-5" /> Return to Home
			</button>
		</div>
	);
};

export default ActionButtons;
