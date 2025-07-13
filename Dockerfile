# Use Node.js 22 with additional dependencies for Electron
FROM node:22-bullseye

# Install system dependencies required for Electron and VNC
RUN apt-get update && apt-get install -y \
    xvfb \
    libgtk-3-0 \
    libgbm-dev \
    libxss1 \
    libasound2 \
    libdrm2 \
    libxrandr2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libnss3 \
    libatk-bridge2.0-0 \
    libcups2 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    x11vnc \
    fluxbox \
    wget \
    python3 \
    python3-pip \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Install noVNC
RUN wget -qO- https://github.com/novnc/noVNC/archive/v1.3.0.tar.gz | tar xz -C /opt && \
    mv /opt/noVNC-1.3.0 /opt/noVNC && \
    ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html

# Install websockify
RUN pip3 install websockify

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production
RUN npm i -g electron

# Copy application code
COPY . .

# Copy environment file if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Create a non-root user for security
RUN useradd -m -s /bin/bash electronuser && \
    chown -R electronuser:electronuser /app

USER electronuser

# Set display for virtual framebuffer
ENV DISPLAY=:99

# Expose noVNC web port
EXPOSE 6080

# Start services and run the application
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x720x24 & sleep 2 && fluxbox & sleep 2 && x11vnc -display :99 -nopw -listen localhost -xkb -forever -shared & sleep 2 && websockify --web /opt/noVNC 6080 localhost:5900 & npm run start"]