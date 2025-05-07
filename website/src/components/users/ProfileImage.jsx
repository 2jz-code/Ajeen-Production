// components/users/ProfileImage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaHistory, FaCog, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";

const ProfileImage = () => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef(null);
	const { logout, user } = useAuth();
	const profileImageUrl = user?.profile_image;

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};

		// Add event listener when dropdown is open
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		// Cleanup event listener
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Handle escape key press to close dropdown
	useEffect(() => {
		const handleEscapeKey = (event) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		// Add event listener when dropdown is open
		if (isOpen) {
			document.addEventListener("keydown", handleEscapeKey);
		}

		// Cleanup event listener
		return () => {
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen]);

	// Toggle dropdown
	const toggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	// Menu item configuration for reusability
	const menuItems = [
		{
			id: "profile",
			label: "My Profile",
			icon: <FaUser className="mr-2" />,
			link: "/dashboard",
			divider: false,
		},
		{
			id: "orders",
			label: "Order History",
			icon: <FaHistory className="mr-2" />,
			link: "/dashboard?tab=orders",
			divider: false,
		},
		{
			id: "settings",
			label: "Account Settings",
			icon: <FaCog className="mr-2" />,
			link: "/dashboard?tab=account",
			divider: true,
		},
		{
			id: "logout",
			label: "Logout",
			icon: <FaSignOutAlt className="mr-2" />,
			action: logout, // Use logout from auth context
			divider: false,
		},
	];

	return (
		<div
			className="relative"
			ref={dropdownRef}
		>
			{/* Profile Avatar Button */}
			<button
				onClick={toggleDropdown}
				className="relative flex items-center focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full"
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
					{profileImageUrl ? (
						<img
							src={profileImageUrl}
							alt="User profile"
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.onerror = null;
								e.target.src = "https://via.placeholder.com/40?text=User";
							}}
						/>
					) : (
						<FaUser className="text-gray-400" />
					)}
				</div>
			</button>

			{/* Dropdown Menu */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
						className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 overflow-hidden"
						style={{ transformOrigin: "top right" }}
						role="menu"
						aria-orientation="vertical"
						aria-labelledby="user-menu"
					>
						<div className="py-1">
							{menuItems.map((item) => (
								<React.Fragment key={item.id}>
									{item.link ? (
										<Link
											to={item.link}
											className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
											onClick={() => setIsOpen(false)}
											role="menuitem"
										>
											{item.icon}
											{item.label}
										</Link>
									) : (
										<button
											onClick={() => {
												setIsOpen(false);
												if (item.action) item.action();
											}}
											className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
											role="menuitem"
										>
											{item.icon}
											{item.label}
										</button>
									)}
									{item.divider && (
										<div className="border-t border-gray-100 my-1"></div>
									)}
								</React.Fragment>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default ProfileImage;
