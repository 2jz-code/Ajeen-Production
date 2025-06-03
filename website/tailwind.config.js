/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	important: true,
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
				fadeInDelay1: "fadeIn 1s ease-in-out forwards 1s",
				fadeInDelay2: "fadeIn 1s ease-in-out forwards 1.75s",
				fadeInDelay3: "fadeIn 1s ease-in-out forwards 2.5s",
				fadeInDelay4: "fadeIn 1s ease-in-out forwards 3.5s",
			},
			colors: {
				// Theme colors (referencing CSS variables from globals.css)
				// These allow you to use classes like bg-background, text-foreground, etc.
				background: "var(--background)",
				foreground: "var(--foreground)",
				muted: "var(--muted)",
				"muted-foreground": "var(--muted-foreground)",
				popover: "var(--popover)",
				"popover-foreground": "var(--popover-foreground)",
				border: "var(--border)", // Ensure --border is defined in globals.css, not --border-color
				input: "var(--input)",
				card: "var(--card)",
				"card-foreground": "var(--card-foreground)",
				primary: "var(--primary)",
				"primary-foreground": "var(--primary-foreground)",
				secondary: "var(--secondary)",
				"secondary-foreground": "var(--secondary-foreground)",
				accent: "var(--accent)",
				"accent-foreground": "var(--accent-foreground)",
				destructive: "hsl(var(--destructive))", // Keep hsl if --destructive is an HSL string
				"destructive-foreground": "var(--destructive-foreground)",
				ring: "var(--ring)",

				// New specific color names (referencing CSS variables from globals.css)
				// These allow you to use classes like bg-primary-green, text-accent-warm-brown, etc.
				"primary-green": "var(--color-primary-green)",
				"primary-beige": "var(--color-primary-beige)",
				"accent-dark-green": "var(--color-accent-dark-green)",
				"accent-light-beige": "var(--color-accent-light-beige)",
				"accent-warm-brown": "var(--color-accent-warm-brown)",
				"accent-dark-brown": "var(--color-accent-dark-brown)",
				"accent-subtle-gray": "var(--color-accent-subtle-gray)",
			},
			borderRadius: {
				// DEFAULT: "var(--radius)", // This was causing issues, use specific sizes
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
		},
	},
	plugins: [],
};
