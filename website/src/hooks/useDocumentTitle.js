import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Helper function to determine the title based on the website's pathname
const getTitleFromPathname = (pathname) => {
	const baseTitle = "Ajeen"; // Or "Ajeen Online Ordering", "Your Restaurant Name"
	const segments = pathname.toLowerCase().split("/").filter(Boolean);

	if (segments.length === 0) {
		// Root path (e.g., homepage)
		return `${baseTitle} | Welcome`; // Or "Home", "Online Ordering"
	}

	const page = segments[0];

	switch (page) {
		case "menu":
			// Example: /menu or /menu/category-name or /menu/category-name/product-name
			if (segments[2]) {
				// Product detail within a category
				return `${baseTitle} | Menu | ${decodeURIComponent(
					segments[1]
				)} | ${decodeURIComponent(segments[2])}`;
			}
			if (segments[1]) {
				// Category page
				return `${baseTitle} | Menu | ${decodeURIComponent(segments[1])}`;
			}
			return `${baseTitle} | Our Menu`;
		case "checkout":
			return `${baseTitle} | Secure Checkout`;
		case "confirmation":
			if (segments[1]) {
				// e.g., /confirmation/order-id-123
				return `${baseTitle} | Order Confirmed: ${segments[1]}`;
			}
			return `${baseTitle} | Order Confirmation`;
		case "login":
			return `${baseTitle} | Customer Login`;
		case "register":
			return `${baseTitle} | Create Account`;
		case "dashboard": // User dashboard
			if (segments[1] === "orders") {
				return `${baseTitle} | My Orders`;
			}
			if (segments[1] === "profile") {
				return `${baseTitle} | My Profile`;
			}
			// Add more specific dashboard sections if needed
			return `${baseTitle} | My Account`;
		case "contact": // Example for a contact page
			return `${baseTitle} | Contact Us`;
		case "about": // Example for an about page
			return `${baseTitle} | About Ajeen`;
		// Add more cases for your website's specific pages (FAQ, Blog, etc.)
		default:
			// Fallback for pages not explicitly defined, capitalize the first segment
			const fallbackPageName = page.charAt(0).toUpperCase() + page.slice(1);
			return `${baseTitle} | ${fallbackPageName}`;
	}
};

export const useDocumentTitle = () => {
	const location = useLocation();

	useEffect(() => {
		const title = getTitleFromPathname(location.pathname);
		document.title = title;
		// Optional: For accessibility, you might also want to announce the title change to screen readers
		// This often requires a more complex setup with a live region.
	}, [location.pathname]); // Re-run this effect whenever the pathname changes
};
