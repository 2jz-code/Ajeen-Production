// src/pages/Dashboard.jsx
"use client"; // This directive is specific to Next.js App router, can be removed for Vite/React.
// If you intend to use it, ensure your project setup supports it.

import { useState, useEffect } from "react"; // Keep these if Dashboard has specific logic
import { Link } from "react-router-dom"; // Keep Link for NavCard
import PropTypes from "prop-types";

// Icons for NavCard
import {
	ShoppingCart,
	Package,
	Clock,
	CreditCard,
	BarChart3,
	Users,
	Gift,
	Tag,
	Settings as SettingsIconLucide, // Renamed to avoid conflict if Settings component is imported
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card"; // Keep for NavCard
import { Skeleton } from "@/components/ui/skeleton"; // Keep for NavCardSkeleton
import MainLayout from "./layout/MainLayout";
import { authService } from "@/api/services/authService";
import { useCartStore } from "@/store/cartStore";

// NavCard Component (can stay here or be moved to a common components folder)
const NavCard = ({
	to,
	title,
	description,
	icon: Icon,
	color,
	isAdminOnly = false,
	currentUserIsAdmin = false,
}) => {
	if (isAdminOnly && !currentUserIsAdmin) {
		return null;
	}
	return (
		<Link
			to={to}
			className="block h-full"
		>
			<Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 group">
				<CardContent className="p-0">
					<div className="flex h-full flex-col">
						<div className={`h-1.5 w-full ${color}`} />
						<div className="flex flex-1 flex-col p-5">
							<div className="mb-3 flex items-center justify-between">
								<div
									className={`rounded-md p-2 ${color
										.replace("bg-", "bg-")
										.replace("500", "100")} ${color.replace("bg-", "text-")}`}
								>
									<Icon className="h-5 w-5" />
								</div>
								{/* ChevronRight might be better sourced from MainLayout if used there, or keep if specific here */}
								{/* <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /> */}
							</div>
							<h3 className="text-base font-medium">{title}</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								{description}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
};
NavCard.propTypes = {
	to: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
	icon: PropTypes.elementType.isRequired,
	color: PropTypes.string.isRequired,
	isAdminOnly: PropTypes.bool,
	currentUserIsAdmin: PropTypes.bool,
};

const NavCardSkeleton = () => (
	<Card className="h-full overflow-hidden">
		<CardContent className="p-0">
			<div className="flex h-full flex-col">
				<Skeleton className="h-1.5 w-full" />
				<div className="flex flex-1 flex-col p-5">
					<div className="mb-3 flex items-center justify-between">
						<Skeleton className="h-9 w-9 rounded-md" />
						<Skeleton className="h-4 w-4" />
					</div>
					<Skeleton className="mb-2 h-5 w-3/4" />
					<Skeleton className="h-4 w-full" />
				</div>
			</div>
		</CardContent>
	</Card>
);

export default function Dashboard() {
	// Dashboard specific state can remain here if needed.
	// For this example, userStatus is fetched in MainLayout, but if Dashboard
	// needs its own loading/user state for its content, it can have it.
	const [isLoadingContent, setIsLoadingContent] = useState(true); // Example
	const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false); // Example

	// Simulate fetching dashboard-specific data or user role for content display
	useEffect(() => {
		const fetchDashboardData = async () => {
			setIsLoadingContent(true);
			// Simulating a delay and getting admin status (MainLayout handles actual auth)
			const authState =
				useCartStore.getState().userStatus || (await authService.checkStatus());
			setCurrentUserIsAdmin(authState.is_admin);
			setTimeout(() => setIsLoadingContent(false), 500); // Simulate content load
		};
		fetchDashboardData();
	}, []);

	const navItemsForDashboard = [
		// Specific items for the dashboard content
		{
			to: "/pos",
			title: "Point of Sale",
			description: "Process sales and manage transactions",
			icon: ShoppingCart,
			color: "bg-blue-500",
		},
		{
			to: "/products",
			title: "Product Management",
			description: "Manage products, categories, and stock",
			icon: Package,
			color: "bg-indigo-500",
		},
		{
			to: "/orders",
			title: "Order History",
			description: "View past orders and details",
			icon: Clock,
			color: "bg-amber-500",
		},
		{
			to: "/payments",
			title: "Payment Management",
			description: "Track payments and process refunds",
			icon: CreditCard,
			color: "bg-green-500",
		},
		{
			to: "/reports",
			title: "Reports",
			description: "Generate sales and performance reports",
			icon: BarChart3,
			color: "bg-emerald-500",
			adminOnly: true,
		},
		{
			to: "/users",
			title: "User Management",
			description: "Manage staff accounts and permissions",
			icon: Users,
			color: "bg-purple-500",
			adminOnly: true,
		},
		{
			to: "/rewards",
			title: "Rewards Program",
			description: "Configure and manage customer rewards",
			icon: Gift,
			color: "bg-pink-500",
			adminOnly: true,
		},
		{
			to: "/discounts",
			title: "Discounts",
			description: "Create and manage discounts",
			icon: Tag,
			color: "bg-orange-500",
			adminOnly: true,
		},
		{
			to: "/settings",
			title: "Settings",
			description: "Configure system and admin settings",
			icon: SettingsIconLucide,
			color: "bg-slate-500",
			adminOnly: true,
		},
	];

	return (
		<MainLayout pageTitle="Dashboard">
			<div className="mx-auto max-w-6xl">
				<div className="mb-6">
					<h2 className="text-2xl font-semibold tracking-tight">
						Quick Access
					</h2>
					<p className="text-muted-foreground">
						Access all your POS features from one place
					</p>
				</div>
				{isLoadingContent ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{[...Array(6)].map((_, i) => (
							<NavCardSkeleton key={i} />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{navItemsForDashboard.map((item) => (
							<NavCard
								key={item.to}
								to={item.to}
								title={item.title}
								description={item.description}
								icon={item.icon}
								color={item.color}
								isAdminOnly={item.adminOnly}
								currentUserIsAdmin={currentUserIsAdmin}
							/>
						))}
					</div>
				)}
			</div>
		</MainLayout>
	);
}
