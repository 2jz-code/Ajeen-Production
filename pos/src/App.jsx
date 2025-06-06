import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
} from "react-router-dom"; // Added Navigate
import { Suspense, lazy } from "react";
import { useEffect, useRef } from "react";
import customerDisplayManager from "./features/customerDisplay/utils/windowManager";
import POS from "./pages/POS";
import Dashboard from "./pages";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Products from "./pages/products/Products";
import ProductDetail from "./pages/products/ProductDetail";
import AddProduct from "./pages/products/AddProduct";
import EditProduct from "./pages/products/EditProduct";
import "./index.css";
import Orders from "./pages/orders/Orders";
import OrderDetails from "./pages/orders/OrderDetails";
import Payments from "./pages/payments/Payments";
import PaymentDetails from "./pages/payments/PaymentDetails";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Reports from "./pages/reports/Reports";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";
import CustomerDisplayApp from "./features/customerDisplay/components/CustomerDisplay";
import { CustomerDisplayProvider } from "./features/customerDisplay/contexts/CustomerDisplayProvider";
import { useCustomerDisplayNavigation } from "./features/customerDisplay/hooks/useCustomerDisplayNavigation";
import TerminalSimulation from "./features/customerDisplay/components/terminal/TerminalSimulation";
import { TerminalSimulationProvider } from "./features/customerDisplay/contexts/TerminalSimulationProvider";
import Users from "./pages/users/Users";
import AddUser from "./pages/users/AddUser";
import EditUser from "./pages/users/EditUser";
import UserDetail from "./pages/users/UserDetail";
import Settings from "./pages/settings/Settings";
import RewardsDashboard from "./pages/rewards/RewardsDashboard";
import RewardItems from "./pages/rewards/RewardItems";
import PointsRules from "./pages/rewards/PointsRules";
import VerifyRedemption from "./pages/rewards/VerifyRedemption";
import TerminalProvider from "./features/payment/contexts/TerminalProvider";
import DiscountList from "./pages/discounts/DiscountList";
import DiscountForm from "./pages/discounts/DiscountForm";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import RestockPage from "./pages/products/RestockPage";

const MY_LIVE_READER_ID = import.meta.env.MY_LIVE_READER_ID;

// Lazy load COGS pages
const CogsDashboardPage = lazy(() => import("./pages/cogs/CogsDashboardPage"));
const UnitsOfMeasurePage = lazy(() =>
	import("./pages/cogs/UnitsOfMeasurePage")
);
const InventoryItemsPage = lazy(() =>
	import("./pages/cogs/InventoryItemsPage")
);
const InventoryItemFormPage = lazy(() =>
	import("./pages/cogs/InventoryItemFormPage")
);
const RecipesPage = lazy(() => import("./pages/cogs/RecipesPage"));
const RecipeFormPage = lazy(() => import("./pages/cogs/RecipeFormPage"));
const ProductCogsDefinitionsPage = lazy(() =>
	import("./pages/cogs/ProductCogsDefinitionsPage")
);
const ProductCogsDefinitionFormPage = lazy(() =>
	import("./pages/cogs/ProductCogsDefinitionFormPage")
);

window.customerDisplayManager = customerDisplayManager;

function App() {
	const displayInitialized = useRef(false);

	// Check if we're in customer display or terminal simulation mode
	const urlParams = new URLSearchParams(window.location.search);
	const mode = urlParams.get("mode");
	const isCustomerDisplay = mode === "customer-display";
	const isTerminalSimulation = mode === "terminal-simulation";

	useEffect(() => {
		// Only initialize the customer display if this is the main window (not a special mode)
		// and it hasn't been initialized yet
		if (
			!isCustomerDisplay &&
			!isTerminalSimulation &&
			!displayInitialized.current
		) {
			displayInitialized.current = true;
			customerDisplayManager.openWindow();
		}
	}, [isCustomerDisplay, isTerminalSimulation]);

	// In src/pages/POS.jsx or src/App.jsx
	useEffect(() => {
		const mainElement = document.body; // Or a specific element for the POS screen

		let touchTimeout;

		const handleTouchStart = () => {
			mainElement.classList.add("touch-active-hide-cursor");
			clearTimeout(touchTimeout); // Clear any existing timeout
		};

		const handleTouchEnd = () => {
			// Optionally, keep cursor hidden for a short period after touch ends
			touchTimeout = setTimeout(() => {
				mainElement.classList.remove("touch-active-hide-cursor");
			}, 500); // Adjust delay as needed, or remove timeout to show cursor immediately
		};

		const handleMouseMove = () => {
			// If a mouse move is detected, ensure the cursor is visible
			clearTimeout(touchTimeout);
			mainElement.classList.remove("touch-active-hide-cursor");
		};

		// Add event listeners
		mainElement.addEventListener("touchstart", handleTouchStart, {
			passive: true,
		});
		mainElement.addEventListener("touchend", handleTouchEnd, { passive: true });
		mainElement.addEventListener("touchcancel", handleTouchEnd, {
			passive: true,
		});
		mainElement.addEventListener("mousemove", handleMouseMove, {
			passive: true,
		});

		// Cleanup
		return () => {
			mainElement.removeEventListener("touchstart", handleTouchStart);
			mainElement.removeEventListener("touchend", handleTouchEnd);
			mainElement.removeEventListener("touchcancel", handleTouchEnd);
			mainElement.removeEventListener("mousemove", handleMouseMove);
			clearTimeout(touchTimeout);
			mainElement.classList.remove("touch-active-hide-cursor"); // Ensure class is removed on unmount
		};
	}, []); // Empty dependency array means this runs once on mount and cleans up on unmount

	// If we're in terminal simulation mode, render the terminal component
	if (isTerminalSimulation) {
		return (
			<TerminalSimulation
				onPaymentResult={(result) => {
					// Send result back to main window
					if (window.opener) {
						window.opener.postMessage(
							{
								type: "PAYMENT_RESULT",
								content: result,
							},
							"*"
						);
					}
				}}
			/>
		);
	}

	// If we're in customer display mode, render the customer display app
	if (isCustomerDisplay) {
		return (
			<TerminalSimulationProvider>
				<CustomerDisplayApp />
			</TerminalSimulationProvider>
		);
	}

	// Otherwise render the main POS application
	return (
		<TerminalProvider liveReaderId={MY_LIVE_READER_ID}>
			<WebSocketProvider>
				<CustomerDisplayProvider>
					<TerminalSimulationProvider>
						<Suspense fallback={<div>Loading Page...</div>}>
							<Router>
								<AppContent />
							</Router>
						</Suspense>
					</TerminalSimulationProvider>
				</CustomerDisplayProvider>
			</WebSocketProvider>
		</TerminalProvider>
	);
}

// Separate component to use router hooks
function AppContent() {
	// Use our custom hook to manage customer display based on navigation
	useCustomerDisplayNavigation();
	useDocumentTitle();
	return (
		<div className="w-full h-screen flex flex-col">
			<div className="flex-grow">
				<Routes>
					<Route
						path="/"
						element={
							<Navigate
								to="/login"
								replace
							/>
						}
					/>
					{/* Public Route (Login) */}
					<Route
						path="/login"
						element={<Login />}
					/>

					{/* Protected routes */}
					<Route element={<ProtectedRoute />}>
						<Route
							path="/dashboard"
							element={<Dashboard />}
						/>
						<Route
							path="/pos"
							element={<POS />}
						/>
						<Route
							path="/products"
							element={<Products />}
						/>
						<Route
							path="/products/add"
							element={<AddProduct />}
						/>
						<Route
							path="/products/:name"
							element={<ProductDetail />}
						/>
						<Route
							path="/products/edit/:name"
							element={<EditProduct />}
						/>
						<Route
							path="products/bulk-restock"
							element={<RestockPage />}
						/>{" "}
						{/* <-- Add route */}
						<Route
							path="/orders"
							element={<Orders />}
						/>
						<Route
							path="/orders/:orderId"
							element={<OrderDetails />}
						/>
						<Route
							path="/kitchen"
							element={<KitchenDisplay />}
						/>
						<Route
							path="/payments"
							element={<Payments />}
						/>
						<Route
							path="/payments/:paymentId"
							element={<PaymentDetails />}
						/>
						<Route
							path="/reports"
							element={<Reports />}
						/>
					</Route>

					{/* New COGS Routes - Top Level with MainLayout */}
					<Route
						path="/cogs"
						element={<CogsDashboardPage />}
					/>
					<Route
						path="/cogs/units-of-measure"
						element={<UnitsOfMeasurePage />}
					/>
					<Route
						path="/cogs/inventory-items"
						element={<InventoryItemsPage />}
					/>
					<Route
						path="/cogs/inventory-items/new"
						element={<InventoryItemFormPage />}
					/>
					<Route
						path="/cogs/inventory-items/edit/:itemId"
						element={<InventoryItemFormPage />}
					/>
					<Route
						path="/cogs/recipes"
						element={<RecipesPage />}
					/>
					<Route
						path="/cogs/recipes/new"
						element={<RecipeFormPage />}
					/>
					<Route
						path="/cogs/recipes/edit/:recipeId"
						element={<RecipeFormPage />}
					/>
					<Route
						path="/cogs/product-definitions"
						element={<ProductCogsDefinitionsPage />}
					/>
					<Route
						path="/cogs/product-definitions/new"
						element={<ProductCogsDefinitionFormPage />}
					/>
					<Route
						path="/cogs/product-definitions/edit/:definitionId"
						element={<ProductCogsDefinitionFormPage />}
					/>
					<Route
						path="/cogs/product-definitions/product/:productId"
						element={<ProductCogsDefinitionFormPage mode="product" />}
					/>

					{/* New User Management Routes */}
					<Route
						path="/users"
						element={<Users />}
					/>
					<Route
						path="/users/add"
						element={<AddUser />}
					/>
					<Route
						path="/users/edit/:userId"
						element={<EditUser />}
					/>
					<Route
						path="/users/:userId"
						element={<UserDetail />}
					/>
					<Route
						path="/settings"
						element={<Settings />}
					/>
					<Route
						path="/discounts"
						element={<DiscountList />}
					/>
					<Route
						path="/discounts/create"
						element={<DiscountForm />}
					/>
					<Route
						path="/discounts/edit/:id"
						element={<DiscountForm />}
					/>
					<Route
						path="/rewards"
						element={<RewardsDashboard />}
					/>
					<Route
						path="/rewards/reward-items"
						element={<RewardItems />}
					/>
					<Route
						path="/rewards/rules"
						element={<PointsRules />}
					/>
					<Route
						path="/rewards/verify"
						element={<VerifyRedemption />}
					/>
				</Routes>
			</div>
			<ToastContainer
				position="bottom-left"
				autoClose={1000} // Auto-close after 1 second
				hideProgressBar={false}
				newestOnTop={false} // Usually true is preferred if limit > 1, but with limit=1 it matters less.
				closeOnClick
				rtl={false}
				pauseOnFocusLoss={false} // Do not pause when window loses focus
				draggable // Allow dragging
				pauseOnHover={false} // Do not pause on hover
				theme="light" // Or "dark" or "colored"
				limit={1} // Only one toast visible at a time, new replaces old
				// Removed transition="Bounce" to use the default Bounce transition.
				// If you want a specific transition like Slide, Zoom, or Flip,
				// import it from 'react-toastify' and use transition={Slide}.
			/>
		</div>
	);
}

export default App;
