# Load Balancer Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the port your load balancer listens on
EXPOSE 8000

# Command to run your load balancer (adjust as needed)
CMD ["npm", "start"]
