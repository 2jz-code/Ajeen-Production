// src/pages/users/Users.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import {
	PlusIcon,
	// Bars3Icon, // Moved to MainLayout
	EyeIcon,
	PencilSquareIcon,
	TrashIcon,
	ExclamationTriangleIcon,
	ArrowPathIcon,
	// UserCircleIcon, // Moved to MainLayout's header context
	InformationCircleIcon, // If used, ensure it's for specific info, not general layout
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import UserConfirmationModal from "./UserConfirmationModal";
import MainLayout from "../layout/MainLayout";
import { Button } from "@/components/ui/button";

export default function Users() {
	const [users, setUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userToDelete, setUserToDelete] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [currentUserRole, setCurrentUserRole] = useState("");
	const [currentUserId, setCurrentUserId] = useState(null);
	const navigate = useNavigate();

	const fetchUsers = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await userService.getUsers();
			setUsers(data);
		} catch (err) {
			console.error("Error fetching users:", err);
			const errorMsg = "Failed to load users. Please try again.";
			setError(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchUsers();
		const fetchCurrentUser = async () => {
			try {
				const userData = await userService.getCurrentUser();
				setCurrentUserRole(userData.role);
				setCurrentUserId(userData.id);
			} catch (error) {
				console.error("Error fetching current user:", error);
			}
		};
		fetchCurrentUser();
	}, [fetchUsers]);

	const handleView = (userId) => navigate(`/users/${userId}`);
	const handleEdit = (userId) => navigate(`/users/edit/${userId}`);
	const handleDelete = (user) => {
		setUserToDelete(user);
		setShowDeleteModal(true);
	};

	const confirmDelete = async () => {
		if (!userToDelete) return;
		try {
			await userService.deleteUser(userToDelete.id);
			setUsers(users.filter((user) => user.id !== userToDelete.id));
			toast.success(`User ${userToDelete.username} deleted successfully`);
		} catch (err) {
			console.error("Error deleting user:", err);
			toast.error(
				`Failed to delete user: ${err.response?.data?.message || err.message}`
			);
		} finally {
			setShowDeleteModal(false);
			setUserToDelete(null);
		}
	};

	const isActionDisabled = (targetUser) => {
		if (!currentUserRole || !currentUserId) return true;
		if (currentUserRole === "owner") return false;
		if (targetUser.role === "owner") return true;
		if (
			targetUser.role === "admin" &&
			currentUserRole === "admin" &&
			targetUser.id !== currentUserId
		)
			return true;
		return false;
	};

	// Removed specific loading for this page as MainLayout handles initial auth loading
	// If Users page has its own data fetching for the main content, keep its specific isLoading

	return (
		<MainLayout pageTitle="User Management">
			{/* Page-specific header section */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
				<h2 className="text-xl font-semibold text-slate-800">System Users</h2>
				<button
					className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					onClick={() => navigate("/users/add")}
				>
					<PlusIcon className="h-4 w-4" />
					Add User
				</button>
			</div>

			{currentUserRole === "admin" && (
				<div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200 flex items-center gap-2">
					<InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
					<span>
						<strong>Note:</strong> As an admin, you can only edit your own
						account and non-admin users.
					</span>
				</div>
			)}

			{error && !isLoading && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2 text-sm shadow-sm">
					<ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
					<span>{error}</span>
					<button
						onClick={fetchUsers}
						className="ml-auto text-xs font-medium text-red-800 hover:underline"
					>
						<ArrowPathIcon className="h-3 w-3 inline mr-1" /> Retry
					</button>
				</div>
			)}

			{/* Main Content Table Area */}
			<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				{isLoading && users.length === 0 ? (
					<div className="flex items-center justify-center py-10">
						<LoadingSpinner size="md" />{" "}
						<p className="ml-2 text-slate-500">Loading users...</p>
					</div>
				) : (
					<div
						className="overflow-auto custom-scrollbar"
						style={{ maxHeight: "calc(100vh - 250px)" }}
					>
						{" "}
						{/* Adjust max height as needed */}
						<table className="min-w-full divide-y divide-slate-200">
							<thead className="bg-slate-50 sticky top-0 z-10">
								<tr>
									<Th>Username</Th>
									<Th>Email</Th>
									<Th>Role</Th>
									<Th>System</Th>
									<Th align="right">Actions</Th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-100">
								{users.length === 0 && !isLoading ? (
									<tr>
										<td
											colSpan="5"
											className="px-6 py-10 text-center text-slate-500"
										>
											No users found.
										</td>
									</tr>
								) : (
									users.map((user) => {
										const disabled = isActionDisabled(user);
										return (
											<tr
												key={user.id}
												className={`hover:bg-slate-50 transition-colors ${
													disabled && currentUserRole !== "owner"
														? "opacity-70"
														: ""
												}`}
											>
												<Td>{user.username}</Td>
												<Td>{user.email || "-"}</Td>
												<Td>
													<span
														className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
															user.role === "owner"
																? "bg-amber-100 text-amber-800 border border-amber-200"
																: user.role === "admin"
																? "bg-purple-100 text-purple-800 border border-purple-200"
																: user.role === "manager"
																? "bg-blue-100 text-blue-800 border border-blue-200"
																: user.role === "cashier"
																? "bg-green-100 text-green-800 border border-green-200"
																: "bg-slate-100 text-slate-700 border border-slate-200"
														}`}
													>
														{user.role.toUpperCase()}
													</span>
												</Td>
												<Td>
													{user.is_pos_user && (
														<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200 mr-1">
															POS
														</span>
													)}
													{user.is_website_user && (
														<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-800 border border-lime-200">
															WEB
														</span>
													)}
												</Td>
												<Td
													align="right"
													className="space-x-1.5"
												>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleView(user.id)}
														title="View Details"
														className="h-7 w-7"
													>
														<EyeIcon className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(user.id)}
														disabled={disabled}
														title={
															disabled ? "Cannot edit this user" : "Edit User"
														}
														className="h-7 w-7"
													>
														<PencilSquareIcon className="h-3.5 w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDelete(user)}
														disabled={disabled}
														title={
															disabled
																? "Cannot delete this user"
																: "Delete User"
														}
														className="text-destructive-foreground hover:bg-destructive/10 h-7 w-7"
													>
														<TrashIcon className="h-3.5 w-3.5" />
													</Button>
												</Td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<UserConfirmationModal
				isOpen={showDeleteModal}
				onClose={() => {
					setShowDeleteModal(false);
					setUserToDelete(null);
				}}
				onConfirm={confirmDelete}
				title="Delete User"
				message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
				confirmButtonText="Delete"
			/>
		</MainLayout>
	);
}

// Define propTypes for Th and Td if they are local to this file or import if they are shared
const Th = ({ children, align = "left" }) => (
	<th
		className={`px-4 py-2.5 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider`}
	>
		{children}
	</th>
);
Th.propTypes = { children: PropTypes.node, align: PropTypes.string };

const Td = ({ children, align = "left" }) => (
	<td
		className={`px-4 py-3 whitespace-nowrap text-sm text-${align} text-slate-600`}
	>
		{children}
	</td>
);
Td.propTypes = { children: PropTypes.node, align: PropTypes.string };
