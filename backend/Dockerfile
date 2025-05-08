# Dockerfile for Django Backend (Production Ready - Attempt 2 for Redis user)

# 1. Base Image
FROM python:3.11-slim-buster AS base

# --- Builder Stage ---
FROM base AS builder
LABEL stage=builder
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        curl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Final Stage ---
FROM base AS final
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV APP_HOME=/app
ENV PORT=80
ENV DJANGO_SETTINGS_MODULE=ajeenPOS.settings

# Create the application non-root user and group
RUN groupadd -r app_group && useradd --no-log-init -r -g app_group app_user

# DO NOT create redis_user/redis_group manually. Let the package do it.

# Install Nginx, Supervisor, PostgreSQL client, Redis server, and runtime dependencies
# The redis-server package should create the 'redis' user/group automatically
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        libpq5 \
        libjpeg62-turbo \
        zlib1g \
        postgresql-client \
        redis-server \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Ensure Redis data directory exists and has correct ownership
# This directory and user 'redis:redis' should be created by the package install,
# but setting ownership explicitly ensures it's correct.
RUN mkdir -p /var/lib/redis && chown redis:redis /var/lib/redis && chmod 750 /var/lib/redis

# Configure redis.conf
RUN sed -i 's/daemonize yes/daemonize no/' /etc/redis/redis.conf && \
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf && \
    sed -i 's/^logfile .*/logfile ""/' /etc/redis/redis.conf && \
    sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf

WORKDIR ${APP_HOME}

# Copy Python packages and executables from builder stage
COPY --chown=app_user:app_group --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --chown=app_user:app_group --from=builder /usr/local/bin/ /usr/local/bin/

# Create other necessary directories
RUN mkdir -p /var/log/supervisor ${APP_HOME}/staticfiles ${APP_HOME}/media /tmp && \
    chown -R app_user:app_group ${APP_HOME}/staticfiles ${APP_HOME}/media && \
    chown root:root /var/log/supervisor && chmod 755 /var/log/supervisor

# Copy Supervisor configuration (ensure it uses user=redis now)
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy Nginx configuration
COPY project_nginx.conf /etc/nginx/sites-available/ajeenpos_nginx.conf
RUN ln -sf /etc/nginx/sites-available/ajeenpos_nginx.conf /etc/nginx/sites-enabled/default && \
    nginx -t

# Copy utility scripts and application code
COPY --chown=app_user:app_group wait_for_db.py ${APP_HOME}/wait_for_db.py
COPY --chown=app_user:app_group . ${APP_HOME}/

# Copy and set permissions for the entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to app_user to run collectstatic
USER app_user
RUN python manage.py collectstatic --noinput --clear

# Switch back to root for CMD/ENTRYPOINT
USER root

EXPOSE ${PORT}
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]