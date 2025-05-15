// frontend-pos/api/services/localHardwareService.js
import { toast } from "react-toastify"; // Or your preferred notification library

// Get the agent URL from environment variables
const AGENT_BASE_URL = import.meta.env.VITE_HARDWARE_AGENT_URL;

/**
 * Sends a specific print job to the local hardware agent's generic ticket endpoint.
 *
 * @param {object} printJob - The print job details.
 * @param {string} printJob.printer_id - The ID of the target printer (e.g., "pos_receipt_printer", "kitchen_qc_printer").
 * @param {string} printJob.ticket_type - The type of ticket to print (e.g., "customer_receipt", "kitchen_qc_ticket").
 * @param {object} printJob.ticket_data - The actual data payload for the ticket.
 * @param {boolean} [printJob.open_drawer=false] - Whether to open the cash drawer (relevant for POS receipts).
 * @returns {Promise<{success: boolean, message: string, data?: object}>} - Promise resolving with success status, message, and optional data from agent.
 */
export const printGenericTicketWithAgent = async (printJob) => {
	if (!AGENT_BASE_URL) {
		const errorMsg =
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured.";
		console.error(errorMsg);
		toast.error("Hardware Agent is not configured. Cannot print ticket.");
		return { success: false, message: errorMsg };
	}

	// Ensure the new endpoint /print_ticket is used, or whatever you named it in the Python agent
	const endpoint = `${AGENT_BASE_URL}/print_ticket`;
	console.log(`Sending generic print job to agent: ${endpoint}`, printJob);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(printJob), // Send the whole printJob object
		});

		const result = await response.json();

		if (!response.ok || result.status !== "success") {
			const errorMessage =
				result.message ||
				`Agent error: ${response.status} ${response.statusText}`;
			console.error(
				`Hardware Agent print error for ${printJob.printer_id} (${printJob.ticket_type}): ${errorMessage}`,
				result
			);
			toast.error(`Print Failed (${printJob.ticket_type}): ${errorMessage}`);
			return { success: false, message: errorMessage };
		}

		console.log(
			`Hardware Agent print success for ${printJob.printer_id} (${printJob.ticket_type}):`,
			result.message
		);
		// Don't show a generic toast for every ticket type, or make it more specific
		// toast.success(`Ticket (${printJob.ticket_type}) sent to printer ${printJob.printer_id}.`);
		return { success: true, message: result.message, data: result };
	} catch (error) {
		console.error(
			`Network or other error calling hardware agent for generic print (${printJob.printer_id}):`,
			error
		);
		let userMessage = `Could not connect to the hardware agent for ${printJob.ticket_type}. Is it running?`;
		if (
			error instanceof TypeError &&
			error.message.includes("Failed to fetch")
		) {
			userMessage =
				"Failed to fetch from hardware agent. Check if it's running and accessible.";
		} else if (error instanceof SyntaxError) {
			userMessage = "Invalid response from hardware agent.";
		} else {
			userMessage = `Error printing ${printJob.ticket_type}: ${error.message}`;
		}
		toast.error(userMessage);
		return { success: false, message: userMessage };
	}
};

/**
 * Sends a traditional POS receipt print request to the local hardware agent.
 * This can now be a wrapper around printGenericTicketWithAgent or use a specific endpoint if preferred.
 *
 * @param {object} receiptData - The receipt data payload.
 * @param {boolean} openDrawer - Whether to open the cash drawer after printing.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const printReceiptWithAgent = async (
	receiptData,
	openDrawer = false
) => {
	// This function now uses the generic ticket printing mechanism
	// Ensure printer_id and ticket_type match your agent's configuration for POS receipts
	const printJob = {
		printer_id: "pos_receipt_printer", // Example ID for the main POS receipt printer
		ticket_type: "customer_receipt", // Example type for customer receipts
		ticket_data: receiptData,
		open_drawer: openDrawer,
	};

	// Optional: Add a specific toast for customer receipts if needed after the call
	const result = await printGenericTicketWithAgent(printJob);
	if (result.success) {
		toast.success("Customer receipt sent to printer.");
	}
	return result;
};

/**
 * Sends an open drawer request to the local hardware agent.
 *
 * @returns {Promise<{success: boolean, message: string}>} - Promise resolving with success status and message.
 */
export const openDrawerWithAgent = async () => {
	if (!AGENT_BASE_URL) {
		console.error(
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured."
		);
		toast.error("Hardware Agent is not configured. Cannot open drawer.");
		return { success: false, message: "Hardware Agent URL not configured." };
	}

	const endpoint = `${AGENT_BASE_URL}/open_drawer`;
	console.log(`Sending open drawer request to agent: ${endpoint}`);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const result = await response.json();

		if (!response.ok || result.status !== "success") {
			const errorMessage =
				result.message || `Agent error: ${response.statusText}`;
			console.error(`Hardware Agent drawer error: ${errorMessage}`, result);
			toast.error(`Open Drawer Failed: ${errorMessage}`);
			return { success: false, message: errorMessage };
		}

		console.log("Hardware Agent drawer success:", result.message);
		toast.info("Cash drawer open command sent.");
		return { success: true, message: result.message };
	} catch (error) {
		console.error(
			"Network or other error calling hardware agent for drawer:",
			error
		);
		let userMessage = "Could not connect to the hardware agent. Is it running?";
		if (
			error instanceof TypeError &&
			error.message.includes("Failed to fetch")
		) {
			userMessage =
				"Failed to fetch from hardware agent. Check if it's running and accessible.";
		} else if (error instanceof SyntaxError) {
			userMessage = "Invalid response from hardware agent.";
		} else {
			userMessage = `Error opening drawer: ${error.message}`;
		}
		toast.error(userMessage);
		return { success: false, message: userMessage };
	}
};

/**
 * Checks the status of the hardware agent itself.
 *
 * @returns {Promise<object|null>} - Promise resolving with agent status or null on error.
 */
export const checkAgentStatus = async () => {
	if (!AGENT_BASE_URL) {
		console.error(
			"Hardware Agent URL (VITE_HARDWARE_AGENT_URL) is not configured."
		);
		return null;
	}
	const endpoint = `${AGENT_BASE_URL}/status`;
	try {
		const response = await fetch(endpoint);
		if (!response.ok) {
			console.warn(`Hardware agent status check failed: ${response.status}`);
			return {
				status: "error",
				message: `Agent status check failed: ${response.status}`,
				printer_connected: false,
			}; // Return a structured error
		}
		return await response.json();
	} catch (error) {
		console.error("Error checking hardware agent status:", error);
		return {
			status: "error",
			message: "Could not connect to agent for status check.",
			printer_connected: false,
		}; // Return a structured error
	}
};
