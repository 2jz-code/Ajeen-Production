import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // Assuming you have this plugin installed for Tailwind
import path from "path";
import { fileURLToPath } from "url"; // Import this

// Replicate __dirname functionality for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
	plugins: [tailwindcss(), react()], // Make sure tailwindcss() is correctly set up if you're using @tailwindcss/vite
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"), // This should now work
		},
	},
});
