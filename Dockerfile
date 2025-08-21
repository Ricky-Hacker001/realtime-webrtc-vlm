# Use an official Node.js runtime as a parent image
# Using the 'alpine' variant for a smaller image size
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY server/package*.json ./server/

# Install app dependencies inside the container
RUN cd server && npm install

# Bundle app source
# Copy the server and frontend code into the container
COPY ./server ./server
COPY ./frontend ./frontend

# Your app binds to port 8080, so expose it
EXPOSE 8080

# Define the command to run your app
CMD [ "node", "server/server.js" ]
