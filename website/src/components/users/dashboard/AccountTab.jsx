// // src/components/dashboard/AccountTab.jsx
// import React from "react";
// import { motion } from "framer-motion";
// import { FaEdit } from "react-icons/fa";

// const AccountTab = () => {
// 	return (
// 		<motion.div
// 			initial={{ opacity: 0, y: 20 }}
// 			animate={{ opacity: 1, y: 0 }}
// 			transition={{ duration: 0.3 }}
// 		>
// 			<div className="flex items-center mb-6">
// 				<h2 className="text-2xl font-bold">Account Settings</h2>
// 			</div>

// 			<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
// 				<h3 className="text-lg font-semibold mb-4">Password</h3>
// 				<p className="text-gray-600 mb-4">
// 					Update your password to keep your account secure.
// 				</p>
// 				<button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
// 					Change Password
// 				</button>
// 			</div>

// 			<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
// 				<h3 className="text-lg font-semibold mb-4">Notifications</h3>
// 				<p className="text-gray-600 mb-4">
// 					Manage your email notifications preferences.
// 				</p>
// 				<div className="space-y-4">
// 					<div className="flex items-center justify-between">
// 						<div>
// 							<p className="font-medium">Order Updates</p>
// 							<p className="text-sm text-gray-500">
// 								Receive notifications about your order status
// 							</p>
// 						</div>
// 						<label className="relative inline-flex items-center cursor-pointer">
// 							<input
// 								type="checkbox"
// 								value=""
// 								className="sr-only peer"
// 								defaultChecked
// 							/>
// 							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
// 						</label>
// 					</div>

// 					<div className="flex items-center justify-between">
// 						<div>
// 							<p className="font-medium">Promotional Emails</p>
// 							<p className="text-sm text-gray-500">
// 								Receive emails about promotions and special offers
// 							</p>
// 						</div>
// 						<label className="relative inline-flex items-center cursor-pointer">
// 							<input
// 								type="checkbox"
// 								value=""
// 								className="sr-only peer"
// 							/>
// 							<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
// 						</label>
// 					</div>
// 				</div>
// 			</div>

// 			<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
// 				<h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
// 				<p className="text-gray-600 mb-4">
// 					Permanently delete your account and all associated data.
// 				</p>
// 				<button className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
// 					Delete Account
// 				</button>
// 			</div>
// 		</motion.div>
// 	);
// };

// export default AccountTab;
