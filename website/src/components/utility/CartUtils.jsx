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
	// ... (previous function body remains the same) ...
	let itemCount = 0;
	let items = [];
	let error = null;
	try {
		const authStatus = await checkAuth();
		let response = null;
		let endpoint = "";

		if (authStatus === "authenticated") {
			endpoint = "website/cart/";
			response = await axiosInstance.get(endpoint);
		} else if (authStatus === "guest") {
			endpoint = "website/guest-cart/";
			response = await axiosInstance.get(endpoint);
		}

		if (response && response.data) {
			items = response.data.items || [];
			itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
		}
	} catch (fetchError) {
		console.error(`Error fetching cart data (final): ${fetchError}`);
		error = fetchError.message || "Failed to fetch cart data.";
		items = [];
		itemCount = 0;
	}
	return { items, itemCount, error };
};

// --- Cart State Hook (Manages count, provides fetcher FOR COUNT) ---
const useCart = (/* isMenuPage is no longer needed here */) => {
	const [cartItemCount, setCartItemCount] = useState(0);
	const [isLoadingCount, setIsLoadingCount] = useState(true);
	const [categories, setCategories] = useState([]);
	const [isLoadingCategories, setIsLoadingCategories] = useState(false);

	const refreshCartCount = useCallback(async () => {
		setIsLoadingCount(true);
		const { itemCount, error } = await fetchCurrentCartData();
		if (error) {
			console.error("useCart/refreshCartCount - Error fetching count:", error);
		}
		setCartItemCount(itemCount);
		setIsLoadingCount(false);
	}, []); // Removed stable setters from deps as they don't change

	const fetchCategories = useCallback(async () => {
		setIsLoadingCategories(true);
		try {
			const response = await axiosInstance.get("products/categories/");
			let fetchedCategories = Array.isArray(response.data) ? response.data : [];

			// **MODIFICATION START: Filter out the "Grocery" category**
			fetchedCategories = fetchedCategories.filter(
				(category) => category.name !== "grocery"
			);
			// **MODIFICATION END**

			setCategories(fetchedCategories);
		} catch (error) {
			console.error("useCart: Failed to fetch categories:", error);
			setCategories([]);
		} finally {
			setIsLoadingCategories(false);
		}
	}, []); // Removed stable setters from deps

	useEffect(() => {
		fetchCategories();
		refreshCartCount();
	}, [fetchCategories, refreshCartCount]);

	return {
		cartItemCount,
		isLoadingCount,
		refreshCartCount,
		categories,
		isLoadingCategories,
		updateCartItemCount: refreshCartCount,
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
