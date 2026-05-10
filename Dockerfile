FROM node:18

WORKDIR /app

# Copy the backend folder
COPY backend ./backend

# Go into the backend folder and install dependencies
WORKDIR /app/backend
RUN npm install

# Expose the port Hugging Face expects (7860)
EXPOSE 7860

# Start the server
CMD ["node", "server.js"]
