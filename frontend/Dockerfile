FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev"]