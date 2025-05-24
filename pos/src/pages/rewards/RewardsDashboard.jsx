import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ChevronRight,
	Gift,
	Users,
	Star,
	RefreshCw,
	AlertTriangle,
	Settings2,
	QrCode,
	ListChecks,
} from "lucide-react";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import MainLayout from "../layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color = "slate" }) => {
	const colors = {
		blue: "bg-blue-500/10 text-blue-600",
		green: "bg-emerald-500/10 text-emerald-600",
		purple: "bg-purple-500/10 text-purple-600",
		slate: "bg-slate-500/10 text-slate-600",
	};
	const selectedColorClass = colors[color] || colors.slate;

	return (
		<Card className="shadow-sm hover:shadow-md transition-shadow">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<div
					className={`flex h-8 w-8 items-center justify-center rounded-full ${selectedColorClass}`}
				>
					<Icon className="h-4 w-4" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold text-foreground">{value}</div>
			</CardContent>
		</Card>
	);
};
StatCard.propTypes = {
	title: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	icon: PropTypes.elementType.isRequired,
	color: PropTypes.string,
};

// Navigation Card Component
const NavCard = ({ to, title, description, icon: Icon }) => (
	<Link
		to={to}
		className="block group"
	>
		<Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30">
			<CardContent className="p-5">
				<div className="flex items-center justify-between mb-3">
					<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<Icon className="h-5 w-5" />
					</div>
					<ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
				</div>
				<h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
					{title}
				</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	</Link>
);
NavCard.propTypes = {
	to: PropTypes.string.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string.isRequired,
	icon: PropTypes.elementType.isRequired,
};

export default function RewardsDashboard() {
	const [summaryStats, setSummaryStats] = useState({
		totalCustomers: 0,
		totalPointsIssued: 0,
		activeRewards: 0,
	});
	// eslint-disable-next-line
	const navigate = useNavigate();
	const { execute, isLoading, error: apiErrorHook } = useApi();
	const [fetchError, setFetchError] = useState(null);

	const fetchData = useCallback(async () => {
		setFetchError(null);
		try {
			const [profilesResponse, rewardsResponse] = await Promise.all([
				execute(() => rewardsService.getAllProfiles()),
				execute(() => rewardsService.getRewards()),
			]);

			const profiles = Array.isArray(profilesResponse) ? profilesResponse : [];
			const rewards = Array.isArray(rewardsResponse) ? rewardsResponse : [];

			const totalPoints = profiles.reduce(
				(sum, profile) => sum + (profile.lifetime_points || 0),
				0
			);
			const activeRewardsCount = rewards.filter(
				(reward) => reward?.is_active
			).length;

			setSummaryStats({
				totalCustomers: profiles.length,
				totalPointsIssued: totalPoints,
				activeRewards: activeRewardsCount,
			});
		} catch (err) {
			console.error("Error fetching rewards summary stats:", err);
			const message =
				apiErrorHook ||
				err.message ||
				"Failed to load rewards statistics. Please try again.";
			setFetchError(message);
			toast.error(message);
			setSummaryStats({
				totalCustomers: 0,
				totalPointsIssued: 0,
				activeRewards: 0,
			});
		}
	}, [execute, apiErrorHook]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const showLoadingSpinner =
		isLoading &&
		summaryStats.totalCustomers === 0 &&
		summaryStats.activeRewards === 0 &&
		!fetchError;

	return (
		<MainLayout pageTitle="Rewards Program">
			<div className="space-y-6">
				{showLoadingSpinner && (
					<div className="flex items-center justify-center py-10">
						<LoadingSpinner size="md" />
					</div>
				)}

				{fetchError && !isLoading && (
					<Card className="border-destructive/50 bg-destructive/10">
						<CardHeader>
							<CardTitle className="text-destructive flex items-center gap-2">
								<AlertTriangle className="h-5 w-5" />
								Error Loading Data
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-destructive mb-3">{fetchError}</p>
							<Button
								variant="destructive"
								size="sm"
								onClick={fetchData}
								disabled={isLoading}
							>
								<RefreshCw className="h-4 w-4 mr-2" /> Retry
							</Button>
						</CardContent>
					</Card>
				)}

				{!showLoadingSpinner && !fetchError && (
					<>
						<section aria-labelledby="stats-heading">
							<h2
								id="stats-heading"
								className="sr-only"
							>
								Statistics
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<StatCard
									title="Total Members"
									value={summaryStats.totalCustomers.toLocaleString()}
									icon={Users}
									color="blue"
								/>
								<StatCard
									title="Total Points Issued"
									value={summaryStats.totalPointsIssued.toLocaleString()}
									icon={Star}
									color="green"
								/>
								<StatCard
									title="Active Reward Items"
									value={summaryStats.activeRewards.toLocaleString()}
									icon={Gift}
									color="purple"
								/>
							</div>
						</section>

						<section aria-labelledby="actions-heading">
							<h2
								id="actions-heading"
								className="text-lg font-semibold text-foreground mb-4"
							>
								Manage Rewards Program
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<NavCard
									to="/rewards/reward-items"
									title="Reward Items"
									description="Create, edit, and manage available rewards for redemption."
									icon={ListChecks}
								/>
								<NavCard
									to="/rewards/rules"
									title="Points Rules"
									description="Configure how customers earn points (e.g., per dollar spent)."
									icon={Settings2}
								/>
								<NavCard
									to="/rewards/verify"
									title="Verify Redemption"
									description="Verify and mark reward redemption codes as used by customers."
									icon={QrCode}
								/>
							</div>
						</section>
					</>
				)}
			</div>
		</MainLayout>
	);
}
