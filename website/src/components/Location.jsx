import React from "react";
import {
	MapPinIcon,
	PhoneIcon,
	EnvelopeIcon,
	ClockIcon,
} from "@heroicons/react/24/outline";

const ContactItem = ({ icon, title, details }) => {
	return (
		<div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
			<div className="flex-shrink-0">
				<div className="p-3 bg-green-100 text-green-600 rounded-full">
					{icon}
				</div>
			</div>
			<div>
				<h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
				<p className="text-gray-600">{details}</p>
			</div>
		</div>
	);
};

const Location = () => {
	const contactInfo = [
		{
			icon: <MapPinIcon className="w-6 h-6" />,
			title: "Our Location",
			details: "2105 Cliff Rd Suite 300, Eagan, MN, 55122",
		},
		{
			icon: <PhoneIcon className="w-6 h-6" />,
			title: "Phone Number",
			details: "(651) 412-5336",
		},
		{
			icon: <EnvelopeIcon className="w-6 h-6" />,
			title: "Email Address",
			details: "contact@bakeajeen.com",
		},
		{
			icon: <ClockIcon className="w-6 h-6" />,
			title: "Working Hours",
			details: "6:00 am - 7:00 pm, Everyday",
		},
	];

	return (
		<div
			id="contact"
			className="w-full py-20 px-4 bg-gray-50"
		>
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<span className="text-green-500 font-semibold tracking-wider uppercase">
						Get In Touch
					</span>
					<h2 className="text-4xl font-bold mt-2 text-gray-900">Contact Us</h2>
					<div className="h-1 w-24 bg-green-500 mx-auto mt-4 rounded-full"></div>
					<p className="mt-6 text-gray-600 max-w-2xl mx-auto">
						Have questions or want to place an order? We're here to help! Reach
						out to us using any of the methods below.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 mb-16">
					{/* Contact Information */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{contactInfo.map((item, index) => (
							<ContactItem
								key={index}
								icon={item.icon}
								title={item.title}
								details={item.details}
							/>
						))}
					</div>

					{/* Google Maps */}
					<div className="relative rounded-xl overflow-hidden shadow-xl h-[400px] group">
						<div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-10"></div>
						<iframe
							title="location"
							className="w-full h-full border-0"
							src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2831.5122758957023!2d-93.21701832427887!3d44.79074767812076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87f631b56239743f%3A0x62f01f76556fe739!2sAjeen%20Bakery!5e0!3m2!1sen!2sus!4v1747097843478!5m2!1sen!2sus"
							allowFullScreen=""
							loading="lazy"
							referrerPolicy="no-referrer-when-downgrade"
						></iframe>

						{/* Clickable Overlay */}
						<a
							href="https://maps.app.goo.gl/jAu5tcsaNpN5V4kk6"
							target="_blank"
							rel="noopener noreferrer"
							className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
						>
							<span className="px-4 py-2 bg-white text-green-600 rounded-full font-medium shadow-lg">
								Open in Google Maps
							</span>
						</a>
					</div>
				</div>

				{/* Contact Form */}
				<div className="bg-white rounded-2xl shadow-xl overflow-hidden">
					<div className="grid md:grid-cols-2">
						<div className="bg-green-600 p-12 text-white">
							<h3 className="text-2xl font-bold mb-6">Send Us a Message</h3>
							<p className="mb-8">
								Have a special request or feedback? Fill out the form and we'll
								get back to you as soon as possible.
							</p>
							<div className="space-y-4 text-sm">
								<p>
									We appreciate your input and look forward to hearing from you!
								</p>
								<p>Our team typically responds within 24 hours.</p>
							</div>
						</div>
						<div className="p-12">
							<form className="space-y-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											First Name
										</label>
										<input
											type="text"
											className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
											placeholder="Your first name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Last Name
										</label>
										<input
											type="text"
											className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
											placeholder="Your last name"
										/>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Email Address
									</label>
									<input
										type="email"
										className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
										placeholder="your@email.com"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Message
									</label>
									<textarea
										rows="4"
										className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
										placeholder="How can we help you?"
									></textarea>
								</div>
								<button
									type="submit"
									className="w-full bg-green-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300 transform hover:scale-[1.02]"
								>
									Send Message
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Location;
