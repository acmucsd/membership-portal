FROM node:20.12.2 AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN npm i -g yarn
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:20.12.2-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3000
CMD ["yarn", "release"]
