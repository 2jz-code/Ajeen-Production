# Ajeen Restaurant Management System (Monorepo)

This repository contains the full-stack solution for Ajeen Restaurant, encompassing a backend API, a Point of Sale (POS) frontend, and a customer-facing website frontend. The project is structured as a monorepo to simplify development, testing, and deployment of its interconnected components.

## Project Overview

The system provides a comprehensive suite of tools for restaurant operations, including:

- **Online Ordering:** For customers via the website.
- **In-Store POS:** For staff to manage orders, payments, and tables.
- **Kitchen Display System (KDS):** Real-time order updates for kitchen staff.
- **Menu & Product Management.**
- **User & Staff Management.**
- **Payment Processing:** Integration with Stripe (online and terminal).
- **Reporting & Analytics.**
- **Customer Rewards Program.**
- **Hardware Integration:** For receipt printers, cash drawers, and payment terminals via a local hardware agent.

---

## Monorepo Structure

The project is organized into the following main directories:

- `/backend`: Django application serving the RESTful API and WebSocket connections.
- `/pos`: React (Vite) single-page application for the Point of Sale system.
- `/website`: React (Create React App) single-page application for the customer-facing website.
- `/nginx`: Configuration for Nginx reverse proxy used in Docker.
- `docker-compose.yml`: Defines and orchestrates the services for local development and is a base for production deployment.
- `.env.example`: Template for environment variables required to run the project.

---

## Core Technologies

### 1. Backend (`/backend`)

- **Framework:** Django, Django Rest Framework (DRF)
- **Async/WebSockets:** Django Channels, Daphne
- **Database:** PostgreSQL
- **Cache:** Redis
- **Payment Integration:** Stripe API
- **Key Libraries:** `djangorestframework-simplejwt` (for JWT authentication), `corsheaders`, `phonenumber_field`.
- **Functionality:**
  - Serves REST APIs for POS, Website, and Admin interfaces.
  - Handles user authentication and authorization (staff, customers).
  - Manages products, categories, orders, payments, discounts, rewards.
  - Provides WebSocket endpoints for real-time updates (e.g., kitchen display, hardware agent proxy).
  - Business logic for reporting and system settings.

### 2. POS Frontend (`/pos`)

- **Framework:** React
- **Build Tool:** Vite
- **State Management:** Zustand (or other, e.g., React Context, Redux - _adjust if known_)
- **Styling:** Tailwind CSS (or other - _adjust if known_)
- **Key Libraries:** Axios, React Router, Stripe.js, Socket.IO Client (or native WebSockets).
- **Functionality:**
  - Order taking and management.
  - Table management (if applicable).
  - Payment processing (including Stripe Terminal via local hardware agent).
  - Receipt printing, cash drawer operations (via local hardware agent).
  - Staff authentication.
  - Interaction with Kitchen Display System.

### 3. Website Frontend (`/website`)

- **Framework:** React
- **Build Tool:** Create React App (react-scripts)
- **State Management:** React Context (or other - _adjust if known_)
- **Styling:** Tailwind CSS (or other - _adjust if known_)
- **Key Libraries:** Axios, React Router, Stripe.js.
- **Functionality:**
  - Customer registration and login.
  - Browse menu and products.
  - Online ordering and cart management (including guest cart).
  - Online payment processing (Stripe).
  - Viewing order history.
  - Rewards program interaction.

### 4. Shared & Orchestration

- **Containerization:** Docker, Docker Compose
- **Reverse Proxy:** Nginx
- **Version Control:** Git

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started) (Docker Engine and Docker Compose)
- [Git](https://git-scm.com/)
- A code editor (e.g., VS Code)
- Access to a terminal or command prompt

---

## Getting Started / Local Development Setup

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/2jz-code/Ajeen-Production.git
    ```

2.  **Set Up Environment Variables:**

    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Open the newly created `.env` file and fill in the required values (e.g., Stripe test keys, a strong Django `SECRET_KEY`, database credentials).
      - **Important:** The default database credentials in `.env.example` and `docker-compose.yml` are for development convenience. Ensure `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY` are strong and unique in your `.env` file.
      - The `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` should be your **Stripe Test Mode keys** for development.

3.  **Build and Run with Docker Compose:**

    - From the root directory of the project (where `docker-compose.yml` is located):
      ```bash
      docker-compose up --build -d
      ```
    - The `--build` flag ensures images are built if they don't exist or if `Dockerfile`s have changed.
    - The `-d` flag runs the containers in detached mode (in the background).

4.  **Backend Migrations & Superuser:**

    - The backend `entrypoint.sh` script attempts to run migrations and create a default superuser based on environment variables in your `.env` file (`DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD`, `DJANGO_SUPERUSER_EMAIL`).
    - If you need to run migrations manually or create a superuser:
      ```bash
      docker-compose exec backend python manage.py migrate
      docker-compose exec backend python manage.py createsuperuser
      ```

5.  **Accessing the Applications:**

    - **Website Frontend:** [http://localhost:3000](http://localhost:3000) (or the port specified for the `website` service in `docker-compose.yml`)
    - **POS Frontend:** [http://localhost:5173](http://localhost:5173) (or the port specified for the `pos` service in `docker-compose.yml`)
    - **Backend API:** Typically accessed through the frontends. Direct API access for testing can be done via [http://localhost:8000/api/...](http://localhost:8000/api/...) (or the port mapped for the `backend` service, often proxied by Nginx if using the main port 80).
    - **Django Admin:** [http://localhost:8000/admin/](http://localhost:8000/admin/) (or your Nginx mapped admin URL if different)
    - **Nginx (Main Entry):** [http://localhost:80](http://localhost:80) (if Nginx is configured to route to the various services).

6.  **Stopping the Application:**
    ```bash
    docker-compose down
    ```
    To remove volumes (database data, etc.):
    ```bash
    docker-compose down -v
    ```

---

## Environment Variables

All necessary environment variables are documented in `.env.example`. This file serves as a template. For local development, create a `.env` file in the root directory by copying `.env.example` and filling in the appropriate values.

**The `.env` file is included in `.gitignore` and should NEVER be committed to the repository, especially if it contains sensitive credentials.**

Production environments will require these variables to be set through secure mechanisms (e.g., AWS Secrets Manager, environment variables in the deployment platform).

---

## Key Features Implemented (High-Level)

- User Authentication (JWT for Staff & Customers)
- Role-Based Access Control
- Product & Category Management
- Shopping Cart (User & Guest)
- Order Processing (Online & POS)
- Stripe Payment Integration (Online Payments & POS Terminal)
- Real-time Kitchen Order Display (via WebSockets)
- Hardware Proxy for POS (via WebSockets to local agent)
- Discounts & Promotions
- Customer Rewards Program
- Basic Reporting

---

## API Structure

The backend exposes RESTful APIs, generally namespaced as follows:

- `/api/pos/...`: Endpoints primarily for the POS frontend.
- `/api/website/...`: Endpoints primarily for the customer website frontend.
- `/api/users/...`: User authentication and management.
- `/admin/`: Django Admin interface.
- `/ws/...`: WebSocket connections.

Refer to the respective `urls.py` files in the backend Django apps for detailed routes.

---

## POS Hardware Agent Context

The POS frontend is designed to communicate with a **Local Hardware Agent** application that runs directly on the POS terminal's host machine. This agent is responsible for direct interaction with physical hardware such as:

- Receipt Printers
- Cash Drawers
- Stripe Payment Terminals

The Local Hardware Agent is **not part of this monorepo** and needs to be deployed and run separately on each POS machine. The POS frontend communicates with it typically via HTTP requests or WebSockets to `localhost` on the POS machine (configurable via `VITE_HARDWARE_AGENT_URL`).

---

## Deployment

This project is designed to be deployed using Docker containers. The intended production architecture involves:

- **Backend:** Dockerized Django/Nginx application running on AWS ECS (EC2 launch type).
- **Frontends (POS & Website):** Static assets built and hosted on AWS S3, served via Cloudflare CDN.
- **Database:** AWS RDS for PostgreSQL.
- **Cache:** AWS ElastiCache for Redis.
- **API Gateway/CDN:** Cloudflare for DNS, SSL, CDN, WAF, and routing traffic to the backend.
- **Secrets Management:** AWS Secrets Manager or Parameter Store.
- **CI/CD:** GitHub Actions (or similar) for automated builds and deployments.

(Refer to the "Final Deployment Roadmap" document for detailed deployment steps and architecture.)

---

## Branching Strategy & Contributing

This project follows a Gitflow-like branching strategy (or will adopt one):

- `main`: Represents the latest production-ready code.
- `develop`: Integration branch for ongoing development.
- Feature branches (`feature/...`): For new features, branched from `develop`.
- Bugfix branches (`bugfix/...`): For fixing bugs.
- Hotfix branches (`hotfix/...`): For critical production bug fixes, branched from `main`.

Contributions should be made via feature branches and Pull Requests to the `develop` (or `main` for hotfixes) branch.

---

_This README provides a general overview. For more specific details, refer to the README files within each component's directory (`/backend/README.md`, etc., if they exist) or the relevant source code and configuration files._
