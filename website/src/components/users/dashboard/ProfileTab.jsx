// src/components/dashboard/ProfileTab.jsx
import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
	FaUser,
	FaCamera,
	FaExclamationTriangle,
	FaEdit,
} from "react-icons/fa";
import { useDashboard } from "./DashboardContext";
import ComingSoonWrapper from "../../utility/ComingSoonWrapper";

const ProfileTab = () => {
	const {
		userInfo,
		setUserInfo,
		profileImage,
		error,
		updateSuccess,
		isSubmitting,
		handleInputChange,
		handleImageUpload,
		updateProfile,
		rewardsProfile,
		loadingRewards,
	} = useDashboard();

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<div className="flex items-center mb-6">
				<h2 className="text-2xl font-bold">My Profile</h2>
			</div>

			{error && (
				<div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
					<FaExclamationTriangle className="mr-2" />
					{error}
				</div>
			)}

			<form
				onSubmit={updateProfile}
				className="space-y-6"
			>
				{/* Profile Image */}
				<div className="flex flex-col items-center mb-6">
					<div className="relative group">
						<div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-2">
							{profileImage ? (
								<img
									src={profileImage}
									alt="Profile"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-green-100 text-green-800">
									<FaUser size={40} />
								</div>
							)}
						</div>
						<label className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors">
							<FaCamera size={14} />
							<input
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
						</label>
					</div>
					<p className="text-sm text-gray-500 mt-2">
						Click the camera icon to change your profile picture
					</p>
				</div>

				{/* Personal Information */}
				<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
					<h3 className="text-lg font-semibold mb-4 flex items-center">
						<FaUser className="mr-2 text-green-500" /> Personal Information
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="first_name"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								First Name
							</label>
							<input
								type="text"
								id="first_name"
								name="first_name"
								value={userInfo.first_name || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div>
							<label
								htmlFor="last_name"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Last Name
							</label>
							<input
								type="text"
								id="last_name"
								name="last_name"
								value={userInfo.last_name || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Email
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={userInfo.email || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div>
							<label
								htmlFor="phone_number"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Phone Number
							</label>
							<input
								type="tel"
								id="phone_number"
								name="phone_number"
								value={userInfo.phone_number || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>
					</div>
				</div>

				{/* Address Information
				<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
					<h3 className="text-lg font-semibold mb-4">Delivery Address</h3>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="address"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Street Address
							</label>
							<input
								type="text"
								id="address"
								name="address"
								value={userInfo.address || ""}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label
									htmlFor="city"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									City
								</label>
								<input
									type="text"
									id="city"
									name="city"
									value={userInfo.city || ""}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
								/>
							</div>

							<div>
								<label
									htmlFor="state"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									State
								</label>
								<input
									type="text"
									id="state"
									name="state"
									value={userInfo.state || ""}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
								/>
							</div>

							<div>
								<label
									htmlFor="postal_code"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Zip Code
								</label>
								<input
									type="text"
									id="postal_code"
									name="postal_code"
									value={userInfo.postal_code || ""}
									onChange={handleInputChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
								/>
							</div>
						</div>
					</div>
				</div> */}

				{/* Rewards Program */}
				<ComingSoonWrapper>
					<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 mr-2 text-green-500"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							Rewards Program
						</h3>

						{loadingRewards ? (
							<div className="flex justify-center py-4">
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
							</div>
						) : rewardsProfile ? (
							<div className="space-y-4">
								<div className="bg-green-50 rounded-lg p-4 border border-green-100">
									<div className="flex justify-between items-center">
										<div>
											<p className="font-medium text-green-800">
												{userInfo.first_name}, you're a {rewardsProfile.tier}{" "}
												member!
											</p>
											<p className="text-sm text-green-700 mt-1">
												Current Points:{" "}
												<span className="font-bold">
													{rewardsProfile.points_balance}
												</span>
											</p>
											<p className="text-sm text-green-700">
												Lifetime Points: {rewardsProfile.lifetime_points}
											</p>
										</div>
										<div className="bg-white p-3 rounded-full shadow-sm">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-10 w-10 text-green-500"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
									</div>
									<div className="mt-3">
										<Link
											to="/rewards"
											className="text-sm text-green-700 font-medium hover:text-green-800"
										>
											View rewards details →
										</Link>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<p className="text-gray-600">
									Join our rewards program to earn points on every purchase, get
									exclusive offers, and redeem rewards!
								</p>
								<div className="flex items-start mt-2">
									<div className="flex items-center h-5">
										<input
											id="rewards-opt-in"
											type="checkbox"
											checked={userInfo.is_rewards_opted_in}
											onChange={(e) =>
												setUserInfo({
													...userInfo,
													is_rewards_opted_in: e.target.checked,
												})
											}
											className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
										/>
									</div>
									<div className="ml-3 text-sm">
										<label
											htmlFor="rewards-opt-in"
											className="text-gray-700 font-medium"
										>
											Opt-in to Rewards Program
										</label>
										<p className="text-gray-500 text-sm mt-1">
											By opting in, you agree to the{" "}
											<a
												href="#"
												className="text-green-600 hover:underline"
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
				<div className="flex justify-end">
					<button
						type="submit"
						disabled={isSubmitting}
						className={`px-6 py-2 rounded-md text-white font-medium ${
							isSubmitting ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
						} transition-colors flex items-center`}
					>
						{isSubmitting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
					<div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
						{updateSuccess}
					</div>
				)}
			</form>
		</motion.div>
	);
};

export default ProfileTab;
