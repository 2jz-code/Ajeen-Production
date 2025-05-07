// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axiosInstance, { checkAuth } from "../api/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authChecked, setAuthChecked] = useState(false);

	// Check authentication status on mount and set up periodic checks
	useEffect(() => {
		const verifyAuth = async () => {
			setIsLoading(true);
			try {
				const authStatus = await checkAuth();
				if (authStatus === "authenticated") {
					setIsAuthenticated(true);
					// Fetch user data
					try {
						const userResponse = await axiosInstance.get("website/profile/");
						setUser(userResponse.data);
					} catch (error) {
						console.error("Failed to fetch user data:", error);
					}
				} else {
					setIsAuthenticated(false);
					setUser(null);
				}
			} catch (error) {
				console.error("Auth check failed:", error);
				setIsAuthenticated(false);
				setUser(null);
			} finally {
				setIsLoading(false);
				setAuthChecked(true);
			}
		};

		verifyAuth();

		// Set up periodic auth checks (optional, every 15 minutes)
		const intervalId = setInterval(verifyAuth, 4 * 60 * 1000);

		return () => clearInterval(intervalId);
	}, []);

	// Login function
	const login = async (credentials) => {
		try {
			const response = await axiosInstance.post("website/token/", credentials);
			setIsAuthenticated(true);
			// Fetch user data after login
			const userResponse = await axiosInstance.get("website/profile/");
			setUser(userResponse.data);
			return { success: true };
		} catch (error) {
			console.error("Login failed:", error);
			return {
				success: false,
				error: error.response?.data?.detail || "Login failed",
			};
		}
	};

	// Logout function
	const logout = async () => {
		try {
			await axiosInstance.post("website/logout/");
		} catch (error) {
			console.error("Logout API call failed:", error);
		} finally {
			setIsAuthenticated(false);
			setUser(null);
			window.location.href = "/login";
		}
	};

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				user,
				isLoading,
				authChecked,
				login,
				logout,
				setUser,
				setIsAuthenticated,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
