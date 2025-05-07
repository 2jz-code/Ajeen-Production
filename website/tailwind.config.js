/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			keyframes: {
				// Accordion animations
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				// Fade-in animations
				fadeIn: {
					"0%": { opacity: 0 },
					"100%": { opacity: 1 },
				},
			},
			animation: {
				"spin-slow": "spin 3s linear infinite",

				// Accordion animations
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				// Fade-in animations with chaining
				fadeIn: "fadeIn 1s ease-in-out forwards",
				fadeInDelay1: "fadeIn 1s ease-in-out forwards 1s", // Starts after 1s
				fadeInDelay2: "fadeIn 1s ease-in-out forwards 1.75s", // Starts after 1.75s
				fadeInDelay3: "fadeIn 1s ease-in-out forwards 2.5s", // Starts after 2.5s
				fadeInDelay4: "fadeIn 1s ease-in-out forwards 3.5s", // Starts after 3.5s
			},
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				muted: "hsl(var(--muted))",
				"muted-foreground": "hsl(var(--muted-foreground))",
				popover: "hsl(var(--popover))",
				"popover-foreground": "hsl(var(--popover-foreground))",
				border: "hsl(var(--border-color))", // Custom border color variable
				card: "hsl(var(--card))",
				"card-foreground": "hsl(var(--card-foreground))",
				primary: "hsl(var(--primary))",
				"primary-foreground": "hsl(var(--primary-foreground))",
				secondary: "hsl(var(--secondary))",
				"secondary-foreground": "hsl(var(--secondary-foreground))",
				accent: "hsl(var(--accent))",
				"accent-foreground": "hsl(var(--accent-foreground))",
				destructive: "hsl(var(--destructive))",
				"destructive-foreground": "hsl(var(--destructive-foreground))",
				ring: "hsl(var(--ring))",
			},
			borderRadius: {
				DEFAULT: "var(--radius)",
			},
		},
	},
	plugins: [],
};
