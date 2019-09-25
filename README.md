## membership-portal &nbsp; [![CircleCI](https://circleci.com/gh/acmucsd/membership-portal/tree/master.svg?style=svg)](https://circleci.com/gh/acmucsd/membership-portal/tree/master)
REST API for the UC San Diego ACM chapter's membership portal.

### Build Instructions
Feel free to use `yarn ...` instead of `npm run ...`, but make sure not to commit the `yarn.lock`.

1. Clone the repository: `git clone https://github.com/acmucsd/membership-portal`.
2. Navigate to the directory: `cd membership-portal`.
3. Install the necessary dependencies: `npm install`. For Windows users, see specific build instructions below.
4. Create a new `.env` file using `.env.example` as a template: `cp .env.example .env`.
5. Fill out the `.env`. See below for an example file.
6. Run the containerized service(s) (e.g. Postgres): `docker-compose up -d`.
7. Start the Node app: `npm run dev`.

#### For Windows
1. Run the Windows Powershell as administrator.
2. Install build tools to compile [native Node modules](https://www.npmjs.com/package/windows-build-tools#examples-of-modules-supported): `npm add -g windows-build-tools`.
3. Download the Postgres 11.5 installer from [here](https://www.postgresql.org/download/windows/) and run it.
4. Add the Postgres bin to the PATH environment variable.
5. Rerun `npm install` in a separate command prompt window.

#### Sample `.env`
```
RDS_HOST=localhost
RDS_PORT=5432
RDS_DATABASE=membership_portal
RDS_USER=acmucsd_dev
RDS_PASSWORD=password
```
**Note**: For Windows users, `localhost` won't work&mdash;you'll need to set `RDS_HOST` to [the Docker Machine's IP address](https://docs.docker.com/machine/reference/ip/).

#### Useful Commands
+ `docker-compose up -d` to configure and run any required services
+ `npm install` to install the necessary dependencies
+ `npm run dev` to run the Node app with [Nodemon](https://nodemon.io/)
+ `npm run lint` to lint the Node app with [ESLint](https://eslint.org/) (without `--fix`)
+ `npm run test` to run the test suite with [Jest](https://jestjs.io/)
+ `npm run lint:fix` to handle the simple linter issues automatically
+ `docker exec -it rds.acmucsd.local psql -U [RDS_USER] -d [RDS_DATABASE]` to access Postgres (`RDS_XYZ` from `.env`).

Take a look at [`package.json`](https://github.com/acmucsd/membership-portal/blob/master/package.json) for the actual commands.
