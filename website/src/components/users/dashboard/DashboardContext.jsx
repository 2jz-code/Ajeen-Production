// src/components/dashboard/DashboardContext.jsx
import React, { createContext, useState, useContext, useEffect } from "react";
import axiosInstance from "../../../api/api";
import { useAuth } from "../../../contexts/AuthContext";
import { checkAuth } from "../../../api/api";

// Create context
const DashboardContext = createContext();

export const DashboardProvider = ({ children }) => {
	const { user, setUser } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [updateSuccess, setUpdateSuccess] = useState("");
	const [profileImageFile, setProfileImageFile] = useState(null);
	const [profileImage, setProfileImage] = useState(null);
	const [activeTab, setActiveTab] = useState("profile");
	const [orderHistory, setOrderHistory] = useState([]);
	const [loadingOrders, setLoadingOrders] = useState(false);
	const [orderError, setOrderError] = useState(null);
	const [rewardsProfile, setRewardsProfile] = useState(null);
	const [loadingRewards, setLoadingRewards] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [userInfo, setUserInfo] = useState({
		first_name: "",
		last_name: "",
		email: "",
		phone_number: "",
		address: "",
		city: "",
		state: "",
		postal_code: "",
		is_rewards_opted_in: false,
	});

	// Fetch user profile
	const fetchUserProfile = async () => {
		try {
			setIsLoading(true);
			const response = await axiosInstance.get("website/profile/");

			setUserInfo({
				first_name: response.data.first_name || "",
				last_name: response.data.last_name || "",
				email: response.data.email || "",
				phone_number: response.data.phone_number || "",
				address: response.data.address || "",
				city: response.data.city || "",
				state: response.data.state || "",
				postal_code: response.data.postal_code || "",
				is_rewards_opted_in: response.data.is_rewards_opted_in || false,
			});

			setUser(response.data);

			if (response.data.profile_image) {
				setProfileImage(response.data.profile_image);
			}

			setError(null);
		} catch (err) {
			console.error("Failed to fetch user profile:", err);
			setError(
				"Failed to load your profile information. Please try refreshing the page."
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch rewards profile
	const fetchRewardsProfile = async () => {
		try {
			setLoadingRewards(true);
			const response = await axiosInstance.get("website/rewards/profile/");
			setRewardsProfile(response.data);
		} catch (err) {
			if (err.response?.status === 403 && err.response?.data?.opt_in_required) {
				setRewardsProfile(null);
			} else {
				console.error("Failed to fetch rewards profile:", err);
			}
		} finally {
			setLoadingRewards(false);
		}
	};

	// Fetch order history
	const fetchOrderHistory = async () => {
		try {
			setLoadingOrders(true);
			const response = await axiosInstance.get("website/orders/");

			if (Array.isArray(response.data)) {
				setOrderHistory(response.data);
			} else {
				console.error("Unexpected response format:", response.data);
				setOrderHistory([]);
			}

			setOrderError(null);
		} catch (err) {
			console.error("Failed to fetch order history:", err);

			if (err.response?.status === 401) {
				const authStatus = await checkAuth();
				if (authStatus === "authenticated") {
					fetchOrderHistory();
				} else {
					setOrderError("Your session has expired. Please log in again.");
				}
			} else {
				setOrderError(
					"Failed to load your order history. Please try refreshing the page."
				);
			}
		} finally {
			setLoadingOrders(false);
		}
	};

	// Handle input changes
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setUserInfo((prevInfo) => ({ ...prevInfo, [name]: value }));
	};

	// Handle profile image upload
	const handleImageUpload = (e) => {
		const file = e.target.files[0];
		if (file) {
			setProfileImageFile(file);
			setProfileImage(URL.createObjectURL(file));
		}
	};

	// Update profile
	const updateProfile = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		setUpdateSuccess("");

		try {
			const formData = new FormData();

			Object.keys(userInfo).forEach((key) => {
				if (userInfo[key] !== null && userInfo[key] !== undefined) {
					formData.append(key, userInfo[key]);
				}
			});

			if (profileImageFile) {
				formData.append("profile_image", profileImageFile);
			}

			const response = await axiosInstance.put("website/profile/", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			setUser(response.data);

			if (userInfo.is_rewards_opted_in) {
				fetchRewardsProfile();
			}

			setUpdateSuccess("Your profile has been updated successfully!");
			setTimeout(() => setUpdateSuccess(""), 3000);
		} catch (err) {
			console.error("Failed to update profile:", err);
			setUpdateSuccess(
				"Failed to update profile. Please check your information and try again."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Load initial data
	useEffect(() => {
		if (user) {
			setUserInfo({
				first_name: user.first_name || "",
				last_name: user.last_name || "",
				email: user.email || "",
				phone_number: user.phone_number || "",
				address: user.address || "",
				city: user.city || "",
				state: user.state || "",
				postal_code: user.postal_code || "",
				is_rewards_opted_in: user.is_rewards_opted_in || false,
			});

			if (user.profile_image) {
				setProfileImage(user.profile_image);
			}

			setIsLoading(false);
			setError(null);
		} else {
			fetchUserProfile();
		}

		fetchRewardsProfile();
		fetchOrderHistory();
	}, [user]);

	const reorderPastOrder = async (orderId) => {
		try {
			setIsLoading(true);

			// First, we need to get the order items to add to cart
			const response = await axiosInstance.post("website/reorder/", {
				order_id: orderId,
			});

			// Redirect to checkout page
			return response.data;
		} catch (err) {
			console.error("Failed to re-order:", err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	// Define the context value
	const value = {
		userInfo,
		setUserInfo,
		profileImage,
		profileImageFile,
		isLoading,
		error,
		updateSuccess,
		activeTab,
		setActiveTab,
		orderHistory,
		loadingOrders,
		orderError,
		rewardsProfile,
		loadingRewards,
		isSubmitting,
		handleInputChange,
		handleImageUpload,
		updateProfile,
		fetchUserProfile,
		fetchRewardsProfile,
		fetchOrderHistory,
		reorderPastOrder,
	};

	return (
		<DashboardContext.Provider value={value}>
			{children}
		</DashboardContext.Provider>
	);
};

// Custom hook to use the dashboard context
export const useDashboard = () => {
	const context = useContext(DashboardContext);
	if (context === undefined) {
		throw new Error("useDashboard must be used within a DashboardProvider");
	}
	return context;
};
