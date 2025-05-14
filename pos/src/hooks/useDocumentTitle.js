import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Helper function to determine the title based on the path
const getTitleFromPathname = (pathname) => {
	const baseTitle = "Ajeen POS";

	// Split the pathname into segments to handle dynamic parts
	const segments = pathname.toLowerCase().split("/").filter(Boolean); // filter(Boolean) removes empty strings from leading/trailing slashes

	if (segments.length === 0) {
		// Root path, which now redirects to login
		return `${baseTitle} | Login`;
	}

	const page = segments[0];

	switch (page) {
		case "login":
			return `${baseTitle} | Login`;
		case "dashboard":
			return `${baseTitle} | Dashboard`;
		case "pos":
			return `${baseTitle} | Point of Sale`;
		case "products":
			if (segments[1] === "add") {
				return `${baseTitle} | Products | Add New`;
			}
			if (segments[1] === "edit" && segments[2]) {
				return `${baseTitle} | Products | Edit ${decodeURIComponent(
					segments[2]
				)}`;
			}
			if (
				segments.length > 1 &&
				segments[1] !== "add" &&
				segments[1] !== "edit"
			) {
				return `${baseTitle} | Products | ${decodeURIComponent(segments[1])}`;
			}
			return `${baseTitle} | Products`;
		case "orders":
			if (segments.length > 1) {
				return `${baseTitle} | Orders | Details ${segments[1]}`;
			}
			return `${baseTitle} | Orders`;
		case "kitchen":
			return `${baseTitle} | Kitchen Display`;
		case "payments":
			if (segments.length > 1) {
				return `${baseTitle} | Payments | Details ${segments[1]}`;
			}
			return `${baseTitle} | Payments`;
		case "reports":
			return `${baseTitle} | Reports`;
		case "users":
			if (segments[1] === "add") {
				return `${baseTitle} | Users | Add New`;
			}
			if (segments[1] === "edit" && segments[2]) {
				return `${baseTitle} | Users | Edit User ${segments[2]}`;
			}
			if (
				segments.length > 1 &&
				segments[1] !== "add" &&
				segments[1] !== "edit"
			) {
				return `${baseTitle} | Users | Details ${segments[1]}`;
			}
			return `${baseTitle} | User Management`;
		case "settings":
			return `${baseTitle} | Settings`;
		case "discounts":
			if (segments[1] === "create") {
				return `${baseTitle} | Discounts | Create`;
			}
			if (segments[1] === "edit" && segments[2]) {
				return `${baseTitle} | Discounts | Edit Discount ${segments[2]}`;
			}
			return `${baseTitle} | Discounts`;
		case "rewards":
			if (segments[1] === "reward-items") {
				return `${baseTitle} | Rewards | Items`;
			}
			if (segments[1] === "rules") {
				return `${baseTitle} | Rewards | Points Rules`;
			}
			if (segments[1] === "verify") {
				return `${baseTitle} | Rewards | Verify Redemption`;
			}
			return `${baseTitle} | Rewards Dashboard`;
		default:
			return baseTitle; // Fallback to the base title
	}
};

export const useDocumentTitle = () => {
	const location = useLocation();

	useEffect(() => {
		const title = getTitleFromPathname(location.pathname);
		document.title = title;
	}, [location.pathname]); // Re-run this effect whenever the pathname changes
};
