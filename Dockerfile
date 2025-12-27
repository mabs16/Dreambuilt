# Use official Node.js image as builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code from backend
COPY backend/ .

# Build the application
RUN npm run build

# Use official Node.js image for production
FROM node:20-alpine

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run uses PORT env var, defaults to 8080)
EXPOSE 8080

# Command to run the application
CMD ["node", "dist/main"]
