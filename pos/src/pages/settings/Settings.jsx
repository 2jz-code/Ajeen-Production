import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { authService } from "../../api/services/authService";
import LocationManagement from "./LocationManagement";
import PaymentTerminalSettings from "./PaymentTerminalSettings";
import SecuritySettings from "./SecuritySettings";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import {
	MapPin,
	CreditCard,
	ShieldCheck,
	// Settings as SettingsIcon, // SettingsIcon from lucide-react was defined but not used
} from "lucide-react";
import { toast } from "react-toastify";
import MainLayout from "../layout/MainLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Import the cn utility

// Helper component for sidebar navigation items within Settings
const SettingsNavItem = ({ icon: Icon, label, isActive, onClick }) => (
	<Button
		variant={isActive ? "secondary" : "ghost"}
		className={cn(
			// Use cn here
			"w-full justify-start text-sm",
			isActive ? "font-semibold" : "text-muted-foreground"
		)}
		onClick={onClick}
	>
		<Icon className="mr-2 h-4 w-4" />
		{label}
	</Button>
);

SettingsNavItem.propTypes = {
	icon: PropTypes.elementType.isRequired,
	label: PropTypes.string.isRequired,
	isActive: PropTypes.bool.isRequired,
	onClick: PropTypes.func.isRequired,
};

export default function Settings() {
	const [isAdmin, setIsAdmin] = useState(false);
	const [activeTab, setActiveTab] = useState("locations");
	const [isLoadingAuth, setIsLoadingAuth] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		const checkAdminStatus = async () => {
			setIsLoadingAuth(true);
			try {
				const authResponse = await authService.checkStatus();
				if (!authResponse.is_admin) {
					toast.error("Access Denied: Administrator rights required.");
					navigate("/dashboard");
				} else {
					setIsAdmin(true);
				}
			} catch (error) {
				console.error("Error checking admin status:", error);
				toast.error("Authentication error. Redirecting...");
				navigate("/dashboard");
			} finally {
				setIsLoadingAuth(false);
			}
		};
		checkAdminStatus();
	}, [navigate]);

	const tabContent = {
		locations: <LocationManagement />,
		payment: <PaymentTerminalSettings />,
		security: <SecuritySettings />,
	};

	const navItems = [
		{ key: "locations", label: "Locations", icon: MapPin },
		{ key: "payment", label: "Payment Terminals", icon: CreditCard },
		{ key: "security", label: "Security", icon: ShieldCheck },
	];

	if (isLoadingAuth) {
		return (
			<MainLayout pageTitle="Loading Settings...">
				<div className="flex h-full items-center justify-center">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}

	if (!isAdmin) {
		return (
			<MainLayout pageTitle="Access Denied">
				<div className="flex h-full items-center justify-center p-6 text-center">
					<p className="text-red-600">
						You do not have permission to view this page.
					</p>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle="System Settings">
			<div className="flex flex-col md:flex-row gap-6 lg:gap-8 h-full">
				<aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
					<div className="p-4 bg-card rounded-lg border shadow-sm">
						<h2 className="text-lg font-semibold text-foreground mb-4 px-2">
							Categories
						</h2>
						<nav className="space-y-1">
							{navItems.map((item) => (
								<SettingsNavItem
									key={item.key}
									icon={item.icon}
									label={item.label}
									isActive={activeTab === item.key}
									onClick={() => setActiveTab(item.key)}
								/>
							))}
						</nav>
					</div>
				</aside>

				<main className="flex-1 overflow-y-auto">
					<div className="bg-card rounded-lg border shadow-sm h-full">
						{tabContent[activeTab]}
					</div>
				</main>
			</div>
		</MainLayout>
	);
}
