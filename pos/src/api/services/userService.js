// src/api/services/userService.js
import axiosInstance from "../config/axiosConfig";
import { ENDPOINTS } from "../config/apiEndpoints";

export const userService = {
	// Get all users
	getUsers: async () => {
		try {
			const response = await axiosInstance.get(ENDPOINTS.AUTH.USERS);
			// Filter users where is_pos_user is true
			if (response.data && Array.isArray(response.data)) {
				const posUsers = response.data.filter(
					(user) => user.is_pos_user === true
				);
				return posUsers;
			}
			return []; // Return empty array if data is not as expected
		} catch (error) {
			console.error("Error fetching users:", error);
			throw error;
		}
	},

	// Get a single user by ID
	getUserById: async (userId) => {
		try {
			const response = await axiosInstance.get(
				ENDPOINTS.AUTH.USER_DETAIL(userId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error fetching user #${userId}:`, error);
			throw error;
		}
	},

	// Create a new user
	createUser: async (userData) => {
		try {
			// Ensure password is included in the request
			if (!userData.password) {
				throw new Error("Password is required");
			}

			// Create a new object with all the user data including password
			const response = await axiosInstance.post(
				ENDPOINTS.AUTH.REGISTER,
				userData
			);
			return response.data;
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	},

	// Update a user
	updateUser: async (userId, userData) => {
		try {
			// For updates, only include password if it's provided
			const dataToSend = { ...userData };

			// If empty password, remove it from the request
			if (dataToSend.password === "") {
				delete dataToSend.password;
			}

			const response = await axiosInstance.put(
				ENDPOINTS.AUTH.USER_UPDATE(userId),
				dataToSend
			);
			return response.data;
		} catch (error) {
			console.error(`Error updating user #${userId}:`, error);
			throw error;
		}
	},

	// Delete a user
	deleteUser: async (userId) => {
		try {
			const response = await axiosInstance.delete(
				ENDPOINTS.AUTH.USER_DELETE(userId)
			);
			return response.data;
		} catch (error) {
			console.error(`Error deleting user #${userId}:`, error);
			throw error;
		}
	},

	getCurrentUser: async () => {
		try {
			const response = await axiosInstance.get("auth/current-user/");
			return response.data;
		} catch (error) {
			console.error("Error fetching current user:", error);
			throw error;
		}
	},
};
