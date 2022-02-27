FROM node:14.15.3 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY . .
RUN yarn build

FROM node:14.15.3-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["yarn", "start"]
