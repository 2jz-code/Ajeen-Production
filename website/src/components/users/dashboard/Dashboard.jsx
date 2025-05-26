// src/components/dashboard/Dashboard.jsx
import React from "react";
// import Banner from "../../ui/Banner"; // Assuming Navbar replaces Banner, or Banner needs separate styling
import Navbar from "../../Navbar"; // Using the already styled Navbar
import { DashboardProvider, useDashboard } from "./DashboardContext";
import Sidebar from "./Sidebar";
import ProfileTab from "./ProfileTab";
import OrdersTab from "./OrdersTab";
// import AccountTab from "./AccountTab"; // Assuming this is still commented out

const Dashboard = () => {
	return (
		<DashboardProvider>
			<DashboardContent />
		</DashboardProvider>
	);
};

// Separate component that uses the context
const DashboardContent = () => {
	const { activeTab, isLoading } = useDashboard();

	return (
		// Main dashboard page background: using the global --background (accent-light-beige)
		<div className="bg-background min-h-screen">
			{/* Use the already styled Navbar component */}
			<Navbar />
			{/* Add some top padding to account for the fixed Navbar */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
				{" "}
				{/* Increased pt-24 */}
				<div className="flex flex-col md:flex-row md:space-x-8">
					{/* Sidebar */}
					<Sidebar />

					{/* Main Content */}
					<div className="flex-1">
						{isLoading ? (
							// Loading state card: using primary-beige bg
							<div className="bg-primary-beige rounded-lg shadow-sm p-8 flex justify-center items-center border border-accent-subtle-gray/50">
								{/* Spinner color: primary-green */}
								<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green"></div>
							</div>
						) : (
							<>
								{activeTab === "profile" && <ProfileTab />}
								{activeTab === "orders" && <OrdersTab />}
								{/* {activeTab === "account" && <AccountTab />} */}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
