import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	KeyRound, // Lucide for KeyIcon
	Lock, // Lucide for LockClosedIcon
	ShieldCheck, // Lucide for ShieldCheckIcon
	CheckCircle2, // Lucide for CheckCircleIcon
	AlertTriangle, // Lucide for ExclamationTriangleIcon
	Info, // Lucide for InformationCircleIcon
	Loader2, // Lucide for loading
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // shadcn Switch
import { Textarea } from "@/components/ui/textarea"; // shadcn Textarea
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import LoadingSpinner from "../reports/components/LoadingSpinner";
import { motion } from "framer-motion";

// Helper component for Toggle Switch with Label and Description
const SettingsToggle = ({
	id,
	name,
	checked,
	onChange,
	label,
	description,
}) => (
	<div className="flex items-center justify-between space-x-2 py-3 border-b border-border last:border-b-0">
		<div className="space-y-0.5">
			<Label
				htmlFor={id}
				className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				{label}
			</Label>
			{description && (
				<p className="text-xs text-muted-foreground">{description}</p>
			)}
		</div>
		<Switch
			id={id}
			name={name}
			checked={checked}
			onCheckedChange={onChange} // shadcn Switch uses onCheckedChange
		/>
	</div>
);
SettingsToggle.propTypes = {
	id: PropTypes.string.isRequired,
	name: PropTypes.string.isRequired,
	checked: PropTypes.bool.isRequired,
	onChange: PropTypes.func.isRequired,
	label: PropTypes.string.isRequired,
	description: PropTypes.string,
};

// Helper component for section headings
const SectionHeading = ({ icon: Icon, title, description }) => (
	<div className="pb-4 mb-6 border-b border-border">
		<h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
			<Icon className="h-5 w-5 text-primary" />
			{title}
		</h3>
		{description && (
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		)}
	</div>
);
SectionHeading.propTypes = {
	icon: PropTypes.elementType.isRequired,
	title: PropTypes.string.isRequired,
	description: PropTypes.string,
};

export default function SecuritySettings() {
	const defaultSettings = {
		two_factor_auth: false,
		session_timeout: 30,
		password_expiry_days: 90,
		ip_restriction_enabled: false,
		allowed_ips: "",
	};

	const [settings, setSettings] = useState(defaultSettings);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);
	const [formErrors, setFormErrors] = useState({});
	// const [successMessage, setSuccessMessage] = useState(null); // Using toast for success

	const fetchSecuritySettings = useCallback(async () => {
		setIsLoading(true);
		setError(null); // setSuccessMessage(null);
		try {
			const data = await settingsService.getSecuritySettings();
			setSettings({ ...defaultSettings, ...data });
			//eslint-disable-next-line
		} catch (err) {
			setError("Failed to load security settings. Displaying default values.");
			setSettings(defaultSettings);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSecuritySettings();
	}, [fetchSecuritySettings]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setSettings((prev) => ({ ...prev, [name]: value }));
		if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
		if (error) setError(null);
		// if (successMessage) setSuccessMessage(null);
	};

	const handleSwitchChange = (name, checked) => {
		// For shadcn Switch
		setSettings((prev) => ({ ...prev, [name]: checked }));
		if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }));
		if (error) setError(null);
		// if (successMessage) setSuccessMessage(null);
	};

	const validateForm = () => {
		const errors = {};
		const timeout = Number(settings.session_timeout);
		const expiry = Number(settings.password_expiry_days);
		const ips = settings.allowed_ips.trim();

		if (isNaN(timeout) || timeout < 5 || timeout > 480) {
			errors.session_timeout = "Must be between 5 and 480 minutes.";
		}
		if (isNaN(expiry) || expiry < 0 || expiry > 365) {
			errors.password_expiry_days =
				"Must be between 0 (disabled) and 365 days.";
		}
		if (settings.ip_restriction_enabled && !ips) {
			errors.allowed_ips = "Required when IP restriction is enabled.";
		} else if (settings.ip_restriction_enabled && ips) {
			const ipLines = ips
				.split("\n")
				.map((ip) => ip.trim())
				.filter((ip) => ip);
			if (ipLines.length === 0) {
				errors.allowed_ips = "Required when IP restriction is enabled.";
			}
			if (
				ipLines.some((ip) => !/^[0-9a-fA-F.:/]+$/.test(ip) && ip.length > 0)
			) {
				// Allow empty lines initially
				errors.allowed_ips = "Invalid characters. Use IPs or CIDR ranges.";
			}
		}
		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSaveSettings = async (e) => {
		e.preventDefault();
		if (!validateForm()) {
			toast.warn("Please fix the errors in the form.");
			return;
		}
		setIsSaving(true);
		setError(null); // setSuccessMessage(null);
		const payload = {
			...settings,
			session_timeout: Number(settings.session_timeout),
			password_expiry_days: Number(settings.password_expiry_days),
			allowed_ips: settings.ip_restriction_enabled
				? settings.allowed_ips.trim()
				: "",
		};
		try {
			await settingsService.updateSecuritySettings(payload);
			toast.success("Security settings updated successfully!");
		} catch (err) {
			const message = err.response?.data?.error || "Failed to save settings.";
			setError(message);
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="p-4 sm:p-6 space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<ShieldCheck className="h-5 w-5 text-primary" />
						Security Settings
					</CardTitle>
					<CardDescription>
						Manage authentication, session, and access control settings.
					</CardDescription>
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
					{/* Success message is handled by toast */}

					{isLoading ? (
						<div className="flex items-center justify-center py-10">
							<LoadingSpinner size="md" />
						</div>
					) : (
						<form
							onSubmit={handleSaveSettings}
							className="space-y-8"
						>
							<section>
								<SectionHeading
									icon={Lock}
									title="Authentication Settings"
								/>
								<div className="space-y-2">
									<SettingsToggle
										id="two_factor_auth"
										name="two_factor_auth"
										checked={settings.two_factor_auth}
										onChange={(checked) =>
											handleSwitchChange("two_factor_auth", checked)
										}
										label="Two-Factor Authentication (2FA)"
										description="Require 2FA for all administrator accounts."
									/>
									<div className="pt-4 space-y-1">
										<Label htmlFor="session_timeout">
											Session Timeout (minutes)
										</Label>
										<Input
											type="number"
											id="session_timeout"
											name="session_timeout"
											value={settings.session_timeout}
											onChange={handleInputChange}
											min="5"
											max="480"
											step="1"
											className={`max-w-xs ${
												formErrors.session_timeout
													? "border-destructive ring-destructive"
													: ""
											}`}
										/>
										{formErrors.session_timeout && (
											<p className="text-xs text-destructive mt-1">
												{formErrors.session_timeout}
											</p>
										)}
										<p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
											<Info className="h-3 w-3" /> Period of inactivity before
											automatic logout.
										</p>
									</div>
									<div className="pt-4 space-y-1">
										<Label htmlFor="password_expiry_days">
											Password Expiry (days)
										</Label>
										<Input
											type="number"
											id="password_expiry_days"
											name="password_expiry_days"
											value={settings.password_expiry_days}
											onChange={handleInputChange}
											min="0"
											max="365"
											step="1"
											className={`max-w-xs ${
												formErrors.password_expiry_days
													? "border-destructive ring-destructive"
													: ""
											}`}
										/>
										{formErrors.password_expiry_days && (
											<p className="text-xs text-destructive mt-1">
												{formErrors.password_expiry_days}
											</p>
										)}
										<p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
											<Info className="h-3 w-3" /> Set to 0 to disable password
											expiration.
										</p>
									</div>
								</div>
							</section>

							<section>
								<SectionHeading
									icon={KeyRound}
									title="Access Restrictions"
								/>
								<div className="space-y-2">
									<SettingsToggle
										id="ip_restriction_enabled"
										name="ip_restriction_enabled"
										checked={settings.ip_restriction_enabled}
										onChange={(checked) =>
											handleSwitchChange("ip_restriction_enabled", checked)
										}
										label="Enable IP Address Restrictions"
										description="Limit access to specific IP addresses or ranges."
									/>
									{settings.ip_restriction_enabled && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											className="pt-4 space-y-1"
										>
											<Label htmlFor="allowed_ips">
												Allowed IP Addresses / Ranges
											</Label>
											<Textarea
												id="allowed_ips"
												name="allowed_ips"
												rows="4"
												value={settings.allowed_ips}
												onChange={handleInputChange}
												placeholder="192.168.1.1&#10;10.0.0.0/24"
												className={`font-mono text-sm ${
													formErrors.allowed_ips
														? "border-destructive ring-destructive"
														: ""
												}`}
											/>
											{formErrors.allowed_ips && (
												<p className="text-xs text-destructive mt-1">
													{formErrors.allowed_ips}
												</p>
											)}
											<p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
												<Info className="h-3 w-3" /> Enter one IP or CIDR range
												per line.
											</p>
										</motion.div>
									)}
								</div>
							</section>

							<div className="flex justify-end pt-6">
								<Button
									type="submit"
									disabled={isSaving || isLoading}
								>
									{isSaving ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<CheckCircle2 className="mr-2 h-4 w-4" />
									)}
									{isSaving ? "Saving..." : "Save Security Settings"}
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
