# Dockerfile for frontend-pos (Vite + React)

# ---- Build Stage ----
# Use a Node.js image to build the application
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package.json package-lock.json* ./
# If using yarn, it would be:
# COPY package.json yarn.lock ./

# Install dependencies
RUN npm install
# If using yarn:
# RUN yarn install

# Copy the rest of the application source code
COPY . .

# Build the application for production
# This will create a 'dist' folder with the static assets
RUN npm run build

# ---- Runtime Stage ----
# Use a lightweight Nginx image to serve the static files
FROM nginx:stable-alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built static files from the 'builder' stage
# The output of a Vite build is typically in the 'dist' folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
# This file should be in the same directory as your Dockerfile (e.g., frontend-pos/nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default HTTP port)
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]