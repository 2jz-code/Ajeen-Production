"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

import {
	ShoppingCart,
	Package,
	Clock,
	CreditCard,
	BarChart3,
	Users,
	Gift,
	Tag,
	Settings as SettingsIconLucide,
	Calculator,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MainLayout from "./layout/MainLayout";
import { authService } from "@/api/services/authService"; // Ensured this is the same service as in MainLayout
// import { useCartStore } from "@/store/cartStore"; // Not strictly needed for authState here anymore

// NavCard Component
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
	const [isLoadingContent, setIsLoadingContent] = useState(true);
	const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

	const fetchDashboardData = useCallback(async () => {
		setIsLoadingContent(true);
		try {
			// Always fetch fresh status from the reliable authService
			const freshStatus = await authService.checkStatus();
			if (freshStatus) {
				setCurrentUserIsAdmin(freshStatus.is_admin);
				// Optional: If you want to ensure the Zustand store (useCartStore) is also updated
				// with this fresh status, you would call its setter method here.
				// Example: useCartStore.getState().setUserStatus(freshStatus);
				// This depends on how useCartStore is implemented and if it's intended
				// to be the single source of truth after initial fetch.
			} else {
				// Handle case where checkStatus might return null or undefined
				setCurrentUserIsAdmin(false);
			}
		} catch (error) {
			console.error("Dashboard: Failed to fetch user status:", error);
			setCurrentUserIsAdmin(false); // Default to non-admin on error
		} finally {
			setIsLoadingContent(false); // Set loading to false after async operation completes
		}
	}, []); // No dependencies needed if it only runs on mount

	useEffect(() => {
		fetchDashboardData();
	}, [fetchDashboardData]);

	const navItemsForDashboard = [
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
			adminOnly: true,
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
			to: "/cogs",
			title: "COGS Management",
			description: "Manage item costs and recipes",
			icon: Calculator,
			color: "bg-teal-500",
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
						{[...Array(navItemsForDashboard.length)].map((_, i) => (
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
								currentUserIsAdmin={currentUserIsAdmin} // This will now use the freshly fetched status
							/>
						))}
					</div>
				)}
			</div>
		</MainLayout>
	);
}
