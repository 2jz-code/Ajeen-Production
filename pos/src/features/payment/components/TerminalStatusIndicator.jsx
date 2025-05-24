import { motion } from "framer-motion";
import { Tablet, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTerminal } from "../hooks/useTerminal";
import { useEffect } from "react";

const TerminalStatusIndicator = () => {
	const { status, deviceInfo, lastChecked, isChecking, checkStatus } =
		useTerminal();

	const getStatusConfig = () => {
		const configs = {
			online: {
				variant: "default",
				className: "bg-emerald-500 hover:bg-emerald-600",
				label: "Ready",
				dotColor: "bg-emerald-500",
				pulseColor: "bg-emerald-400",
			},
			offline: {
				variant: "destructive",
				className: "bg-red-500 hover:bg-red-600",
				label: "Offline",
				dotColor: "bg-red-500",
				pulseColor: "bg-red-400",
			},
			not_found: {
				variant: "secondary",
				className: "bg-amber-500 hover:bg-amber-600",
				label: "Not Found",
				dotColor: "bg-amber-500",
				pulseColor: "bg-amber-400",
			},
			network_error: {
				variant: "outline",
				className: "bg-blue-500 hover:bg-blue-600",
				label: "Connection Error",
				dotColor: "bg-blue-500",
				pulseColor: "bg-blue-400",
			},
			unauthorized: {
				variant: "secondary",
				className: "bg-purple-500 hover:bg-purple-600",
				label: "Auth Error",
				dotColor: "bg-purple-500",
				pulseColor: "bg-purple-400",
			},
			error: {
				variant: "destructive",
				className: "bg-red-500 hover:bg-red-600",
				label: "Error",
				dotColor: "bg-red-500",
				pulseColor: "bg-red-400",
			},
			unknown: {
				variant: "outline",
				className: "bg-slate-400 hover:bg-slate-500",
				label: "Checking...",
				dotColor: "bg-slate-400",
				pulseColor: "bg-slate-300",
			},
		};

		return configs[status] || configs.unknown;
	};

	useEffect(() => {
		checkStatus();
	}, []);

	const statusConfig = getStatusConfig();
	const formattedTime = lastChecked
		? new Intl.DateTimeFormat("en-US", {
				hour: "2-digit",
				minute: "2-digit",
		  }).format(lastChecked)
		: "";

	return (
		<motion.div
			className="mx-4 mb-3"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card className="shadow-sm border-slate-200">
				<CardContent className="p-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="relative flex items-center justify-center">
								<div
									className={`${statusConfig.dotColor} h-3 w-3 rounded-full`}
								></div>
								{status === "online" && (
									<motion.div
										className={`absolute inset-0 ${statusConfig.pulseColor} rounded-full`}
										animate={{
											scale: [1, 1.8, 1],
											opacity: [0.8, 0, 0.8],
										}}
										transition={{
											duration: 2,
											repeat: Number.POSITIVE_INFINITY,
											repeatType: "loop",
										}}
									/>
								)}
							</div>

							<div className="flex items-center gap-2">
								<Tablet className="h-4 w-4 text-slate-600" />
								<div className="flex flex-col">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-slate-700">
											Terminal
										</span>
										<Badge
											variant={statusConfig.variant}
											className="text-xs"
										>
											{statusConfig.label}
										</Badge>
									</div>
									{deviceInfo && status === "online" && (
										<span className="text-xs text-slate-500">
											{deviceInfo.label}
										</span>
									)}
								</div>
							</div>
						</div>

						{lastChecked && (
							<div className="flex items-center gap-2">
								<span className="text-xs text-slate-500">{formattedTime}</span>
								<Button
									onClick={checkStatus}
									disabled={isChecking}
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0"
								>
									<RefreshCw
										className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`}
									/>
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
};

export default TerminalStatusIndicator;
