FROM node:14-alpine
WORKDIR /usr/app
COPY . .
RUN npm install
EXPOSE 8080
CMD ["npm","prod"]