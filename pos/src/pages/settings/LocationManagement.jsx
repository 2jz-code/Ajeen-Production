import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { settingsService } from "../../api/services/settingsService";
import { toast } from "react-toastify";
import {
	Trash2, // Lucide
	Edit2, // Lucide
	MapPin,
	Plus,
	RefreshCw, // Lucide for Sync
	Check,
	AlertTriangle,
	Loader2, // Lucide for loading
} from "lucide-react";
import ConfirmationModal from "../../components/ConfirmationModal";
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
import { motion } from "framer-motion";
// FormField remains the same as in your original Settings.jsx for consistency if preferred,
// or we can integrate Label/Input from shadcn directly. For this example, let's use Label/Input.

// Helper components for table styling
const Th = ({ children, align = "left", className = "" }) => (
	<th
		scope="col"
		className={`whitespace-nowrap px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
	>
		{children}
	</th>
);
Th.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

// eslint-disable-next-line
const Td = ({ children, align = "left", className = "" }) => (
	<td
		className={`px-4 py-3 whitespace-nowrap text-sm text-foreground ${className}`}
	>
		{children}
	</td>
);
Td.propTypes = {
	children: PropTypes.node,
	align: PropTypes.string,
	className: PropTypes.string,
};

export default function LocationManagement() {
	const [locations, setLocations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSyncing, setIsSyncing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);
	const [formError, setFormError] = useState(null);
	// const [successMessage, setSuccessMessage] = useState(null); // Using toast for success
	const [showForm, setShowForm] = useState(false);
	const [editingLocation, setEditingLocation] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [locationToDelete, setLocationToDelete] = useState(null);

	const initialFormData = {
		display_name: "",
		address_line1: "",
		address_line2: "",
		city: "",
		state: "",
		country: "US",
		postal_code: "",
	};
	const [formData, setFormData] = useState(initialFormData);

	const fetchLocations = useCallback(async (showLoading = true) => {
		if (showLoading) setIsLoading(true);
		setError(null);
		try {
			const data = await settingsService.getLocations();
			setLocations(Array.isArray(data) ? data : []);
		} catch (err) {
			console.error("Error fetching locations:", err);
			setError("Failed to load locations. Please try refreshing.");
			setLocations([]);
		} finally {
			if (showLoading) setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLocations();
	}, [fetchLocations]);

	const syncWithStripe = async () => {
		setIsSyncing(true);
		setError(null); // setSuccessMessage(null);
		try {
			const result = await settingsService.syncLocations();
			toast.success(
				result.message || "Locations synced with Stripe successfully!"
			);
			await fetchLocations(false);
		} catch (err) {
			const message =
				err.response?.data?.error || "Failed to sync with Stripe.";
			setError(message);
			toast.error(message);
		} finally {
			setIsSyncing(false);
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
		if (formError) setFormError(null);
	};

	const handleSelectChange = (name, value) => {
		// For shadcn Select
		setFormData({ ...formData, [name]: value });
		if (formError) setFormError(null);
	};

	const resetAndHideForm = () => {
		setFormData(initialFormData);
		setEditingLocation(null);
		setShowForm(false);
		setFormError(null);
	};

	const handleEdit = (location) => {
		setEditingLocation(location);
		setFormData({
			display_name: location.display_name || "",
			address_line1: location.address?.line1 || "",
			address_line2: location.address?.line2 || "",
			city: location.address?.city || "",
			state: location.address?.state || "",
			country: location.address?.country || "US",
			postal_code: location.address?.postal_code || "",
		});
		setShowForm(true);
		setFormError(null);
	};

	const handleAdd = () => {
		setFormData(initialFormData); // Reset for add
		setEditingLocation(null);
		setShowForm(true);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSaving(true);
		setFormError(null);
		if (
			!formData.display_name ||
			!formData.address_line1 ||
			!formData.city ||
			!formData.state ||
			!formData.postal_code ||
			!formData.country
		) {
			setFormError("Please fill in all required fields marked with *");
			setIsSaving(false);
			return;
		}
		try {
			let message = "";
			if (editingLocation) {
				await settingsService.updateLocation(editingLocation.id, formData);
				message = `Location "${formData.display_name}" updated!`;
			} else {
				await settingsService.createLocation(formData);
				message = `Location "${formData.display_name}" created!`;
			}
			toast.success(message);
			resetAndHideForm();
			await fetchLocations(false);
		} catch (err) {
			const message = err.response?.data?.error || "Failed to save location.";
			setFormError(message);
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteClick = (location) => {
		setLocationToDelete(location);
		setShowDeleteModal(true);
	};

	const handleConfirmDelete = async () => {
		if (!locationToDelete) return;
		setIsLoading(true); // Use general loading for delete operation
		setError(null);
		setShowDeleteModal(false);
		try {
			await settingsService.deleteLocation(locationToDelete.id);
			toast.success(`Location "${locationToDelete.display_name}" deleted.`);
			setLocationToDelete(null);
			await fetchLocations(false);
		} catch (err) {
			const message = err.response?.data?.error || "Failed to delete location.";
			setError(message);
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="p-4 sm:p-6 space-y-6">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<CardTitle className="flex items-center gap-2 text-lg">
							<MapPin className="h-5 w-5 text-primary" />
							Locations
						</CardTitle>
						<div className="flex flex-shrink-0 gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={syncWithStripe}
								disabled={isSyncing || isLoading || isSaving}
							>
								{isSyncing ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 h-4 w-4" />
								)}
								{isSyncing ? "Syncing..." : "Sync with Stripe"}
							</Button>
							<Button
								size="sm"
								onClick={handleAdd}
								disabled={showForm || isSyncing || isLoading || isSaving}
							>
								<Plus className="mr-2 h-4 w-4" /> Add Location
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

					{showForm && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className="mb-6 rounded-lg border bg-muted/30 p-4"
						>
							<h3 className="mb-4 text-md font-semibold text-foreground">
								{editingLocation ? "Edit Location" : "Add New Location"}
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
								onSubmit={handleSubmit}
								className="space-y-4"
							>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div className="sm:col-span-2 space-y-1">
										<Label htmlFor="display_name">
											Location Name <span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											name="display_name"
											id="display_name"
											required
											value={formData.display_name}
											onChange={handleInputChange}
											placeholder="e.g., Downtown Branch"
										/>
									</div>
									<div className="sm:col-span-2 space-y-1">
										<Label htmlFor="address_line1">
											Address Line 1 <span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											name="address_line1"
											id="address_line1"
											required
											value={formData.address_line1}
											onChange={handleInputChange}
											placeholder="123 Main St"
										/>
									</div>
									<div className="sm:col-span-2 space-y-1">
										<Label htmlFor="address_line2">
											Address Line 2{" "}
											<span className="text-xs text-muted-foreground">
												(Optional)
											</span>
										</Label>
										<Input
											type="text"
											name="address_line2"
											id="address_line2"
											value={formData.address_line2}
											onChange={handleInputChange}
											placeholder="Apt, Suite, etc."
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="city">
											City <span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											name="city"
											id="city"
											required
											value={formData.city}
											onChange={handleInputChange}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="state">
											State / Province{" "}
											<span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											name="state"
											id="state"
											required
											value={formData.state}
											onChange={handleInputChange}
											placeholder="e.g., CA or Ontario"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="postal_code">
											Postal Code <span className="text-destructive">*</span>
										</Label>
										<Input
											type="text"
											name="postal_code"
											id="postal_code"
											required
											value={formData.postal_code}
											onChange={handleInputChange}
											placeholder="e.g., 90210"
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="country">
											Country <span className="text-destructive">*</span>
										</Label>
										<Select
											name="country"
											value={formData.country}
											onValueChange={(value) =>
												handleSelectChange("country", value)
											}
										>
											<SelectTrigger id="country">
												<SelectValue placeholder="Select country" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="US">United States</SelectItem>
												<SelectItem value="CA">Canada</SelectItem>
												{/* Add other countries if needed */}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={resetAndHideForm}
										disabled={isSaving}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={isSaving || isLoading}
									>
										{isSaving ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Check className="mr-2 h-4 w-4" />
										)}
										{isSaving
											? "Saving..."
											: editingLocation
											? "Update"
											: "Save"}
									</Button>
								</div>
							</form>
						</motion.div>
					)}

					<div className="overflow-x-auto">
						{isLoading && locations.length === 0 ? (
							<div className="py-10 text-center text-sm text-muted-foreground">
								<Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
								Loading locations...
							</div>
						) : !isLoading && locations.length === 0 && !error ? (
							<div className="py-10 text-center text-sm text-muted-foreground">
								No locations found. Add one or sync with Stripe.
							</div>
						) : locations.length > 0 ? (
							<table className="min-w-full">
								<thead className="border-b">
									<tr>
										<Th>Location Name</Th>
										<Th>Address</Th>
										<Th>City</Th>
										<Th>State</Th>
										<Th>Postal Code</Th>
										<Th align="right">Actions</Th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{locations.map((location) => (
										<tr
											key={location.id}
											className="hover:bg-muted/50"
										>
											<Td className="font-medium">{location.display_name}</Td>
											<Td>
												{location.address?.line1}
												{location.address?.line2
													? `, ${location.address.line2}`
													: ""}
											</Td>
											<Td>{location.address?.city}</Td>
											<Td>{location.address?.state}</Td>
											<Td>{location.address?.postal_code}</Td>
											<Td
												align="right"
												className="whitespace-nowrap"
											>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 mr-1"
													onClick={() => handleEdit(location)}
													disabled={isLoading || isSaving || isSyncing}
													title="Edit Location"
												>
													<Edit2 className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive-foreground hover:bg-destructive/10"
													onClick={() => handleDeleteClick(location)}
													disabled={isLoading || isSaving || isSyncing}
													title="Delete Location"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</Td>
										</tr>
									))}
								</tbody>
							</table>
						) : null}
					</div>
				</CardContent>
				{locations.length > 0 && (
					<CardFooter className="text-xs text-muted-foreground">
						Showing {locations.length} location(s).
					</CardFooter>
				)}
			</Card>

			{showDeleteModal && locationToDelete && (
				<ConfirmationModal
					isOpen={showDeleteModal}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={handleConfirmDelete}
					title="Delete Location"
					message={`Are you sure you want to delete "${locationToDelete.display_name}"? This might affect terminals.`}
					confirmButtonText={isLoading ? "Deleting..." : "Delete"}
					confirmButtonClass="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
					isConfirmDisabled={isLoading}
				/>
			)}
		</div>
	);
}
