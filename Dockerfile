FROM node:20.19.4 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:20.19.4-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["yarn", "release"]
