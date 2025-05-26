import React from "react";
import { useInView } from "react-intersection-observer";
import Laptop from "../assests/Zaatar.jpeg"; // [cite: uploaded:src/components/Cards.jsx]

const AboutCard = ({
	title,
	description,
	image,
	reverse = false,
	delay = 0,
}) => {
	const [ref, inView] = useInView({
		threshold: 0.2,
		triggerOnce: true,
	});

	return (
		<div
			ref={ref}
			className={`grid md:grid-cols-2 gap-12 items-center mb-20 transition-all duration-700 ease-out ${
				inView
					? "opacity-100 translate-x-0"
					: reverse
					? "opacity-0 translate-x-24"
					: "opacity-0 -translate-x-24"
			}`}
			style={{ transitionDelay: `${delay}ms` }}
		>
			<div className={`${reverse ? "md:order-last" : ""}`}>
				<div className="relative group">
					{/* Decorative gradient accent behind the image, using primary green and beige */}
					<div className="absolute -inset-2 bg-gradient-to-r from-primary-beige to-primary-green rounded-2xl transform rotate-2 opacity-50 blur-lg transition-all duration-700 group-hover:rotate-6 group-hover:scale-105"></div>
					<img
						src={image}
						alt={title}
						className="relative w-full h-[300px] md:h-[400px] object-cover rounded-xl shadow-xl"
					/>
					{/* Optional: Overlay effect on hover - can be styled with new colors if desired */}
					{/* <div className="absolute inset-0 bg-gradient-to-t from-accent-dark-green/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-end">
						<div className="p-4">
							<span className="text-accent-light-beige text-sm font-medium bg-accent-warm-brown px-3 py-1 rounded-full">
								Learn More
							</span>
						</div>
					</div> */}
				</div>
			</div>
			<div className="flex flex-col justify-center">
				<h2 className="text-3xl md:text-4xl font-bold mb-4 text-accent-dark-green">
					{" "}
					{/* Title text: Dark Green */}
					{title}
				</h2>
				{/* Decorative line: Primary Green */}
				<div className="h-1 w-20 bg-primary-green mb-6 rounded-full"></div>
				{/* Description text: Dark Brown for readability on light beige background */}
				<p className="text-accent-dark-brown leading-relaxed">{description}</p>
			</div>
		</div>
	);
};

const Cards = () => {
	const sections = [
		{
			title: "Who we are",
			description:
				"At Ajeen, we are passionate about bringing authentic Middle Eastern flavors to your table. Our family recipes have been passed down through generations, preserving the rich culinary traditions while adding our own modern twist. Every dish we create is made with love, using only the freshest ingredients sourced from local suppliers.",
			image: Laptop, // [cite: uploaded:src/components/Cards.jsx]
			reverse: false,
			delay: 0,
		},
		{
			title: "How it started",
			description:
				"Our journey began in 2010 when our founder, inspired by childhood memories of cooking with his grandmother, decided to share these beloved recipes with the community. What started as a small family operation quickly gained popularity as word spread about our authentic flavors and warm hospitality. We've grown steadily since then, but our commitment to quality and tradition remains unchanged.",
			image: Laptop, // [cite: uploaded:src/components/Cards.jsx]
			reverse: true,
			delay: 200,
		},
		{
			title: "Where we are now",
			description:
				"Today, Ajeen has become a beloved part of the local food scene. We've expanded our menu to include both traditional favorites and innovative creations that cater to evolving tastes. Our restaurant has become a gathering place for families and friends to enjoy delicious food in a warm, welcoming atmosphere. We're proud of how far we've come and excited about what the future holds.",
			image: Laptop, // [cite: uploaded:src/components/Cards.jsx]
			reverse: false,
			delay: 400,
		},
	];

	return (
		<div
			id="about"
			className="w-full py-20 px-4 bg-background" // Main section background: --color-accent-light-beige
		>
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					{/* "Our Story" span: Primary Green */}
					<span className="text-primary-green font-semibold tracking-wider uppercase">
						Our Story
					</span>
					{/* Main heading "About Us": Dark Green */}
					<h1 className="text-4xl md:text-5xl font-bold mt-2 text-accent-dark-green">
						About Us
					</h1>
					{/* Decorative line: Primary Green */}
					<div className="h-1 w-24 bg-primary-green mx-auto mt-4 rounded-full"></div>
				</div>

				{sections.map((section, index) => (
					<AboutCard
						key={index}
						title={section.title}
						description={section.description}
						image={section.image}
						reverse={section.reverse}
						delay={section.delay}
					/>
				))}
			</div>
		</div>
	);
};

export default Cards;
