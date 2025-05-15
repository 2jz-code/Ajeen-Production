import axios from "axios";

// Base API URL
const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000/api/";

// Axios instance
const axiosInstance = axios.create({
	baseURL: apiUrl,
	headers: { "Content-Type": "application/json" },
	withCredentials: true,
});

// Utility function to clear tokens and log out the user
export const clearTokensAndLogout = () => {
	axiosInstance.post("website/logout/");
	window.location.href = "/login";
};

// Function to refresh the token
export const check_and_refresh_token = async () => {
	try {
		// Step 1: Check if a valid website refresh token exists
		const checkResponse = await axiosInstance.get("website/refresh-check/");

		// Step 2: If we have a valid refresh token (status 200), attempt to refresh it
		if (checkResponse.status === 200 && checkResponse.data.hasRefreshToken) {
			try {
				// Step 3: Attempt to refresh the token
				const refreshResponse = await axiosInstance.post(
					"website/token/refresh/"
				);

				if (refreshResponse.data.message === "Guest access allowed") {
					// console.log("Guest user detected, allowing to continue");
					return "guest";
				} else {
					// console.log("Token refreshed successfully, user authenticated");
					return "authenticated";
				}
			} catch (refreshError) {
				// Step 4: Handle refresh errors
				console.error("Error refreshing token:", refreshError);

				if (refreshError.response && refreshError.response.status === 401) {
					// console.log("Session expired. Please log in again");
					return "session-expired";
				} else {
					// console.log("Unexpected error during token refresh");
					return "error";
				}
			}
		} else {
			// No valid refresh token found - call refresh endpoint to get guest_id cookie
			// console.log("No valid website refresh token, setting up guest access...");

			try {
				// Call refresh endpoint even without a token to get guest_id cookie
				const guestResponse = await axiosInstance.post(
					"website/token/refresh/"
				);

				if (guestResponse.data.message === "Guest access allowed") {
					// console.log("Guest access successfully established");
					return "guest";
				} else {
					// console.log(
					// 	"Unexpected response from refresh endpoint:",
					// 	guestResponse.data
					// );
					return "error";
				}
			} catch (guestError) {
				console.error("Error setting up guest access:", guestError);
				return "error";
			}
		}
	} catch (checkError) {
		// Step 5: Handle check errors and try to set up guest access
		console.error("Error checking refresh token:", checkError);

		try {
			// Attempt to call refresh endpoint to set up guest access
			const fallbackResponse = await axiosInstance.post(
				"website/token/refresh/"
			);

			if (fallbackResponse.data.message === "Guest access allowed") {
				// console.log("Fallback guest access successfully established");
				return "guest";
			} else {
				// console.log("Unexpected fallback response:", fallbackResponse.data);
				return "error";
			}
		} catch (fallbackError) {
			console.error("Error setting up fallback guest access:", fallbackError);
			return "error";
		}
	}
};

// Function to check authentication using the /auth endpoint
export const checkAuth = async () => {
	try {
		// Step 1: First check if we have a valid website refresh token
		const refreshStatus = await check_and_refresh_token();

		// Step 2: If we're already authenticated or have a specific status from refresh check, return it
		if (
			refreshStatus === "authenticated" ||
			refreshStatus === "guest" ||
			refreshStatus === "session-expired"
		) {
			return refreshStatus;
		}

		// Step 3: If refresh token check was inconclusive or indicated no token,
		// try the direct auth endpoint
		if (refreshStatus === "no-refresh-token" || refreshStatus === "error") {
			try {
				const authResponse = await axiosInstance.get("website/auth/");
				// console.log("Auth check response:", authResponse.data);

				if (authResponse.data.isAuthenticated) {
					return "authenticated";
				} else {
					// The user is not authenticated according to the auth endpoint
					return "no-refresh-token"; // User needs to log in
				}
			} catch (authError) {
				// console.log("Auth check failed:", authError);

				if (authError.response && authError.response.status === 401) {
					return "session-expired"; // Session has expired
				} else {
					return "error"; // Some other error occurred
				}
			}
		}

		// Step 4: Fallback for any unexpected refresh status values
		return refreshStatus;
	} catch (error) {
		console.error("Unexpected error in checkAuth flow:", error);
		return "error";
	}
};

let isRefreshing = false; // Flag to check if the token is currently being refreshed
let refreshSubscribers = []; // List of subscribers waiting for token refresh

// Function to add subscribers (requests) to the queue
const subscribeTokenRefresh = (callback) => {
	refreshSubscribers.push(callback);
};

// Function to notify all subscribers once the token refresh is complete
const onRefreshed = (newAccessToken, authStatus) => {
	// Pass authStatus
	refreshSubscribers.forEach((callback) =>
		callback(newAccessToken, authStatus)
	); // Pass status to callback
	refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
	(response) => response, // Pass successful responses through
	async (error) => {
		const originalRequest = error.config;

		// Check if 401, not already retried, and not the refresh endpoint itself
		if (
			error.response &&
			error.response.status === 401 &&
			!originalRequest._retry &&
			!originalRequest.url?.includes("token/refresh")
		) {
			originalRequest._retry = true;

			if (isRefreshing) {
				// Queue request if already refreshing
				return new Promise((resolve, reject) => {
					subscribeTokenRefresh((newAccessToken, authStatus) => {
						// Expect authStatus from callback
						if (authStatus === "authenticated") {
							// Ideally, use newAccessToken if available and needed
							// originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
							resolve(axiosInstance(originalRequest));
						} else {
							// Refresh failed or guest/error
							reject(error); // Reject queued request based on final status
						}
					});
				});
			}

			isRefreshing = true;
			let authStatus = "error"; // Default

			try {
				// Use check_and_refresh_token directly as checkAuth might add complexity here
				authStatus = await check_and_refresh_token();
				isRefreshing = false; // Release lock *after* getting status

				if (authStatus === "authenticated") {
					// console.log("Token refreshed, retrying original request");
					onRefreshed("some_token_placeholder", authStatus); // Notify subscribers - ideally pass actual token if available
					// Assuming cookies are set, retry should work
					return axiosInstance(originalRequest);
				} else if (authStatus === "guest") {
					// console.log(
					// 	"Interceptor: Guest detected, rejecting original request."
					// );
					onRefreshed(null, authStatus); // Notify subscribers
					return Promise.reject(error); // <<< REJECT FOR GUEST
				} else if (authStatus === "session-expired") {
					// *** FIX: Only logout/redirect if session explicitly expired ***
					// console.log("Interceptor: Session expired, logging out.");
					onRefreshed(null, authStatus); // Notify subscribers
					clearTokensAndLogout(); // <<< CALL LOGOUT ONLY HERE
					return Promise.reject(error); // Reject after initiating logout
				} else {
					// Includes "error" or any other unexpected status
					// console.log(
					// 	`Interceptor: Auth check failed (${authStatus}), rejecting original request.`
					// );
					onRefreshed(null, authStatus); // Notify subscribers
					return Promise.reject(error); // <<< REJECT FOR OTHER ERRORS
				}
			} catch (err) {
				// Catch errors from check_and_refresh_token itself
				console.error("Error during token refresh process:", err);
				isRefreshing = false; // Ensure lock is released
				onRefreshed(null, "error"); // Notify subscribers of error
				// Do not logout on general errors during the refresh process itself
				return Promise.reject(error); // <<< REJECT ON REFRESH PROCESS ERROR
			}
			// Removed finally block as it could interfere with promise chain/lock release timing
		}

		// For non-401 errors or already retried requests, just reject
		return Promise.reject(error);
	}
);

// Example function to fetch products
export const fetchProducts = async () => {
	try {
		const response = await axiosInstance.get("products/");
		return response.data;
	} catch (error) {
		console.error("Error fetching products", error);
		throw error;
	}
};

export default axiosInstance;
