## membership-portal-api &nbsp; [![CircleCI](https://circleci.com/gh/acmucsd/membership-portal/tree/master.svg?style=svg)](https://circleci.com/gh/acmucsd/membership-portal/tree/master)
REST API for the UC San Diego ACM chapter's membership portal.

### Build Instructions
Feel free to use `yarn ...` instead of `npm run ...`, but make sure not to commit the `yarn.lock`.

1. Clone the repository: `git clone https://github.com/acmucsd/membership-portal`.
2. Navigate to the directory: `cd membership-portal`.
3. Install PostgreSQL. See [installation instructions below](#installing-postgres).
4. Install the necessary dependencies: `npm install`. For Windows users, see [specific build instructions below](#windows-build-instructions).
5. Create a new `.env` file using [`.env.example`](https://github.com/acmucsd/membership-portal/blob/master/.env.example) as a template: `cp .env.example .env`.
6. Fill out the `.env`. See the [example file below](#sample-env).
7. Run the containerized service(s) (e.g. Postgres): `docker-compose up -d`.
8. Initialize the database: `npm run db:migrate`.
9. Populate the database: `npm run db:seed`.
10. Start the Node app: `npm run dev`.

#### Installing Postgres
MacOS and Linux users can install Postgres via [Homebrew](https://brew.sh), and Linux users can use `apt`. Windows users will need to download the Postgres 11.5 installer from [here](https://www.postgresql.org/download/windows/), run the installer, and add the Postgres bin to the PATH environment variable.

#### Windows Build Instructions
1. Run the Windows Powershell as administrator.
2. Install build tools to compile [native Node modules](https://www.npmjs.com/package/windows-build-tools#examples-of-modules-supported): `npm install -g windows-build-tools`.
3. Rerun `npm install` in a separate command prompt window.

#### Sample `.env`
```
RDS_HOST=localhost
RDS_PORT=5432
RDS_DATABASE=membership_portal
RDS_USER=acmucsd_dev
RDS_PASSWORD=password

AUTH_SECRET=secret

CLIENT=localhost:8000
```
**Note**: For Windows users, `localhost` won't work&mdash;you'll need to set `RDS_HOST` to [the Docker Machine's IP address](https://docs.docker.com/machine/reference/ip/).

### Useful Commands
+ `docker-compose up -d` to configure and run any required services
+ `npm install` to install the necessary dependencies
+ `npm run dev` to run the Node app with [Nodemon](https://nodemon.io/) and [ts-node](https://github.com/TypeStrong/ts-node)
+ `npm run lint` to lint the Node app with [ESLint](https://eslint.org/) (without `--fix`)
+ `npm run lint:fix` to fix the simple linter issues automatically
+ `npm run test` to run the test suite with [Jest](https://jestjs.io/)
+ `npm run db:migrate` to run any new database migrations
+ `npm run db:rollback` to roll back the last database migration
+ `npm run db:seed` to populate the database with seeds
+ `npm run db:unseed` to completely clear the database
+ `docker exec -it rds.acmucsd.local psql -U [RDS_USER] -d [RDS_DATABASE]` to access Postgres (`RDS_XYZ` from `.env`).

Take a look at [`package.json`](https://github.com/acmucsd/membership-portal/blob/master/package.json) for the actual commands.

### Database Migrations
To write database migrations, take a look at the [TypeORM documentation](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md) and [previous migrations](https://github.com/acmucsd/membership-portal/tree/master/migrations). Everything's already configured via [`ormconfig.ts`](https://github.com/acmucsd/membership-portal/blob/master/ormconfig.ts) so executing `npm run db:migrate` should work. Migrations on the production database automatically run upon deployment using Heroku's [`release` phase](https://devcenter.heroku.com/articles/release-phase) (configured in the [Procfile](https://github.com/acmucsd/membership-portal/blob/master/Procfile#L1)).

### Upgrading to Latest Version
The first iteration of the membership portal is a JavaScript app written in 2019. The second and latest iteration, written 2020, is a TypeScript app built with better reliability and error handling, stronger concurrency guarantees, and a smoother development experience in mind, and includes a number of breaking changes at the API and database levels. To make upgrades to API clients and deployed environments easy and consistent, we've put together a list of API breaks and changes:
+ `GET /auth/resetPassword`: renamed to `/auth/passwordReset`
+ `POST /auth/resetPassword`: renamed to `/auth/passwordReset`
+ some routes (e.g. events search) accept optional auth tokens for more detailed responses
+ `POST /user/bonus`: renamed to `/admin/bonus`
+ `POST /user/milestone`: renamed to `/admin/milestone`; `resetPoints?: boolean` has been replaced in the request body by `points?: number`
+ `GET /store/collection/:uuid`: `merchandise` has been renamed in the response body to `items`
+ `GET /store/merchandise`: deleted
+ passwordChange field is breaking change (see Auth/UserControllerRequests)
+ `POST /user/picture/:uuid`: the UUID parameter is optional
+ `GET /attendance/:uuid?`: the `attendance` field in the response body has been renamed `attendances`
+ `POST /attendance/attend`: no longer reachable, requests should be made to `/attendance`

and a simple upgrade procedure:
1. Update the app to the latest release of the first iteration ([0.14.2](https://github.com/acmucsd/membership-portal/releases/tag/v0.14.2)).
2. Manually run this SQL script.
3. Update the app to the latest release ([latest](https://github.com/acmucsd/membership-portal/releases/latest)).

<!--
validation
typing
transactions-by-default
service layer for better code reuse
more natural relations
paging by default
flexible security
complex querying
-->


