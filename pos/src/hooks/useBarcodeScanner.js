import { useState, useEffect, useCallback } from "react";

const BARCODE_INPUT_TIMEOUT_MS = 150; // Max time (ms) between characters for a single scan. Adjust if needed.
const MIN_BARCODE_LENGTH = 6; // Minimum typical barcode length. Adjust if needed.
// More specific regex if you know your barcode format (e.g., only numbers for EAN/UPC)
// const VALID_BARCODE_CHAR_REGEX = /^[a-zA-Z0-9-]*$/; // Allows alphanumeric and hyphen
const VALID_BARCODE_CHAR_REGEX = /^[0-9]*$/; // Example: For numeric barcodes like EAN/UPC

export function useBarcodeScanner(onBarcodeScanned, isActive = true) {
	const [buffer, setBuffer] = useState("");
	const [lastKeystrokeTime, setLastKeystrokeTime] = useState(0);

	const resetBuffer = useCallback(() => {
		setBuffer("");
	}, []);

	const handleKeyDown = (event) => {
		// Ignore scans if modifier keys are pressed (except Shift for some barcode characters)
		if (event.ctrlKey || event.metaKey || event.altKey) {
			return;
		}

		// Do not interfere if the user is typing into an input, textarea, or select field.
		const targetTagName = event.target.tagName.toLowerCase();
		if (["input", "textarea", "select"].includes(targetTagName)) {
			// Exception: Allow scanning even if a specific "barcode input" field is focused (optional)
			// if (event.target.dataset.allowBarcodeScan !== "true") {
			//     return;
			// }
			return;
		}

		const currentTime = Date.now();

		if (event.key === "Enter") {
			if (buffer.length >= MIN_BARCODE_LENGTH) {
				onBarcodeScanned(buffer);
			}
			resetBuffer();
			// It's crucial to prevent default for 'Enter' if it might trigger form submissions
			// or other unintended actions when scanning globally.
			event.preventDefault();
		} else if (
			event.key.length === 1 &&
			VALID_BARCODE_CHAR_REGEX.test(event.key)
		) {
			// Check if time since last keystroke is too long, indicating a new input sequence
			if (currentTime - lastKeystrokeTime > BARCODE_INPUT_TIMEOUT_MS) {
				setBuffer(event.key); // Start new buffer
			} else {
				setBuffer((prev) => prev + event.key); // Append to existing buffer
			}
		} else {
			// Any other key (like Shift, Tab, F-keys etc.) that is not a valid barcode character
			// and not "Enter" might indicate manual typing, so we could reset the buffer.
			// However, some scanners might send Shift for certain characters.
			// For simplicity, we'll only reset on timeout or "Enter".
			// If you face issues, you might want to reset buffer here too for non-valid keys.
		}
		setLastKeystrokeTime(currentTime);
	};
	useEffect(() => {
		if (!isActive || typeof onBarcodeScanned !== "function") {
			// If not active or no valid callback, remove any existing listener and do nothing.
			// This also handles cleanup if isActive changes from true to false.
			const removeListener = () =>
				window.removeEventListener("keydown", handleKeyDown);
			removeListener(); // Call it immediately if not active
			return removeListener; // Return for cleanup
		}
		window.addEventListener("keydown", handleKeyDown);

		// Cleanup function to remove the event listener
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [buffer, lastKeystrokeTime, onBarcodeScanned, resetBuffer, isActive]); // Dependencies
}
