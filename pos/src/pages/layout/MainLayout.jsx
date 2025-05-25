// pos_and_backend/pos/components/layout/MainLayout.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import {
	Activity,
	BarChart3,
	Building2,
	Clock,
	CreditCard,
	Gift,
	LogOut,
	Menu,
	Package,
	Settings,
	ShoppingCart,
	Tag,
	Users,
	X,
	PanelLeftClose,
	PanelLeftOpen,
	Home,
	Calculator, // <-- Import Calculator icon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

import { authService as realAuthService } from "../../api/services/authService";
import { useCartStore } from "../../store/cartStore";
import { cn } from "@/lib/utils";

// SidebarItem Component ( 그대로 )
const SidebarItem = ({
	icon: Icon,
	label,
	href,
	adminOnly = false,
	isAdmin = false,
	isCollapsed = false,
}) => {
	const location = useLocation();
	if (adminOnly && !isAdmin) return null;
	const isActive = location.pathname.startsWith(href);

	return (
		<Link
			to={href}
			title={label}
			className={cn(
				"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
				isActive
					? "bg-primary/10 text-primary font-medium"
					: "text-muted-foreground hover:bg-muted hover:text-foreground",
				isCollapsed && "justify-center"
			)}
		>
			<Icon className="h-4 w-4 flex-shrink-0" />
			{!isCollapsed && <span>{label}</span>}
		</Link>
	);
};
SidebarItem.propTypes = {
	icon: PropTypes.elementType.isRequired,
	label: PropTypes.string.isRequired,
	href: PropTypes.string.isRequired,
	adminOnly: PropTypes.bool,
	isAdmin: PropTypes.bool,
	isCollapsed: PropTypes.bool,
};

// MainLayout Component
const MainLayout = ({ children, pageTitle = "Page" }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;

	const [userStatus, setUserStatus] = useState({
		authenticated: false,
		username: "User",
		is_admin: false,
	});
	const [isLoadingAuth, setIsLoadingAuth] = useState(true);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(
		() => {
			const storedState = localStorage.getItem("desktopSidebarCollapsed");
			return storedState ? JSON.parse(storedState) : false;
		}
	);

	useEffect(() => {
		localStorage.setItem(
			"desktopSidebarCollapsed",
			JSON.stringify(isDesktopSidebarCollapsed)
		);
	}, [isDesktopSidebarCollapsed]);

	useEffect(() => {
		let isMounted = true;
		const fetchUserStatus = async () => {
			setIsLoadingAuth(true);
			try {
				const status = await realAuthService.checkStatus();
				if (isMounted) setUserStatus(status);
			} catch (error) {
				console.error("Failed to fetch user status:", error);
				if (isMounted)
					setUserStatus({
						authenticated: false,
						username: "Error",
						is_admin: false,
					});
			} finally {
				if (isMounted) setIsLoadingAuth(false);
			}
		};
		fetchUserStatus();
		return () => {
			isMounted = false;
		};
	}, []);

	const handleLogout = async () => {
		try {
			await realAuthService.logout();
			useCartStore.getState().clearCart();
			navigate("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	const handleDashboardNavigation = () => {
		if (currentPath !== "/dashboard") {
			navigate("/dashboard");
		}
	};

	const toggleDesktopSidebar = () =>
		setIsDesktopSidebarCollapsed((prev) => !prev);

	const navItems = [
		{ to: "/pos", title: "Point of Sale", icon: ShoppingCart },
		{ to: "/products", title: "Products", icon: Package },
		{ to: "/cogs", title: "COGS", icon: Calculator }, // <-- Added COGS Link
		{ to: "/orders", title: "Orders", icon: Clock },
		{ to: "/payments", title: "Payments", icon: CreditCard },
		{ to: "/reports", title: "Reports", icon: BarChart3, adminOnly: true },
		{ to: "/users", title: "Users", icon: Users, adminOnly: true },
		{ to: "/rewards", title: "Rewards", icon: Gift, adminOnly: true },
		{ to: "/discounts", title: "Discounts", icon: Tag, adminOnly: true },
		{ to: "/settings", title: "Settings", icon: Settings, adminOnly: true },
	];
	const getUserRole = (isAdmin) => (isAdmin ? "Admin" : "Staff");

	if (isLoadingAuth) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-background">
				<p>Loading application...</p>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background">
			<aside
				className={cn(
					"hidden flex-shrink-0 border-r bg-card/50 md:flex md:flex-col transition-all duration-300 ease-in-out",
					isDesktopSidebarCollapsed ? "w-16" : "w-64"
				)}
			>
				<div
					className={cn(
						"flex h-14 items-center border-b px-4",
						isDesktopSidebarCollapsed && "justify-center"
					)}
				>
					<div className="flex items-center gap-2">
						<Building2 className="h-5 w-5 text-primary flex-shrink-0" />
						{!isDesktopSidebarCollapsed && (
							<h1 className="font-semibold">Ajeen POS</h1>
						)}
					</div>
				</div>
				<div className="flex flex-1 flex-col justify-between overflow-y-auto p-4">
					<nav className="space-y-1">
						{navItems.map((item) => (
							<SidebarItem
								key={item.to}
								href={item.to} // Make sure this path matches your App.jsx routes (e.g., "/cogs")
								icon={item.icon}
								label={item.title}
								adminOnly={item.adminOnly}
								isAdmin={userStatus.is_admin}
								isCollapsed={isDesktopSidebarCollapsed}
							/>
						))}
					</nav>
					{!isDesktopSidebarCollapsed && (
						<div className="mt-auto space-y-4 pt-4">
							<div className="rounded-lg border bg-card p-3">
								<div className="flex items-center gap-3">
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
										{userStatus.username?.charAt(0).toUpperCase() || "U"}
									</div>
									<div className="flex-1 overflow-hidden">
										<p className="truncate text-sm font-medium">
											{userStatus.username}
										</p>
										<p className="text-xs text-muted-foreground">
											{getUserRole(userStatus.is_admin)}
										</p>
									</div>
								</div>
							</div>
							<Button
								variant="outline"
								className="w-full justify-start gap-2"
								size="sm"
								onClick={handleLogout}
							>
								<LogOut className="h-4 w-4" />
								<span>Log Out</span>
							</Button>
						</div>
					)}
				</div>
			</aside>

			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex h-14 items-center border-b px-4 md:px-6 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<Sheet
						open={mobileSidebarOpen}
						onOpenChange={setMobileSidebarOpen}
					>
						<SheetTrigger
							asChild
							className="md:hidden"
						>
							<Button
								variant="outline"
								size="icon"
								className="mr-2"
							>
								<Menu className="h-5 w-5" />
								<span className="sr-only">Toggle menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[280px] p-0 md:hidden"
						>
							<SheetHeader className="h-14 border-b px-4">
								<SheetTitle className="flex items-center gap-2">
									<Building2 className="h-5 w-5 text-primary" />
									<span>Ajeen POS</span>
								</SheetTitle>
								<SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
									<X className="h-4 w-4" />
									<span className="sr-only">Close</span>
								</SheetClose>
							</SheetHeader>
							<div
								className="flex flex-col justify-between overflow-y-auto p-4"
								style={{ height: "calc(100% - 3.5rem)" }}
							>
								<nav className="space-y-1">
									{navItems.map((item) => (
										<SidebarItem
											key={item.to}
											href={item.to} // Ensure this path matches App.jsx routes
											icon={item.icon}
											label={item.title}
											adminOnly={item.adminOnly}
											isAdmin={userStatus.is_admin}
											isCollapsed={false}
										/>
									))}
								</nav>
								<div className="mt-auto space-y-4 pt-4">
									<div className="rounded-lg border bg-card p-3">
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
												{userStatus.username?.charAt(0).toUpperCase() || "U"}
											</div>
											<div className="flex-1 overflow-hidden">
												<p className="truncate text-sm font-medium">
													{userStatus.username}
												</p>
												<p className="text-xs text-muted-foreground">
													{getUserRole(userStatus.is_admin)}
												</p>
											</div>
										</div>
									</div>
									<Button
										variant="outline"
										className="w-full justify-start gap-2"
										size="sm"
										onClick={handleLogout}
									>
										<LogOut className="h-4 w-4" />
										<span>Log Out</span>
									</Button>
								</div>
							</div>
						</SheetContent>
					</Sheet>

					<div className="flex flex-1 items-center justify-between">
						<div className="flex items-center gap-3">
							<Button
								variant="outline"
								size="icon"
								onClick={toggleDesktopSidebar}
								className="mr-2 hidden md:inline-flex"
							>
								{isDesktopSidebarCollapsed ? (
									<PanelLeftOpen className="h-5 w-5" />
								) : (
									<PanelLeftClose className="h-5 w-5" />
								)}
								<span className="sr-only">Toggle desktop sidebar</span>
							</Button>
							<h1 className="text-lg font-semibold">{pageTitle}</h1>
						</div>
						<div className="flex items-center gap-3">
							<Button
								variant={currentPath === "/dashboard" ? "secondary" : "ghost"}
								size="icon"
								onClick={handleDashboardNavigation}
								disabled={currentPath === "/dashboard"}
								className="hidden md:inline-flex"
								title="Dashboard"
							>
								<Home className="h-5 w-5" />
								<span className="sr-only">Dashboard</span>
							</Button>
							<div className="flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
								<Activity className="h-3 w-3" />
								<span>Online</span>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="rounded-full h-8 w-8 md:hidden"
									>
										{userStatus.username?.charAt(0).toUpperCase() || "U"}
										<span className="sr-only">User Menu</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="gap-2 hidden md:inline-flex"
									>
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
											{userStatus.username?.charAt(0).toUpperCase() || "U"}
										</div>
										<span>{userStatus.username}</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-56"
								>
									<DropdownMenuLabel>
										<p className="font-medium">{userStatus.username}</p>
										<p className="text-xs text-muted-foreground">
											{getUserRole(userStatus.is_admin)}
										</p>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={handleLogout}>
										<LogOut className="mr-2 h-4 w-4" />
										<span>Log out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</header>

				<main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

				<footer className="flex h-10 items-center justify-between border-t bg-card/50 px-4 text-xs text-muted-foreground md:px-6">
					<span>Version: 1.0.1</span>
					<span>
						{isLoadingAuth
							? "Loading..."
							: `${userStatus.username} (${getUserRole(userStatus.is_admin)})`}
					</span>
				</footer>
			</div>
		</div>
	);
};

MainLayout.propTypes = {
	children: PropTypes.node.isRequired,
	pageTitle: PropTypes.string,
};

export default MainLayout;
