// src/components/dashboard/Sidebar.jsx
import React from "react";
import { FaUser, FaHistory, FaSignOutAlt } from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import { clearTokensAndLogout } from "../../../api/api"; // Assuming path is correct
import axiosInstance from "../../../api/api"; // Assuming path is correct

const Sidebar = () => {
	const { activeTab, setActiveTab, userInfo, profileImage } = useDashboard();

	const handleLogout = async () => {
		try {
			await axiosInstance.post("website/logout/");
		} catch (error) {
			console.error("Logout API call failed:", error);
		} finally {
			clearTokensAndLogout(); // This function likely handles token clearing and redirect
			// navigate("/login"); // clearTokensAndLogout might already redirect
		}
	};

	return (
		<div className="md:w-64 flex-shrink-0 mb-6 md:mb-0">
			{/* Sidebar background: Primary Beige, with subtle border */}
			<div className="bg-primary-beige rounded-lg shadow-sm overflow-hidden sticky top-24 border border-accent-subtle-gray/30">
				{/* User Info */}
				{/* User info section border: Subtle Gray */}
				<div className="p-6 border-b border-accent-subtle-gray/50 flex items-center">
					<div className="w-12 h-12 rounded-full overflow-hidden bg-accent-subtle-gray mr-3">
						{profileImage ? (
							<img
								src={profileImage}
								alt="Profile"
								className="w-full h-full object-cover"
							/>
						) : (
							// Fallback icon: Dark Brown icon on Light Beige background
							<div className="w-full h-full flex items-center justify-center bg-accent-light-beige text-accent-dark-brown">
								<FaUser size={20} />
							</div>
						)}
					</div>
					<div>
						{/* User name: Dark Green */}
						<p className="font-medium text-accent-dark-green">
							{userInfo.first_name} {userInfo.last_name}
						</p>
						{/* User email: Dark Brown */}
						<p className="text-sm text-accent-dark-brown">{userInfo.email}</p>
					</div>
				</div>

				{/* Navigation */}
				<nav className="p-2">
					<button
						onClick={() => setActiveTab("profile")}
						// Active: Lighter Primary Green bg, Dark Green text. Inactive: Dark Green text, hover Primary Beige bg
						className={`w-full flex items-center px-4 py-2.5 rounded-md transition-colors text-sm font-medium ${
							activeTab === "profile"
								? "bg-primary-green/20 text-primary-green" // A lighter shade of primary green for active
								: "text-accent-dark-green hover:bg-accent-light-beige/70"
						}`}
					>
						<FaUser className="mr-3" /> Profile
					</button>

					<button
						onClick={() => setActiveTab("orders")}
						className={`w-full flex items-center px-4 py-2.5 rounded-md transition-colors text-sm font-medium ${
							activeTab === "orders"
								? "bg-primary-green/20 text-primary-green"
								: "text-accent-dark-green hover:bg-accent-light-beige/70"
						}`}
					>
						<FaHistory className="mr-3" /> Order History
					</button>

					{/* Account Settings - Assuming still commented out or to be styled similarly if re-enabled
					<button
						onClick={() => setActiveTab("account")}
						className={`w-full flex items-center px-4 py-2.5 rounded-md transition-colors text-sm font-medium ${
							activeTab === "account"
								? "bg-primary-green/20 text-primary-green"
								: "text-accent-dark-green hover:bg-accent-light-beige/70"
						}`}
					>
						<FaEdit className="mr-3" /> Account Settings
					</button> 
					*/}

					{/* Logout button: Destructive action styling (red text, light red hover bg) */}
					<button
						onClick={handleLogout}
						className="w-full flex items-center px-4 py-2.5 rounded-md text-red-600 hover:bg-red-500/10 transition-colors mt-4 text-sm font-medium"
					>
						<FaSignOutAlt className="mr-3" /> Logout
					</button>
				</nav>
			</div>
		</div>
	);
};

export default Sidebar;
