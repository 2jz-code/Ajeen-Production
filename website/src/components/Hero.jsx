import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ManakeeshVideo from "../assests/Hero-Vid.mp4";

const Hero = () => {
	const titleRef = useRef(null);
	const subtitleRef = useRef(null);
	const taglineRef = useRef(null);
	const buttonRef = useRef(null);
	const scrollIndicatorRef = useRef(null);

	useEffect(() => {
		// Staggered animation for hero elements
		const elements = [
			{ ref: titleRef, delay: 300 },
			{ ref: subtitleRef, delay: 600 },
			{ ref: taglineRef, delay: 900 },
			{ ref: buttonRef, delay: 1200 },
			{ ref: scrollIndicatorRef, delay: 1500 },
		];

		elements.forEach(({ ref, delay }) => {
			setTimeout(() => {
				if (ref.current) {
					ref.current.classList.remove("opacity-0");
					ref.current.classList.remove("translate-y-10");
				}
			}, delay);
		});
	}, []);

	return (
		<div
			id="home"
			className="relative h-screen w-full overflow-hidden"
		>
			{/* Video Background with Parallax Effect */}
			<div className="absolute inset-0 scale-110">
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute top-0 left-0 w-full h-full object-cover"
				>
					<source
						src={ManakeeshVideo}
						type="video/mp4"
					/>
				</video>

				{/* Gradient Overlay for better text readability */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30"></div>
			</div>

			{/* Hero Content */}
			<div className="relative z-10 h-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto text-center">
					{/* Title with custom animation */}
					<h1
						ref={titleRef}
						className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 opacity-0 translate-y-10 transition-all duration-1000 ease-out"
					>
						<span className="font-serif italic">Ajeen</span>
					</h1>

					{/* Subtitle */}
					<p
						ref={subtitleRef}
						className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium text-white mb-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out"
					>
						Fresh, Authentic, and Tasty Food for{" "}
						<br className="hidden sm:block" />
						Breakfast, Lunch, and Dinner!
					</p>

					{/* Tagline */}
					<p
						ref={taglineRef}
						className="text-lg md:text-xl text-gray-200 mb-8 opacity-0 translate-y-10 transition-all duration-1000 ease-out"
					>
						The local shop to satisfy all your cravings!
					</p>

					{/* CTA Button */}
					<div
						ref={buttonRef}
						className="opacity-0 translate-y-10 transition-all duration-1000 ease-out"
					>
						<Link
							to="/menu"
							className="inline-flex items-center px-8 py-3 rounded-full bg-green-500 text-white font-medium text-lg shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-300"
						>
							Order Now
							<svg
								className="ml-2 w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M14 5l7 7m0 0l-7 7m7-7H3"
								/>
							</svg>
						</Link>
					</div>
				</div>

				{/* Fixed and Centered Scroll Indicator */}
				<div
					ref={scrollIndicatorRef}
					className="fixed-center w-full flex justify-center items-center opacity-0 translate-y-10 transition-all duration-1000 ease-out"
					style={{
						position: "absolute",
						bottom: "2rem",
						left: "0",
						right: "0",
						zIndex: 20,
					}}
				>
					<div className="flex flex-col items-center animate-bounce">
						<span className="text-white text-sm mb-2">Scroll Down</span>
						<svg
							className="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Hero;
