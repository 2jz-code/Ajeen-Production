import React from "react";

// Optional: Placeholder for an icon. If you use an icon library
// like lucide-react (common with ShadCN/UI), you'd import it.
// Example: import { Sparkles } from 'lucide-react';
const SparklesIcon = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
		stroke="currentColor"
		className={className}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17.437 9.154a4.5 4.5 0 00-3.09-3.09L11.5 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L18.25 12zM12 18.75l.813-2.846a4.5 4.5 0 003.09-3.09L18.75 12l-2.846-.813a4.5 4.5 0 00-3.09-3.09L12 5.25l-.813 2.846a4.5 4.5 0 00-3.09 3.09L5.25 12l2.846.813a4.5 4.5 0 003.09 3.09L12 18.75z"
		/>
	</svg>
);

const ComingSoonWrapper = ({
	children,
	active = true,
	message = "Coming Soon!", // Cleaner default message
}) => {
	if (!active) {
		return <>{children}</>;
	}

	return (
		<div className="relative group isolate">
			{" "}
			{/* 'isolate' for new stacking context */}
			{/*
              The children are still rendered but will be visually overlaid.
              The 'pointer-events-none' is crucial for disabling interaction.
              A subtle opacity makes the underlying content less prominent.
            */}
			<div
				className={
					active
						? "opacity-50 pointer-events-none transition-opacity duration-300"
						: ""
				}
			>
				{children}
			</div>
			{active && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 dark:bg-slate-900/80 rounded-md cursor-not-allowed z-10 p-4 text-center transition-all duration-300 ease-in-out">
					{/*
                        Overlay Styling:
                        - bg-white/80 (light mode) or dark:bg-slate-900/80 (dark mode) provides a semi-transparent background.
                          (Adjust slate-900 if your dark theme uses a different background base).
                        - backdrop-blur-sm: Adds a sleek "glassmorphism" effect. Remove if not desired or causes performance issues.
                        - rounded-md: Aligns with common border radius on your site.
                        - z-10: Ensures the overlay is on top.
                        - p-4: Padding for the overlay content.
                    */}
					<div className="flex flex-col items-center">
						{/* Icon (Example) */}
						<SparklesIcon className="w-7 h-7 text-green-500 dark:text-red-400 mb-3" />
						{/* If using lucide-react: <Sparkles className="w-7 h-7 text-red-500 dark:text-red-400 mb-3" /> */}

						<span className="bg-green-500 text-white text-md font-semibold px-3.5 py-1.5 rounded-full shadow-lg">
							{/*
                                Message Badge Styling:
                                - bg-red-600 text-white: Uses your site's primary action color (red).
                                - text-xs font-semibold: Small, legible, and emphasized.
                                - px-3.5 py-1.5 rounded-full: Creates a modern pill shape.
                                - shadow-lg: Adds a bit more pop to the badge.
                            */}
							{message}
						</span>
						{/* Optional: A brief explanatory note */}
						{/* <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5">This feature is currently under development.</p> */}
					</div>
				</div>
			)}
		</div>
	);
};

export default ComingSoonWrapper;
