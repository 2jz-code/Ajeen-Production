import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { rewardsService } from "../../api/services/rewardsService";
import { useApi } from "../../api/hooks/useApi";
import { toast } from "react-toastify";
import {
	ArrowLeft,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Info,
	Ticket,
	User,
	CalendarDays,
	Hash,
	Star,
} from "lucide-react";
import MainLayout from "../layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import LoadingSpinner from "../reports/components/LoadingSpinner";

export default function VerifyRedemption() {
	const navigate = useNavigate();
	const { execute, isLoading, error: apiErrorHook } = useApi();

	const [redemptionCode, setRedemptionCode] = useState("");
	const [verificationResult, setVerificationResult] = useState(null);
	const [verificationError, setVerificationError] = useState(null);

	const handleVerify = async (e) => {
		e.preventDefault();
		setVerificationError(null);
		setVerificationResult(null);

		if (!redemptionCode.trim()) {
			toast.error("Please enter a redemption code.");
			setVerificationError("Redemption code cannot be empty.");
			return;
		}

		try {
			const result = await execute(() =>
				rewardsService.verifyRedemptionCode(redemptionCode.trim())
			);
			setVerificationResult(result);
			toast.success("Redemption code details fetched.");
		} catch (error) {
			const message =
				apiErrorHook || error.message || "Invalid or expired redemption code.";
			setVerificationError(message);
			toast.error(message);
			setVerificationResult(null);
		}
	};

	const handleMarkAsUsed = async () => {
		if (
			!verificationResult ||
			!verificationResult.redemption ||
			!verificationResult.redemption.code
		) {
			toast.error("No valid redemption to mark as used.");
			return;
		}
		setVerificationError(null);

		try {
			const result = await execute(
				() =>
					rewardsService.verifyRedemptionCode(
						verificationResult.redemption.code
					) // API handles marking as used
			);
			setVerificationResult(result);
			toast.success("Reward marked as used successfully!");
		} catch (error) {
			const message =
				apiErrorHook || error.message || "Failed to mark reward as used.";
			setVerificationError(message);
			toast.error(message);
		}
	};

	const formatDate = (timestamp) => {
		if (!timestamp) return "N/A";
		try {
			return new Date(timestamp).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			});
			// eslint-disable-next-line
		} catch (e) {
			return "Invalid Date";
		}
	};

	return (
		<MainLayout pageTitle="Verify Reward Redemption">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-2xl font-semibold text-foreground">
					Verify & Redeem Reward
				</h1>
				<Button
					variant="outline"
					onClick={() => navigate("/rewards")}
					disabled={isLoading}
				>
					<ArrowLeft className="h-4 w-4 mr-2" />
					Back to Rewards Hub
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Enter Redemption Code</CardTitle>
						<CardDescription>
							Input the customer&apos;s redemption code to verify its validity.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handleVerify}
							className="space-y-4"
						>
							<div className="space-y-1.5">
								<Label htmlFor="redemptionCode">Redemption Code</Label>
								<Input
									id="redemptionCode"
									type="text"
									value={redemptionCode}
									onChange={(e) => setRedemptionCode(e.target.value)}
									placeholder="Enter code (e.g., ABC-123)"
									required
									className={verificationError ? "border-destructive" : ""}
								/>
							</div>
							<Button
								type="submit"
								disabled={isLoading || !redemptionCode.trim()}
								className="w-full"
							>
								{isLoading && !verificationResult && !verificationError ? ( // Show spinner only during initial verify
									<LoadingSpinner
										size="sm"
										className="mr-2"
									/>
								) : null}
								Verify Code
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card className="md:col-span-1">
					<CardHeader>
						<CardTitle>Verification Result</CardTitle>
						<CardDescription>
							Details of the verified redemption code will appear here.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading &&
							!verificationResult &&
							!verificationError && ( // Show spinner only during initial verify loading
								<div className="flex justify-center items-center py-8">
									<LoadingSpinner size="md" />
								</div>
							)}
						{verificationError && !isLoading && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-center">
								<AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
								<p className="text-sm font-medium text-destructive">
									Verification Failed
								</p>
								<p className="text-xs text-destructive/80 mt-1">
									{verificationError}
								</p>
							</div>
						)}
						{!verificationError && verificationResult && (
							<div className="space-y-4">
								<div
									className={`rounded-md border p-4 flex items-center gap-3 ${
										verificationResult.redemption.is_used
											? "bg-slate-500/10 border-slate-500/20"
											: "bg-green-500/10 border-green-500/20"
									}`}
								>
									{verificationResult.redemption.is_used ? (
										<XCircle className="h-6 w-6 text-slate-500 flex-shrink-0" />
									) : (
										<CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
									)}
									<div>
										<p
											className={`text-sm font-semibold ${
												verificationResult.redemption.is_used
													? "text-slate-700"
													: "text-green-700"
											}`}
										>
											{verificationResult.redemption.is_used
												? "Code Already Used"
												: "Valid Redemption Code"}
										</p>
										<p className="text-xs text-muted-foreground">
											{verificationResult.redemption.is_used
												? `Used on: ${formatDate(
														verificationResult.redemption.used_at
												  )}`
												: "This code is valid and ready to be marked as used."}
										</p>
									</div>
								</div>

								<div className="space-y-3 text-sm">
									<h4 className="font-medium text-foreground mb-1">
										Reward Details:
									</h4>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<Ticket className="h-3.5 w-3.5" />
											Reward:
										</span>
										<span className="font-medium text-foreground">
											{verificationResult.reward.name}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<Info className="h-3.5 w-3.5" />
											Description:
										</span>
										<span className="text-right text-foreground">
											{verificationResult.reward.description || "N/A"}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<Star className="h-3.5 w-3.5" />
											Points Used:
										</span>
										<span className="font-medium text-primary">
											{verificationResult.redemption.points_used}
										</span>
									</div>

									<h4 className="font-medium text-foreground pt-3 border-t border-border mt-3 mb-1">
										Redemption Info:
									</h4>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<User className="h-3.5 w-3.5" />
											Customer:
										</span>
										<span className="font-medium text-foreground">
											{verificationResult.customer_name || "Unknown"}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<CalendarDays className="h-3.5 w-3.5" />
											Redeemed At:
										</span>
										<span className="text-foreground">
											{formatDate(verificationResult.redemption.redeemed_at)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground flex items-center gap-1">
											<Hash className="h-3.5 w-3.5" />
											Code:
										</span>
										<span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
											{verificationResult.redemption.code}
										</span>
									</div>
								</div>

								{!verificationResult.redemption.is_used && (
									<Button
										onClick={handleMarkAsUsed}
										disabled={isLoading}
										className="w-full mt-4"
									>
										{isLoading && (
											<LoadingSpinner
												size="sm"
												className="mr-2"
											/>
										)}
										Mark as Used & Complete Redemption
									</Button>
								)}
							</div>
						)}
						{!isLoading &&
							!verificationResult &&
							!verificationError && ( // Initial state before any verification attempt
								<div className="text-center py-8 text-muted-foreground">
									<Info className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
									<p>Enter a code to verify its details.</p>
								</div>
							)}
					</CardContent>
				</Card>
			</div>
		</MainLayout>
	);
}
