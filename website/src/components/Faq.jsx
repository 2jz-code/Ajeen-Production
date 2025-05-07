import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const FAQItem = ({ question, answer }) => {
	return (
		<Disclosure
			as="div"
			className="mt-4 first:mt-0"
		>
			{({ open }) => (
				<>
					<Disclosure.Button className="flex w-full justify-between rounded-lg bg-white px-6 py-4 text-left text-gray-900 shadow-md hover:shadow-lg transition-all duration-300">
						<span className="text-lg font-medium">{question}</span>
						<motion.span
							animate={{ rotate: open ? 180 : 0 }}
							transition={{ duration: 0.3 }}
							className="flex items-center"
						>
							<ChevronDownIcon className="h-5 w-5 text-green-500" />
						</motion.span>
					</Disclosure.Button>
					<AnimatePresence>
						{open && (
							<Disclosure.Panel
								static
								as={motion.div}
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.3 }}
								className="overflow-hidden"
							>
								<div className="bg-white px-6 py-4 text-gray-600 rounded-b-lg shadow-md mt-px">
									{answer}
								</div>
							</Disclosure.Panel>
						)}
					</AnimatePresence>
				</>
			)}
		</Disclosure>
	);
};

const Faq = () => {
	const faqItems = [
		{
			question: "What are your hours?",
			answer:
				"We are open everyday from 6:00 am - 7:00 pm! Our kitchen begins service at 6:30 am and last orders are taken at 6:30 pm.",
		},
		{
			question: "Do you deliver?",
			answer:
				"Yes! We deliver food via Doordash and UberEats! You can also place an order directly through our website for pickup or delivery within a 5-mile radius.",
		},
		{
			question: "How did you start?",
			answer:
				"Our family has always dreamed of opening a restaurant that serves authentic Middle Eastern food. After years of perfecting our recipes and techniques, we finally opened our doors in 2010. What started as a small family operation has grown into the beloved establishment you see today!",
		},
		{
			question: "Do you cater for events?",
			answer:
				"Absolutely! We offer catering services for events of all sizes, from intimate gatherings to large corporate functions. Please contact us at least 48 hours in advance to discuss your requirements and place your order.",
		},
		{
			question: "Are your ingredients halal?",
			answer:
				"Yes, all of our meat products are certified halal. We take great care in sourcing high-quality, authentic ingredients for all our dishes.",
		},
	];

	return (
		<div
			id="faq"
			className="w-full py-20 px-4 bg-green-50"
		>
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-12">
					<span className="text-green-500 font-semibold tracking-wider uppercase">
						Have Questions?
					</span>
					<h2 className="text-4xl font-bold mt-2 text-gray-900">
						Frequently Asked Questions
					</h2>
					<div className="h-1 w-24 bg-green-500 mx-auto mt-4 rounded-full"></div>
				</div>

				<div className="space-y-4">
					{faqItems.map((item, index) => (
						<FAQItem
							key={index}
							question={item.question}
							answer={item.answer}
						/>
					))}
				</div>

				<div className="mt-12 text-center">
					<p className="text-gray-600 mb-6">Don't see your question here?</p>
					<button className="inline-flex items-center px-6 py-3 rounded-full bg-green-500 text-white font-medium hover:bg-green-600 transition-colors duration-300">
						Contact Us
						<svg
							className="ml-2 w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M14 5l7 7m0 0l-7 7m7-7H3"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default Faq;
