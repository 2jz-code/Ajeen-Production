import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Logo from "@/assets/logo.png"; // Make sure this path is correct for your project setup

/**
 * WelcomePage Component
 * Displays a welcome message, time, and date on the customer display.
 */
const WelcomePage = () => {
	const [currentTime, setCurrentTime] = useState(new Date());

	useEffect(() => {
		const timer = setInterval(() => setCurrentTime(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	const formattedTime = currentTime.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	const formattedDate = currentTime.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { duration: 0.5, ease: "easeInOut", staggerChildren: 0.15 },
		},
		exit: { opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } },
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
		},
	};

	return (
		<motion.div
			key="welcome"
			className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 md:p-10 text-center text-slate-800"
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
		>
			{/* Content directly on the gradient, constrained by this div */}
			<div className="w-full max-w-md">
				{/* Logo/Icon */}
				<motion.div
					variants={itemVariants} // This applies the initial appear animation to the div containing the logo
					className="mb-8"
				>
					<motion.img
						src={Logo}
						alt="Company Logo"
						className="mx-auto h-24 w-auto" // Your existing classes for styling
						animate={{
							scale: [1, 1.03, 1], // Keyframes for a subtle pulse: normal -> slightly larger -> normal
						}}
						transition={{
							duration: 2, // Duration for one full pulse (in and out)
							repeat: Infinity, // Repeat the animation indefinitely
							ease: "easeInOut", // For a smooth, gentle animation
							repeatType: "loop", // Ensures the animation loops smoothly
						}}
					/>
				</motion.div>
				{/* Welcome Message */}
				<motion.h1
					variants={itemVariants}
					className="mb-4 text-4xl font-bold tracking-tight text-slate-900"
				>
					Welcome!
				</motion.h1>
				{/* Instruction Text */}
				<motion.p
					variants={itemVariants}
					className="mb-12 text-xl text-slate-600"
				>
					Please see the cashier to start your order.
				</motion.p>
				{/* Time and Date */}
				<motion.div
					variants={itemVariants}
					className="text-slate-500"
				>
					<div className="mb-2 text-5xl font-medium">{formattedTime}</div>
					<div className="text-lg">{formattedDate}</div>
				</motion.div>
			</div>
		</motion.div>
	);
};

export default WelcomePage;
