// src/components/dashboard/ProfileTab.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
	FaUser,
	FaCamera,
	FaExclamationTriangle,
	FaEdit,
	FaGift, // Added for rewards icon
} from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import ComingSoonWrapper from "../../utility/ComingSoonWrapper"; // Assuming correct path

const ProfileTab = () => {
	const {
		userInfo,
		// setUserInfo, // Keep if used directly, though handleInputChange is primary
		profileImage,
		error,
		updateSuccess,
		isSubmitting,
		handleInputChange,
		handleImageUpload,
		updateProfile, // This is the onSubmit handler
		rewardsProfile,
		loadingRewards,
	} = useDashboard();

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			// The tab content itself doesn't need a background if Dashboard.jsx's content area has one
		>
			<div className="flex items-center mb-6">
				{/* Heading: Dark Green */}
				<h2 className="text-2xl font-bold text-accent-dark-green">
					My Profile
				</h2>
			</div>

			{error && (
				// Error Message: Standard red theme
				<div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-md flex items-center text-sm">
					<FaExclamationTriangle className="mr-2" />
					{error}
				</div>
			)}

			<form
				onSubmit={updateProfile}
				className="space-y-6"
			>
				{/* Profile Image Section */}
				<div className="flex flex-col items-center mb-6 p-6 bg-primary-beige rounded-lg shadow-sm border border-accent-subtle-gray/30">
					<div className="relative group">
						{/* Placeholder background: Subtle gray */}
						<div className="w-24 h-24 rounded-full overflow-hidden bg-accent-subtle-gray mb-2 ring-2 ring-primary-green/50">
							{profileImage ? (
								<img
									src={profileImage}
									alt="Profile"
									className="w-full h-full object-cover"
								/>
							) : (
								// Fallback icon: Dark brown icon on lighter beige
								<div className="w-full h-full flex items-center justify-center bg-accent-light-beige text-accent-dark-brown">
									<FaUser size={40} />
								</div>
							)}
						</div>
						{/* Upload button: Primary green background, light beige icon */}
						<label className="absolute bottom-0 right-0 bg-primary-green text-accent-light-beige p-2.5 rounded-full cursor-pointer hover:bg-accent-dark-green transition-colors shadow-md">
							<FaCamera size={14} />
							<input
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
						</label>
					</div>
					{/* Helper text: Dark brown */}
					<p className="text-sm text-accent-dark-brown mt-2">
						Click the camera icon to change your profile picture
					</p>
				</div>

				{/* Personal Information Card */}
				{/* Card: Primary beige background, subtle border */}
				<div className="bg-primary-beige rounded-lg shadow-sm p-6 border border-accent-subtle-gray/30">
					{/* Heading: Dark green, icon: primary green */}
					<h3 className="text-lg font-semibold mb-4 flex items-center text-accent-dark-green">
						<FaUser className="mr-2 text-primary-green" /> Personal Information
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							{/* Label: Dark green */}
							<label
								htmlFor="first_name"
								className="block text-sm font-medium text-accent-dark-green mb-1"
							>
								First Name
							</label>
							<input
								type="text"
								id="first_name"
								name="first_name"
								value={userInfo.first_name || ""}
								onChange={handleInputChange}
								// Input fields: white bg, dark brown text, subtle gray border, primary green focus
								className="w-full px-3 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
							/>
						</div>

						<div>
							<label
								htmlFor="last_name"
								className="block text-sm font-medium text-accent-dark-green mb-1"
							>
								Last Name
							</label>
							<input
								type="text"
								id="last_name"
								name="last_name"
								value={userInfo.last_name || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
							/>
						</div>

						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-accent-dark-green mb-1"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={userInfo.email || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
							/>
						</div>

						<div>
							<label
								htmlFor="phone_number"
								className="block text-sm font-medium text-accent-dark-green mb-1"
							>
								Phone Number
							</label>
							<input
								type="tel"
								id="phone_number"
								name="phone_number"
								value={userInfo.phone_number || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-accent-subtle-gray rounded-md focus:outline-none focus:ring-2 focus:ring-primary-green focus:border-primary-green bg-white text-accent-dark-brown placeholder-accent-subtle-gray"
							/>
						</div>
					</div>
				</div>

				{/* Address Information - Assuming commented out, would follow similar styling */}

				{/* Rewards Program Card */}
				<ComingSoonWrapper active={true}>
					{" "}
					{/* Ensure ComingSoonWrapper is styled or transparent */}
					<div className="bg-primary-beige rounded-lg shadow-sm p-6 border border-accent-subtle-gray/30 mt-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center text-accent-dark-green">
							<FaGift className="h-5 w-5 mr-2 text-primary-green" />
							Rewards Program
						</h3>

						{loadingRewards ? (
							<div className="flex justify-center py-4">
								{/* Spinner: Primary Green */}
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-green"></div>
							</div>
						) : rewardsProfile ? (
							<div className="space-y-4">
								{/* Rewards info box: Lighter Primary Green background, Dark green/brown text */}
								<div className="bg-primary-green/20 rounded-lg p-4 border border-primary-green/30">
									<div className="flex justify-between items-center">
										<div>
											<p className="font-medium text-accent-dark-green">
												{userInfo.first_name}, you're a {rewardsProfile.tier}{" "}
												member!
											</p>
											<p className="text-sm text-accent-dark-brown mt-1">
												Current Points:{" "}
												<span className="font-bold text-primary-green">
													{rewardsProfile.points_balance}
												</span>
											</p>
											<p className="text-sm text-accent-dark-brown">
												Lifetime Points: {rewardsProfile.lifetime_points}
											</p>
										</div>
										<div className="bg-accent-light-beige p-3 rounded-full shadow-sm">
											<FaGift className="h-10 w-10 text-primary-green" />
										</div>
									</div>
									<div className="mt-3">
										{/* Link: Primary Green */}
										<Link
											to="/rewards" // Assuming this route exists
											className="text-sm text-primary-green font-medium hover:text-accent-dark-green"
										>
											View rewards details →
										</Link>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{/* Opt-in text: Dark Brown */}
								<p className="text-accent-dark-brown">
									Join our rewards program to earn points on every purchase, get
									exclusive offers, and redeem rewards!
								</p>
								<div className="flex items-start mt-2">
									<div className="flex items-center h-5">
										<input
											id="rewards-opt-in"
											type="checkbox"
											// Ensure correct state binding if `userInfo.is_rewards_opted_in` is directly from context
											checked={userInfo.is_rewards_opted_in || false}
											onChange={(e) => {
												// This assumes handleInputChange can handle checkbox type correctly
												// or setUserInfo directly if handleInputChange is only for text inputs.
												// For simplicity, if handleInputChange is general:
												handleInputChange(e);
											}}
											name="is_rewards_opted_in" // Ensure name matches state structure
											// Checkbox: Primary green
											className="h-4 w-4 text-primary-green focus:ring-primary-green border-accent-subtle-gray rounded"
										/>
									</div>
									<div className="ml-3 text-sm">
										{/* Label: Dark Green */}
										<label
											htmlFor="rewards-opt-in"
											className="text-accent-dark-green font-medium"
										>
											Opt-in to Rewards Program
										</label>
										{/* Helper text: Dark Brown, Link: Primary Green */}
										<p className="text-accent-dark-brown text-xs mt-1">
											By opting in, you agree to the{" "}
											<a
												href="#/" // Replace with actual link
												className="text-primary-green hover:text-accent-dark-green"
											>
												Rewards Program Terms
											</a>
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</ComingSoonWrapper>

				{/* Submit Button */}
				<div className="flex justify-end pt-2">
					{/* Button: Primary Green background, Light Beige text */}
					<button
						type="submit"
						disabled={isSubmitting}
						className={`px-6 py-2.5 rounded-md text-accent-light-beige font-medium ${
							isSubmitting
								? "bg-accent-subtle-gray cursor-not-allowed"
								: "bg-primary-green hover:bg-accent-dark-green"
						} transition-colors flex items-center shadow-md`}
					>
						{isSubmitting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-accent-light-beige"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Updating...
							</>
						) : (
							<>
								<FaEdit className="mr-2" /> Save Changes
							</>
						)}
					</button>
				</div>

				{/* Success Message */}
				{updateSuccess && (
					// Success message: Light Primary Green background, Dark Green text
					<div className="mt-4 bg-primary-green/10 border border-primary-green/30 text-primary-green px-4 py-3 rounded-md text-sm">
						{updateSuccess}
					</div>
				)}
			</form>
		</motion.div>
	);
};

export default ProfileTab;
