"use client";

import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { paymentAnimations } from "../../../animations/paymentAnimations";

const { pageVariants, pageTransition } = paymentAnimations;

export const ScrollableViewWrapper = ({ children, className = "" }) => (
	<motion.div
		className="absolute inset-0 overflow-hidden flex flex-col"
		variants={pageVariants}
		initial="enter"
		animate="center"
		exit="exit"
		transition={pageTransition}
	>
		<div className={`flex-1 overflow-y-auto overflow-x-hidden ${className}`}>
			{children}
		</div>
	</motion.div>
);

ScrollableViewWrapper.propTypes = {
	children: PropTypes.node.isRequired,
	className: PropTypes.string,
};

export default ScrollableViewWrapper;
