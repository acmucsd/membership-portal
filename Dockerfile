FROM node:14.15.3

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
EXPOSE 3000
RUN yarn build
CMD ["yarn", "start"]
