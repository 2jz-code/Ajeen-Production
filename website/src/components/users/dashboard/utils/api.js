// src/components/dashboard/utils/api.js

import axiosInstance from "../../../../api/api";
// Dashboard-specific API functions
export const fetchUserDashboardData = async () => {
	try {
		const response = await axiosInstance.get("website/profile/");
		return response.data;
	} catch (error) {
		console.error("Error fetching user dashboard data:", error);
		throw error;
	}
};

export const updateUserProfile = async (formData) => {
	try {
		const response = await axiosInstance.put("website/profile/", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return response.data;
	} catch (error) {
		console.error("Error updating user profile:", error);
		throw error;
	}
};

export const reorderPastOrder = async (orderId) => {
	try {
		const response = await axiosInstance.post("website/reorder/", {
			order_id: orderId,
		});
		return response.data;
	} catch (error) {
		console.error("Error re-ordering past order:", error);
		throw error;
	}
};

// You can add more dashboard-specific API functions here
