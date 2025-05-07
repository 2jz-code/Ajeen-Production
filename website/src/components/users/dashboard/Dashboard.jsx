// src/components/dashboard/Dashboard.jsx
import React from "react";
import Banner from "../../ui/Banner";
import { DashboardProvider, useDashboard } from "./DashboardContext"; // Add useDashboard import
import Sidebar from "./Sidebar";
import ProfileTab from "./ProfileTab";
import OrdersTab from "./OrdersTab";
import AccountTab from "./AccountTab";

const Dashboard = () => {
	return (
		<DashboardProvider>
			<DashboardContent />
		</DashboardProvider>
	);
};

// Separate component that uses the context
const DashboardContent = () => {
	const { activeTab, isLoading } = useDashboard(); // Now this will work

	return (
		<div className="bg-gray-50 min-h-screen">
			<Banner />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex flex-col md:flex-row md:space-x-8">
					{/* Sidebar */}
					<Sidebar />

					{/* Main Content */}
					<div className="flex-1">
						{isLoading ? (
							<div className="bg-white rounded-lg shadow-sm p-8 flex justify-center items-center">
								<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
							</div>
						) : (
							<>
								{activeTab === "profile" && <ProfileTab />}
								{activeTab === "orders" && <OrdersTab />}
								{activeTab === "account" && <AccountTab />}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
