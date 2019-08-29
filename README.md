## membership-portal &nbsp; [![CircleCI](https://circleci.com/gh/acmucsd/membership-portal/tree/master.svg?style=svg)](https://circleci.com/gh/acmucsd/membership-portal/tree/master)
REST API for the UC San Diego ACM chapter's membership portal.

### Build Instructions
Feel free to use `yarn ...` instead of `npm run ...`, but make sure not to commit the `yarn.lock`.

1. Clone the repository: `git clone https://github.com/acmucsd/membership-portal`.
2. Navigate to the directory: `cd membership-portal`.
3. Install the necessary dependencies: `npm install`. For Windows users, specific build instructions coming soon.
4. Create a new `.env` file using `.env.example` as a template: `cp .env.example .env`.
5. Fill out the `.env`. See below for an example file.
6. Run the containerized service(s) (e.g. Postgres): `docker-compose up -d`.
7. Start the Node app: `npm run dev`.

#### Useful Commands
+ `docker-compose up -d` to configure and run any required services
+ `npm install` to install the necessary dependencies
+ `npm run dev` to run the Node app with [Nodemon](https://nodemon.io/)
+ `npm run lint` to lint the Node app with [ESLint](https://eslint.org/) (without `--fix`)
+ `npm run test` to run the test suite with [Jest](https://jestjs.io/)

Take a look at [`package.json`](https://github.com/acmucsd/membership-portal/blob/master/package.json) for the actual commands.
