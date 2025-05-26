// src/pages/layout/POSLayout.jsx
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
	Calculator,
	Home,
	Search as SearchIcon, // Renamed to avoid conflict
	User as UserIcon, // Renamed
	Hash as HashIcon, // Renamed
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // For search
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
import axiosInstance from "../../api/config/axiosConfig"; // For fetching categories
import { ENDPOINTS } from "../../api/config/apiEndpoints";
import { toast } from "react-toastify";

// SidebarItem Component (Same as in MainLayout)
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

// POSLayout Component
const POSLayout = ({
	children,
	searchQuery,
	onSearchChange,
	selectedCategory,
	onCategoryChange,
	isFetchingProductByBarcode, // To disable inputs
}) => {
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;

	// --- States from MainLayout ---
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

	// --- POSLayout specific state ---
	const [categories, setCategoriesPOS] = useState([]); // Renamed to avoid conflict if MainLayout also had categories

	// Cart data for footer
	const orderId = useCartStore((state) => state.orderId);
	const cart = useCartStore((state) => state.cart);

	useEffect(() => {
		localStorage.setItem(
			"desktopSidebarCollapsed",
			JSON.stringify(isDesktopSidebarCollapsed)
		);
	}, [isDesktopSidebarCollapsed]);

	useEffect(() => {
		let isMounted = true;
		const fetchUserAndCategories = async () => {
			setIsLoadingAuth(true);
			try {
				const [status, categoriesData] = await Promise.all([
					realAuthService.checkStatus(),
					axiosInstance.get(ENDPOINTS.PRODUCTS.CATEGORIES),
				]);
				if (isMounted) {
					setUserStatus(status);
					setCategoriesPOS(categoriesData.data || []);
				}
			} catch (error) {
				console.error("Failed to fetch initial POSLayout data:", error);
				if (isMounted) {
					setUserStatus({
						authenticated: false,
						username: "Error",
						is_admin: false,
					});
					toast.error("Could not load categories for POS.");
				}
			} finally {
				if (isMounted) setIsLoadingAuth(false);
			}
		};
		fetchUserAndCategories();
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
		{ to: "/orders", title: "Orders", icon: Clock },
		{ to: "/payments", title: "Payments", icon: CreditCard, adminOnly: true },
		{ to: "/reports", title: "Reports", icon: BarChart3, adminOnly: true },
		{ to: "/cogs", title: "COGS", icon: Calculator, adminOnly: true }, // <-- Added COGS Link
		{ to: "/users", title: "Users", icon: Users, adminOnly: true },
		{ to: "/rewards", title: "Rewards", icon: Gift, adminOnly: true },
		{ to: "/discounts", title: "Discounts", icon: Tag, adminOnly: true },
		{ to: "/settings", title: "Settings", icon: Settings, adminOnly: true },
	];
	const getUserRole = (isAdmin) => (isAdmin ? "Admin" : "Staff");

	if (isLoadingAuth) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
				<p>Loading POS Interface...</p> {/* POS Specific Loading */}
			</div>
		);
	}

	return (
		<div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
			{" "}
			{/* POS Specific BG */}
			{/* Desktop Sidebar (same as MainLayout) */}
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
								href={item.to}
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
			{/* Main POS Area */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* POS Specific Header */}
				<header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/50 shadow-sm flex-shrink-0">
					<div className="px-4 md:px-6 py-3">
						{" "}
						{/* Adjusted padding */}
						<div className="flex items-center justify-between">
							{/* Left side: Mobile menu, Desktop sidebar toggle, POS Title */}
							<div className="flex items-center gap-2">
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
										{/* Mobile Sidebar Content (same as MainLayout) */}
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
														href={item.to}
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
															{userStatus.username?.charAt(0).toUpperCase() ||
																"U"}
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
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
										<Package className="h-5 w-5 text-primary-foreground" />
									</div>
									<h1 className="text-xl font-bold text-foreground">
										Ajeen POS
									</h1>
								</div>
							</div>

							{/* Center: Search Bar */}
							<div className="flex-1 max-w-sm mx-auto">
								{" "}
								{/* Adjusted max-width and centering */}
								<div className="relative">
									<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										type="text"
										placeholder="Search or scan barcode..."
										value={searchQuery}
										onChange={onSearchChange}
										className="pl-10 h-10 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 focus:bg-background transition-colors"
										disabled={isFetchingProductByBarcode}
									/>
									{/* You might want to add a loading indicator for barcode fetching here if needed */}
								</div>
							</div>

							{/* Right side: User actions */}
							<div className="flex items-center gap-2">
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
								<div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
									<Activity className="h-3 w-3" />
									<span>Online</span>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="rounded-full h-9 w-9 md:hidden"
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
					</div>
					{/* Category Filters */}
					<div className="px-4 md:px-6 py-2 border-t border-slate-200/50">
						<div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
							<Button
								variant={selectedCategory === "" ? "default" : "ghost"}
								size="sm"
								onClick={() => onCategoryChange("")}
								disabled={isFetchingProductByBarcode}
								className="whitespace-nowrap h-8 px-3"
							>
								All Products
							</Button>
							{(categories || []).map((category) => (
								<Button
									key={category.id || category.name} // Ensure key is unique
									variant={
										selectedCategory === category.name ? "default" : "ghost"
									}
									size="sm"
									onClick={() => onCategoryChange(category.name)}
									disabled={isFetchingProductByBarcode}
									className="whitespace-nowrap h-8 px-3"
								>
									{category.name}
								</Button>
							))}
						</div>
					</div>
				</header>

				{/* Main Content (Product Grid & Cart) */}
				<main className="flex-1 flex flex-row overflow-hidden">{children}</main>

				{/* POS Specific Footer / Status Bar */}
				<footer className="flex-shrink-0 bg-slate-800 text-white px-4 md:px-6 py-2.5 flex items-center justify-between text-sm border-t border-slate-700">
					<div className="flex items-center gap-4 md:gap-6">
						<div className="flex items-center gap-1.5">
							<HashIcon className="h-4 w-4" />
							<span>Order: {orderId || "New"}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<ShoppingCart className="h-4 w-4" />
							<span>Items: {cart.length}</span>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<UserIcon className="h-4 w-4" />
						<span>Cashier: {userStatus.username || "N/A"}</span>
					</div>
				</footer>
			</div>
		</div>
	);
};

POSLayout.propTypes = {
	children: PropTypes.node.isRequired,
	searchQuery: PropTypes.string.isRequired,
	onSearchChange: PropTypes.func.isRequired,
	selectedCategory: PropTypes.string.isRequired,
	onCategoryChange: PropTypes.func.isRequired,
	isFetchingProductByBarcode: PropTypes.bool.isRequired,
};

export default POSLayout;
