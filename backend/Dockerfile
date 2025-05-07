# Dockerfile for Django Backend

# 1. Base Image
FROM python:3.11-slim-buster AS base

# --- Builder Stage ---
FROM base AS builder
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Final Stage ---
FROM base AS final
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV APP_HOME=/app
ENV PORT=80 
# Nginx will listen on port 80 within the container

RUN groupadd -r app_group && useradd --no-log-init -r -g app_group app_user

# Install Nginx, Supervisor, and runtime system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    libpq5 \
    libjpeg62-turbo \
    zlib1g \
    # Add netcat or other tools if needed for DB wait scripts in entrypoint
    # netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN which nginx 

WORKDIR ${APP_HOME}

COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Copy application code
COPY . .

# +++ Add these lines to copy and make the entrypoint script executable +++
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy Nginx configuration for the project
COPY project_nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && \
nginx -t    

# Copy Supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create directories for logs, run, and sockets
RUN mkdir -p /var/log/supervisor /var/run/supervisor /tmp && \
    chown -R app_user:app_group /var/log/supervisor && \ 
    # chown -R app_user:app_group /var/run/supervisor && \ # Not needed if pidfile is /var/run/supervisord.pid and supervisord is root
    chmod 777 /tmp 

# Create directories for static files and media, and set ownership
RUN mkdir -p ${APP_HOME}/staticfiles ${APP_HOME}/media && \
chown -R app_user:app_group ${APP_HOME}

# Switch to app_user for collectstatic
USER app_user
RUN python manage.py collectstatic --noinput --clear

# Switch back to root BEFORE setting the ENTRYPOINT and CMD.
# This ensures entrypoint.sh and supervisord start as root.
USER root

EXPOSE ${PORT}

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Supervisord (started as root by entrypoint.sh) will read its config
# and handle user switching for its managed programs.
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

    # CMD ["nginx", "-g", "daemon off;"]
