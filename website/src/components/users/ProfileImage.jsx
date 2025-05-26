// components/users/ProfileImage.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaUser, FaHistory, FaCog, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext"; // Ensure this path is correct

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

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
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
		if (isOpen) {
			document.addEventListener("keydown", handleEscapeKey);
		}
		return () => {
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen]);

	const toggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	const menuItems = [
		{
			id: "profile",
			label: "My Profile",
			icon: <FaUser className="mr-2 text-accent-dark-green" />, // Icon color
			link: "/dashboard",
			divider: false,
		},
		{
			id: "orders",
			label: "Order History",
			icon: <FaHistory className="mr-2 text-accent-dark-green" />, // Icon color
			link: "/dashboard?tab=orders", // Assuming dashboard handles tab query params
			divider: false,
		},
		{
			id: "settings",
			label: "Account Settings",
			icon: <FaCog className="mr-2 text-accent-dark-green" />, // Icon color
			link: "/dashboard?tab=account", // Assuming dashboard handles tab query params
			divider: true,
		},
		{
			id: "logout",
			label: "Logout",
			icon: <FaSignOutAlt className="mr-2 text-red-500" />, // Destructive action color
			action: logout,
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
				// Focus ring uses primary-green from your palette
				className="relative flex items-center focus:outline-none focus:ring-2 focus:ring-primary-green rounded-full"
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				{/* Avatar background: subtle gray or primary beige */}
				<div className="w-8 h-8 rounded-full overflow-hidden bg-accent-subtle-gray flex items-center justify-center">
					{profileImageUrl ? (
						<img
							src={profileImageUrl}
							alt="User profile"
							className="w-full h-full object-cover"
							onError={(e) => {
								e.target.onerror = null;
								// Fallback placeholder styling
								e.target.style.display = "none"; // Hide broken image
								const parent = e.target.parentElement;
								if (parent && !parent.querySelector(".fallback-icon")) {
									const icon = document.createElement("div");
									icon.className =
										"fallback-icon w-full h-full flex items-center justify-center";
									icon.innerHTML =
										'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-accent-dark-brown"><path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clip-rule="evenodd" /></svg>';
									parent.appendChild(icon);
								}
							}}
						/>
					) : (
						// Default icon color: dark brown
						<FaUser className="text-accent-dark-brown" />
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
						// Dropdown background: Light beige, border: subtle gray
						className="absolute right-0 mt-2 w-48 bg-accent-light-beige rounded-md shadow-lg z-50 overflow-hidden border border-accent-subtle-gray/50"
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
											// Text: Dark green, Hover background: Primary beige, Hover text: Primary green
											className="flex items-center px-4 py-2 text-sm text-accent-dark-green hover:bg-primary-beige hover:text-primary-green transition-colors"
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
											// Special styling for logout to be more destructive-like
											className={`flex items-center w-full text-left px-4 py-2 text-sm transition-colors ${
												item.id === "logout"
													? "text-red-600 hover:bg-red-50 hover:text-red-700" // Destructive colors for logout
													: "text-accent-dark-green hover:bg-primary-beige hover:text-primary-green"
											}`}
											role="menuitem"
										>
											{item.icon}
											{item.label}
										</button>
									)}
									{/* Divider: Subtle gray */}
									{item.divider && (
										<div className="border-t border-accent-subtle-gray/30 my-1"></div>
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
