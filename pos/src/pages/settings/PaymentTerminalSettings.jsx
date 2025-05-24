import { useState, useEffect, useCallback } from "react";
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	TabletSmartphone, // Lucide for DeviceTabletIcon
	RefreshCw, // Lucide for ArrowPathIcon (Sync)
	Plus, // Lucide for PlusIcon
	CheckCircle2, // Lucide for CheckCircleIcon
	XCircle, // Lucide for XCircleIcon
	AlertTriangle, // Lucide for ExclamationTriangleIcon
	Info, // Lucide for InformationCircleIcon
	Loader2, // Lucide for loading animation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

// Helper: Format date string
const formatDate = (dateString) => {
	if (!dateString) return "Never";
	try {
		return new Date(dateString).toLocaleString(undefined, {
			dateStyle: "short",
			timeStyle: "short",
		});
	} catch {
		return "Invalid Date";
	}
};

// Helper: Get status pill styling
const getStatusPill = (status) => {
	const lowerStatus = status?.toLowerCase();
	const baseClasses =
		"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold";
	if (lowerStatus === "online") {
		return (
			<span
				className={`${baseClasses} bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700`}
			>
				<CheckCircle2 className="h-3.5 w-3.5" /> ONLINE
			</span>
		);
	} else {
		return (
			<span
				className={`${baseClasses} bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700`}
			>
				<XCircle className="h-3.5 w-3.5" />{" "}
				{String(status || "OFFLINE").toUpperCase()}
			</span>
		);
	}
};

export default function PaymentTerminalSettings() {
	const [terminals, setTerminals] = useState([]);
	const [locations, setLocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);
	const [error, setError] = useState(null);
	const [formError, setFormError] = useState(null);
	const [showRegisterForm, setShowRegisterForm] = useState(false);

	const [selectedLocation, setSelectedLocation] = useState("");
	const [registrationCode, setRegistrationCode] = useState("");
	const [readerLabel, setReaderLabel] = useState("");

	const fetchData = useCallback(async (showLoading = true) => {
		if (showLoading) setIsLoading(true);
		setError(null);
		try {
			const [locationsData, terminalsData] = await Promise.all([
				settingsService.getLocations(),
				settingsService.getTerminalReaders(),
			]);
			setLocations(Array.isArray(locationsData) ? locationsData : []);
			setTerminals(Array.isArray(terminalsData) ? terminalsData : []);
		} catch (err) {
			console.error("Error fetching settings data:", err);
			setError("Failed to load locations or terminals. Please try refreshing.");
			setLocations([]);
			setTerminals([]);
		} finally {
			if (showLoading) setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const syncWithStripe = async () => {
		setIsSyncing(true);
		setError(null);
		try {
			await settingsService.syncLocations();
			const result = await settingsService.syncReaders();
			toast.success(
				result.message ||
					"Locations and Terminals synced with Stripe successfully!"
			);
			await fetchData(false);
		} catch (err) {
			const message =
				err.response?.data?.error || "Failed to sync with Stripe.";
			setError(message);
			toast.error(message);
		} finally {
			setIsSyncing(false);
		}
	};

	const registerNewTerminal = async (e) => {
		e.preventDefault();
		setFormError(null);
		if (!selectedLocation || !readerLabel || !registrationCode) {
			setFormError("Please fill in all required fields for registration.");
			return;
		}
		setIsRegistering(true);
		try {
			await settingsService.registerTerminalReader({
				location: selectedLocation,
				label: readerLabel.trim(),
				registration_code: registrationCode.trim(),
			});
			toast.success(
				`Terminal "${readerLabel.trim()}" registered successfully!`
			);
			setSelectedLocation("");
			setReaderLabel("");
			setRegistrationCode("");
			setShowRegisterForm(false);
			await fetchData(false);
		} catch (err) {
			const message =
				err.response?.data?.error || "Failed to register terminal.";
			setFormError(message);
			toast.error(message);
		} finally {
			setIsRegistering(false);
		}
	};

	const inputCommonClass = "h-9"; // For consistency with other shadcn inputs

	return (
		<div className="p-4 sm:p-6 space-y-6">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle className="flex items-center gap-2 text-lg">
							<TabletSmartphone className="h-5 w-5 text-primary" />
							Payment Terminal Management
						</CardTitle>
						<div className="flex flex-shrink-0 gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowRegisterForm(!showRegisterForm)}
								disabled={isSyncing || isLoading || isRegistering}
							>
								{showRegisterForm ? (
									<XCircle className="mr-2 h-4 w-4" />
								) : (
									<Plus className="mr-2 h-4 w-4" />
								)}
								{showRegisterForm ? "Cancel Registration" : "Register Terminal"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={syncWithStripe}
								disabled={isSyncing || isLoading || isRegistering}
							>
								{isSyncing ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 h-4 w-4" />
								)}
								{isSyncing ? "Syncing..." : "Sync with Stripe"}
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<div
							role="alert"
							className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
						>
							<AlertTriangle className="h-5 w-5 flex-shrink-0" />
							<span>{error}</span>
						</div>
					)}

					{showRegisterForm && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className="mb-6 rounded-lg border bg-muted/30 p-4"
						>
							<h3 className="mb-3 text-md font-semibold text-foreground">
								Register New Terminal
							</h3>
							{formError && (
								<div
									role="alert"
									className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700"
								>
									<AlertTriangle className="h-4 w-4 flex-shrink-0" />
									<span>{formError}</span>
								</div>
							)}
							<form
								onSubmit={registerNewTerminal}
								className="space-y-4"
							>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
									<div className="space-y-1 md:col-span-1 lg:col-span-1">
										<Label htmlFor="location">
											Location <span className="text-destructive">*</span>
										</Label>
										<Select
											value={selectedLocation}
											onValueChange={setSelectedLocation}
											name="location"
											required
										>
											<SelectTrigger
												id="location"
												className={inputCommonClass}
											>
												<SelectValue placeholder="Select location..." />
											</SelectTrigger>
											<SelectContent>
												{locations.map((loc) => (
													<SelectItem
														key={loc.id}
														value={loc.id.toString()}
													>
														{loc.display_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1 md:col-span-1 lg:col-span-1">
										<Label htmlFor="readerLabel">
											Terminal Name <span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											id="readerLabel"
											value={readerLabel}
											onChange={(e) => setReaderLabel(e.target.value)}
											required
											placeholder="e.g., Front Counter"
											className={inputCommonClass}
										/>
									</div>
									<div className="space-y-1 md:col-span-1 lg:col-span-1">
										<Label htmlFor="registrationCode">
											Registration Code{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											id="registrationCode"
											value={registrationCode}
											onChange={(e) => setRegistrationCode(e.target.value)}
											required
											placeholder="e.g., cool-cactus-choice"
											className={`${inputCommonClass} font-mono placeholder:font-sans placeholder:normal-case`}
										/>
										<p className="text-xs text-muted-foreground flex items-center gap-1">
											<Info className="h-3 w-3" /> Find on terminal screen.
										</p>
									</div>
									<div className="flex items-end md:col-span-3 lg:col-span-1">
										<Button
											type="submit"
											className="w-full"
											disabled={
												isRegistering ||
												!selectedLocation ||
												!readerLabel ||
												!registrationCode
											}
										>
											{isRegistering ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Plus className="mr-2 h-4 w-4" />
											)}
											{isRegistering ? "Registering..." : "Register"}
										</Button>
									</div>
								</div>
							</form>
						</motion.div>
					)}

					<div className="overflow-x-auto">
						{isLoading && terminals.length === 0 ? (
							<div className="py-10 text-center text-sm text-muted-foreground">
								<Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
								Loading terminals...
							</div>
						) : !isLoading && terminals.length === 0 && !error ? (
							<div className="py-10 text-center text-sm text-muted-foreground">
								No terminal readers found. Register one or sync with Stripe.
							</div>
						) : terminals.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Device ID</TableHead>
										<TableHead>Location</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Device Type</TableHead>
										<TableHead className="text-right">Last Seen</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{terminals.map((terminal) => (
										<TableRow
											key={terminal.id}
											className="hover:bg-muted/50"
										>
											<TableCell className="font-medium">
												{terminal.label}
											</TableCell>
											<TableCell className="font-mono text-xs">
												{terminal.stripe_reader_id || terminal.id}
											</TableCell>
											<TableCell>
												{terminal.location_display || (
													<span className="italic text-muted-foreground">
														Unknown
													</span>
												)}
											</TableCell>
											<TableCell>{getStatusPill(terminal.status)}</TableCell>
											<TableCell>
												{terminal.device_type || (
													<span className="italic text-muted-foreground">
														Unknown
													</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{formatDate(terminal.last_seen)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : null}
					</div>
				</CardContent>
				{terminals.length > 0 && (
					<CardFooter className="text-xs text-muted-foreground justify-end">
						Showing {terminals.length} terminal(s).
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
