# Dockerfile for Expo frontend
# Debian-based, compatible with lightningcss prebuilds
FROM node:20-bullseye 
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .


EXPOSE 8081 19000 19001
