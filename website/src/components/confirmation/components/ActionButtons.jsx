// src/components/confirmation/components/ActionButtons.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaUtensils, FaHome } from "react-icons/fa";

const ActionButtons = ({ navigate }) => {
	return (
		<div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
			<Link
				to="/menu"
				className="inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-500 hover:bg-green-600 transition-colors"
			>
				<FaUtensils className="mr-2" /> Order More Food
			</Link>
			<button
				onClick={() => navigate("/")}
				className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
			>
				<FaHome className="mr-2" /> Return to Home
			</button>
		</div>
	);
};

export default ActionButtons;
