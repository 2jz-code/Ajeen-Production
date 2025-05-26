// src/components/dashboard/utils/formatters.js

// Format price for display
export const formatPrice = (price) => {
	if (price === null || price === undefined) {
		return "0.00";
	}

	const numericPrice = typeof price === "string" ? parseFloat(price) : price;

	if (isNaN(numericPrice)) {
		return "0.00";
	}

	return numericPrice.toFixed(2);
};

// Format date for display
export const formatDate = (dateString) => {
	if (!dateString) return "";

	const options = {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	};

	return new Date(dateString).toLocaleDateString(undefined, options);
};

// Get order status badge color using the new palette
export const getStatusColor = (status) => {
	switch (status?.toLowerCase()) {
		case "completed":
		case "ready": // Grouping 'ready' with 'completed' for a positive green
			// Using primary-green for text and a very light tint of it for background
			return "bg-primary-green/10 text-primary-green";
		case "preparing":
			// Using a warm brown accent for processing/preparing
			return "bg-accent-warm-brown/10 text-accent-warm-brown";
		case "pending": // Added a pending status style
			// Using a subtle gray for pending
			return "bg-accent-subtle-gray/20 text-accent-dark-brown";
		case "cancelled":
			// Standard red for cancelled
			return "bg-red-500/10 text-red-600"; // text-red-600 for better contrast on light red bg
		default:
			// Default fallback: subtle gray
			return "bg-accent-subtle-gray/20 text-accent-dark-brown";
	}
};
