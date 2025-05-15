// src/components/dashboard/Sidebar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaHistory, FaEdit, FaSignOutAlt } from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import { clearTokensAndLogout } from "../../../api/api";
import axiosInstance from "../../../api/api";

const Sidebar = () => {
	const navigate = useNavigate();
	const { activeTab, setActiveTab, userInfo, profileImage } = useDashboard();

	// Handle logout
	const handleLogout = async () => {
		try {
			await axiosInstance.post("website/logout/");
		} catch (error) {
			console.error("Logout API call failed:", error);
		} finally {
			clearTokensAndLogout();
			navigate("/login");
		}
	};

	return (
		<div className="md:w-64 flex-shrink-0 mb-6 md:mb-0">
			<div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
				{/* User Info */}
				<div className="p-6 border-b border-gray-200 flex items-center">
					<div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 mr-3">
						{profileImage ? (
							<img
								src={profileImage}
								alt="Profile"
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-green-100 text-green-800">
								<FaUser size={20} />
							</div>
						)}
					</div>
					<div>
						<p className="font-medium">
							{userInfo.first_name} {userInfo.last_name}
						</p>
						<p className="text-sm text-gray-500">{userInfo.email}</p>
					</div>
				</div>

				{/* Navigation */}
				<nav className="p-2">
					<button
						onClick={() => setActiveTab("profile")}
						className={`w-full flex items-center px-4 py-2 rounded-md transition-colors ${
							activeTab === "profile"
								? "bg-green-50 text-green-700"
								: "text-gray-700 hover:bg-gray-100"
						}`}
					>
						<FaUser className="mr-3" /> Profile
					</button>

					<button
						onClick={() => setActiveTab("orders")}
						className={`w-full flex items-center px-4 py-2 rounded-md transition-colors ${
							activeTab === "orders"
								? "bg-green-50 text-green-700"
								: "text-gray-700 hover:bg-gray-100"
						}`}
					>
						<FaHistory className="mr-3" /> Order History
					</button>
					{/* 
					<button
						onClick={() => setActiveTab("account")}
						className={`w-full flex items-center px-4 py-2 rounded-md transition-colors ${
							activeTab === "account"
								? "bg-green-50 text-green-700"
								: "text-gray-700 hover:bg-gray-100"
						}`}
					>
						<FaEdit className="mr-3" /> Account Settings
					</button> */}

					<button
						onClick={handleLogout}
						className="w-full flex items-center px-4 py-2 rounded-md text-red-600 hover:bg-red-50 transition-colors mt-4"
					>
						<FaSignOutAlt className="mr-3" /> Logout
					</button>
				</nav>
			</div>
		</div>
	);
};

export default Sidebar;
