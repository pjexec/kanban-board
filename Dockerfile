FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the entire app
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "backend/server.js"]
