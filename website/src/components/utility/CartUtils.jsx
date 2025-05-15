// Rewritten frontend-website/components/utility/CartUtils.jsx

import { useState, useEffect, useCallback } from "react";
import axiosInstance, {
	// keep clearTokensAndLogout in case interceptor needs it or for explicit logout actions
	clearTokensAndLogout,
	checkAuth,
} from "../../api/api";
import { toast } from "react-toastify";

// --- Central Cart Data Fetcher ---
// This function fetches data and updates state using passed setters.
// It handles both authenticated and guest users.
export const fetchCurrentCartData = async () => {
	// ... (Function remains the same - fetches auth or guest cart and returns { items, itemCount, error }) ...
	let itemCount = 0;
	let items = [];
	let error = null;
	// console.log("fetchCurrentCartData: Starting fetch...");
	try {
		const authStatus = await checkAuth();
		let response = null;
		let endpoint = "";

		if (authStatus === "authenticated") {
			endpoint = "website/cart/";
			// console.log("fetchCurrentCartData: Fetching authenticated cart...");
			response = await axiosInstance.get(endpoint);
		} else if (authStatus === "guest") {
			endpoint = "website/guest-cart/";
			// console.log("fetchCurrentCartData: Fetching guest cart...");
			response = await axiosInstance.get(endpoint);
		} else {
			// console.log(
			// 	`WorkspaceCurrentCartData: Auth status is ${authStatus}. Cart is empty or inaccessible.`
			// );
		}

		if (response && response.data) {
			// console.log(
			// 	`WorkspaceCurrentCartData: Raw response data from ${endpoint}:`,
			// 	JSON.stringify(response.data)
			// );
			items = response.data.items || [];
			itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
			// console.log(
			// 	"fetchCurrentCartData: Calculated itemCount:",
			// 	itemCount,
			// 	"from items array length:",
			// 	items.length
			// );
		} else if (authStatus === "authenticated" || authStatus === "guest") {
			// console.log(
			// 	`WorkspaceCurrentCartData: No data received for status ${authStatus}, setting empty cart.`
			// );
		}
	} catch (fetchError) {
		console.error(`Error fetching cart data (final): ${fetchError}`);
		error = fetchError.message || "Failed to fetch cart data.";
		items = [];
		itemCount = 0;
	}
	// console.log("fetchCurrentCartData: Returning:", {
	// 	itemCount: itemCount,
	// 	itemsLength: items.length,
	// 	error: error,
	// });
	return { items, itemCount, error };
};

// --- Cart State Hook (Manages count, provides fetcher FOR COUNT) ---
const useCart = (/* isMenuPage is no longer needed here */) => {
	const [cartItemCount, setCartItemCount] = useState(0);
	const [isLoadingCount, setIsLoadingCount] = useState(true);
	const [categories, setCategories] = useState([]);
	const [isLoadingCategories, setIsLoadingCategories] = useState(false);

	// Fetches cart data and updates ONLY the count state within this hook
	const refreshCartCount = useCallback(async () => {
		// ... (refreshCartCount function remains the same as previous version with logging) ...
		// console.log("useCart/refreshCartCount: CALLED. Fetching data...");
		setIsLoadingCount(true);
		const { itemCount, error } = await fetchCurrentCartData();
		if (error) {
			console.error("useCart/refreshCartCount - Error fetching count:", error);
		}
		// console.log(
		// 	"useCart/refreshCartCount: Received itemCount:",
		// 	itemCount,
		// 	". Calling setCartItemCount..."
		// );
		setCartItemCount(itemCount);
		setIsLoadingCount(false);
		// console.log("useCart/refreshCartCount: State update called.");
	}, []);

	// --- Category Fetching Logic ---
	const fetchCategories = useCallback(async () => {
		// Wrap in useCallback
		// console.log("useCart: Fetching categories..."); // Add log
		setIsLoadingCategories(true);
		try {
			const response = await axiosInstance.get("products/categories/"); // Ensure endpoint is correct
			// console.log("useCart: Categories response received:", response.data);
			setCategories(Array.isArray(response.data) ? response.data : []); // Ensure it's an array
		} catch (error) {
			console.error("useCart: Failed to fetch categories:", error);
			setCategories([]); // Set empty on error
		} finally {
			setIsLoadingCategories(false);
			// console.log("useCart: Finished fetching categories.");
		}
	}, []); // Empty dependency array, fetchCategories reference is stable

	// Fetch initial data when the hook mounts
	useEffect(() => {
		// --- FIX: Removed the if (isMenuPage) condition ---
		// console.log(
		// 	"useCart: useEffect running - fetching categories and initial count."
		// );
		fetchCategories();
		refreshCartCount(); // Fetch initial count regardless of page
		// --- End FIX ---
	}, [fetchCategories, refreshCartCount]); // Depend on the stable callbacks

	// Provide state and the refresh function
	return {
		cartItemCount,
		isLoadingCount,
		refreshCartCount, // Provide function to refresh the count state
		categories,
		isLoadingCategories,
		updateCartItemCount: refreshCartCount, // Alias
	};
};

export default useCart;

// --- Standalone Utility Functions ---

// Function to add a product to the cart
export const addToCart = async (productId, quantity, onCartUpdate) => {
	const data = { product_id: productId, quantity };
	try {
		// console.log(
		// 	`addToCart: Attempting POST (product: ${productId}, qty: ${quantity})`
		// );
		const response = await axiosInstance.post("website/cart/", data);
		// console.log("addToCart: API POST successful:", response.data);

		if (onCartUpdate) {
			// --- ADD LOG ---
			// console.log("addToCart: Calling onCartUpdate callback...");
			await onCartUpdate(); // This should trigger refreshCartCount
			// console.log("addToCart: onCartUpdate callback finished.");
		} else {
			console.warn("addToCart: No onCartUpdate callback provided.");
		}
		return response.data;
	} catch (error) {
		console.error("addToCart: Error adding product (final error):", error);
		toast.error("Failed to add product to cart. Please try again.");
		throw error;
	}
};

// Function to remove an item from the cart
export const removeItemFromCart = async (itemId, onCartUpdate) => {
	try {
		// console.log(`removeItemFromCart: Attempting DELETE for item ${itemId}`);
		await axiosInstance.delete(`website/cart/items/${itemId}/remove/`);
		// console.log(
		// 	`removeItemFromCart: Item ${itemId} removed successfully via API.`
		// );

		if (onCartUpdate) {
			// --- ADD LOG ---
			// console.log("removeItemFromCart: Calling onCartUpdate callback...");
			await onCartUpdate(); // This should trigger refreshCartCount
			// console.log("removeItemFromCart: onCartUpdate callback finished.");
		} else {
			console.warn("removeItemFromCart: No onCartUpdate callback provided.");
		}
	} catch (error) {
		console.error(
			"removeItemFromCart: Error removing item (final error):",
			error
		);
		toast.error("Failed to remove item from cart.");
		throw error;
	}
};

// --- fetchProducts function (No changes needed from previous version) ---
export const fetchProducts = async (
	setProducts,
	setQuantities,
	setIsLoading
) => {
	try {
		setIsLoading(true);
		const response = await axiosInstance.get("website/products/");
		const normalizedProducts = response.data.map(normalizeProductData);
		setProducts(normalizedProducts);
		const initialQuantities = {};
		normalizedProducts.forEach((product) => {
			initialQuantities[product.id] = 1;
		});
		setQuantities(initialQuantities);
	} catch (error) {
		console.error("Error fetching products (final error):", error);
	} finally {
		setIsLoading(false);
	}
};

// --- Helper functions (normalizeProductData, groupByCategory, incrementQuantity, decrementQuantity) ---
// Assuming no changes needed

export const normalizeProductData = (product) => {
	return {
		...product,
		category: product.category
			? Array.isArray(product.category)
				? product.category
				: [product.category]
			: [],
		price:
			typeof product.price === "string"
				? parseFloat(product.price)
				: product.price,
	};
};

export const groupByCategory = (products) => {
	return products.reduce((acc, product) => {
		let categoryName = "Uncategorized";
		if (product.category && !Array.isArray(product.category)) {
			categoryName = product.category.name || "Uncategorized";
		} else if (
			product.category &&
			Array.isArray(product.category) &&
			product.category.length > 0
		) {
			categoryName = product.category[0].name || "Uncategorized";
		}
		if (!acc[categoryName]) acc[categoryName] = [];
		acc[categoryName].push(product);
		return acc;
	}, {});
};

export const incrementQuantity = (productId, quantities, setQuantities) => {
	setQuantities((prev) => ({
		...prev,
		[productId]: Math.min((prev[productId] || 1) + 1, 10),
	}));
};

export const decrementQuantity = (productId, quantities, setQuantities) => {
	setQuantities((prev) => ({
		...prev,
		[productId]: Math.max((prev[productId] || 2) - 1, 1),
	}));
};

// --- fetchCartItems is removed - use fetchCurrentCartData from useCart hook or pass it down ---
