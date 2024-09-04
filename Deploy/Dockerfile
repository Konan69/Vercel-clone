# Use the smallest official node alpine image for building
FROM node:20-alpine as build

# Set working directory
WORKDIR /usr/app

# Install dependencies based on the lock file
COPY package*.json ./
RUN npm install --only=production

# Copy the rest of the code and build the project
COPY . . 
RUN npm run build

# Prepare Production Image
FROM node:20-alpine as production

# Install bash and git in the production environment
RUN apk add --no-cache bash git

# Set working directory
WORKDIR /usr/app

# Copy only the necessary built files and package.json
COPY --from=build /usr/app/dist ./dist
COPY package*.json .

# Install only production dependencies
RUN npm install --only=production

# Copy any required scripts or assets for running the application
COPY main.sh /usr/app/main.sh
COPY kafka.pem kafka.pem

# Ensure the scripts are executable
RUN chmod +x /usr/app/main.sh
RUN chmod +x /usr/app/dist/script.js

# Set the entry point
ENTRYPOINT ["/usr/app/main.sh"]
