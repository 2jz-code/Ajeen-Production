// src/pages/users/UserDetail.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types"; // Import PropTypes
import { userService } from "../../api/services/userService";
import { toast } from "react-toastify";
import {
	ArrowLeftIcon,
	PencilIcon,
	ExclamationTriangleIcon,
	InformationCircleIcon,
	CheckBadgeIcon,
	XCircleIcon as XCircleIconOutline, // Keep outline for general use
	CalendarDaysIcon,
	ClockIcon,
	UserIcon,
	EnvelopeIcon,
	BuildingStorefrontIcon,
	GlobeAltIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";

// DetailItem helper component (can be moved to a shared location if used elsewhere)
const DetailItem = ({ label, value, icon: IconComponent, children }) => (
	<div>
		<dt className="text-xs font-medium text-slate-500 mb-0.5 flex items-center gap-1">
			{IconComponent && (
				<IconComponent className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
			)}
			{label}
		</dt>
		<dd className="text-sm text-slate-800 break-words">
			{children || value || <span className="italic text-slate-400">N/A</span>}
		</dd>
	</div>
);
DetailItem.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.node,
	icon: PropTypes.elementType,
	children: PropTypes.node,
};

export default function UserDetail() {
	const navigate = useNavigate();
	const { userId } = useParams();
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;
		const fetchUser = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const userData = await userService.getUserById(userId);
				if (isMounted) setUser(userData);
			} catch (err) {
				console.error("Error fetching user:", err);
				if (isMounted)
					setError("Failed to load user details. Please try again.");
				if (isMounted) toast.error("Failed to load user details");
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};
		fetchUser();
		return () => {
			isMounted = false;
		};
	}, [userId]);

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			//eslint-disable-next-line
		} catch (e) {
			return "Invalid Date";
		}
	};

	const getRoleBadgeClass = (role) => {
		switch (role) {
			case "owner":
				return "bg-amber-100 text-amber-800 border border-amber-200";
			case "admin":
				return "bg-purple-100 text-purple-800 border border-purple-200";
			case "manager":
				return "bg-blue-100 text-blue-800 border border-blue-200";
			case "cashier":
				return "bg-green-100 text-green-800 border border-green-200";
			default:
				return "bg-slate-100 text-slate-700 border border-slate-200";
		}
	};
	const secondaryButtonClass =
		"inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500";

	if (isLoading) {
		return (
			<MainLayout pageTitle="Loading User...">
				<div className="flex items-center justify-center h-full">
					<LoadingSpinner size="lg" />
				</div>
			</MainLayout>
		);
	}
	if (error || !user) {
		return (
			<MainLayout pageTitle="Error">
				<div className="flex flex-col items-center justify-center h-full p-6 text-center">
					<ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-400" />
					<h1 className="mb-2 text-xl font-semibold text-slate-800">
						Error Loading User Details
					</h1>
					<p className="mb-6 text-slate-600">{error || "User not found."}</p>
					<button
						className={secondaryButtonClass}
						onClick={() => navigate("/users")}
					>
						<ArrowLeftIcon className="h-4 w-4 mr-1.5" /> Back to Users List
					</button>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout pageTitle={`User: ${user.username}`}>
			<div className="max-w-3xl mx-auto">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
					<h2 className="text-xl font-semibold text-slate-800">User Profile</h2>
					<div className="flex items-center gap-3">
						<button
							className={`${secondaryButtonClass} px-3 py-1.5 text-xs`}
							onClick={() => navigate(`/users/edit/${userId}`)}
						>
							<PencilIcon className="h-3.5 w-3.5" /> Edit User
						</button>
						<button
							className={`${secondaryButtonClass} px-3 py-1.5 text-xs`}
							onClick={() => navigate("/users")}
						>
							<ArrowLeftIcon className="h-3.5 w-3.5" /> All Users
						</button>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
					<section aria-labelledby="basic-info-heading">
						<h3
							id="basic-info-heading"
							className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2"
						>
							<UserIcon className="h-5 w-5 text-slate-400" /> Basic Information
						</h3>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<DetailItem
								label="Username"
								value={user.username}
							/>
							<DetailItem
								label="Email"
								value={user.email}
								icon={EnvelopeIcon}
							/>
							<DetailItem
								label="First Name"
								value={user.first_name}
							/>
							<DetailItem
								label="Last Name"
								value={user.last_name}
							/>
						</dl>
					</section>

					<section aria-labelledby="role-access-heading">
						<h3
							id="role-access-heading"
							className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2"
						>
							<CheckBadgeIcon className="h-5 w-5 text-slate-400" /> Role &
							System Access
						</h3>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<DetailItem label="Role">
								<span
									className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(
										user.role
									)}`}
								>
									{user.role.toUpperCase()}
								</span>
							</DetailItem>
							<DetailItem label="System Access">
								<div className="flex flex-wrap gap-1.5">
									{user.is_pos_user && (
										<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
											<BuildingStorefrontIcon className="h-3 w-3" /> POS
										</span>
									)}
									{user.is_website_user && (
										<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-lime-100 text-lime-800 border border-lime-200 flex items-center gap-1">
											<GlobeAltIcon className="h-3 w-3" /> Website
										</span>
									)}
									{!user.is_pos_user && !user.is_website_user && (
										<span className="italic text-slate-400 text-xs">None</span>
									)}
								</div>
							</DetailItem>
						</dl>
					</section>

					<section aria-labelledby="account-details-heading">
						<h3
							id="account-details-heading"
							className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2"
						>
							<InformationCircleIcon className="h-5 w-5 text-slate-400" />{" "}
							Account Details
						</h3>
						<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
							<DetailItem
								label="Last Login"
								value={formatDate(user.last_login)}
								icon={ClockIcon}
							/>
							<DetailItem
								label="Date Joined"
								value={formatDate(user.date_joined)}
								icon={CalendarDaysIcon}
							/>
							<DetailItem label="Active Status">
								<span
									className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
										user.is_active
											? "bg-green-100 text-green-800 border border-green-200"
											: "bg-red-100 text-red-800 border border-red-200"
									}`}
								>
									{user.is_active ? (
										<CheckBadgeIcon className="h-3 w-3" />
									) : (
										<XCircleIconOutline className="h-3 w-3" />
									)}
									{user.is_active ? "ACTIVE" : "INACTIVE"}
								</span>
							</DetailItem>
						</dl>
					</section>
				</div>
			</div>
		</MainLayout>
	);
}

// UserDetail does not receive props directly via routing.
