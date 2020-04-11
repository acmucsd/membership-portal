## membership-portal &nbsp; [![CircleCI](https://circleci.com/gh/acmucsd/membership-portal/tree/master.svg?style=svg)](https://circleci.com/gh/acmucsd/membership-portal/tree/master)
REST API for the UC San Diego ACM chapter's membership portal.

### Build Instructions
Feel free to use `yarn ...` instead of `npm run ...`, but make sure not to commit the `yarn.lock`.

1. Clone the repository: `git clone https://github.com/acmucsd/membership-portal`.
2. Navigate to the directory: `cd membership-portal`.
3. Install PostgreSQL. See [installation instructions below](#installing-postgres).
4. Install the necessary dependencies: `npm install`. For Windows users, see [specific build instructions below](#windows-build-instructions).
5. Create a new `.env` file using `.env.example` as a template: `cp .env.example .env`.
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

SENDGRID_USER=
SENDGRID_API_KEY=

CLIENT=localhost:8000
```
**Note**: For Windows users, `localhost` won't work&mdash;you'll need to set `RDS_HOST` to [the Docker Machine's IP address](https://docs.docker.com/machine/reference/ip/).

#### Useful Commands
+ `docker-compose up -d` to configure and run any required services
+ `npm install` to install the necessary dependencies
+ `npm run dev` to run the Node app with [Nodemon](https://nodemon.io/)
+ `npm run lint` to lint the Node app with [ESLint](https://eslint.org/) (without `--fix`)
+ `npm run lint:fix` to handle the simple linter issues automatically
+ `npm run test` to run the test suite with [Jest](https://jestjs.io/)
+ `npm run db:migrate` to run any new database migrations
+ `npm run db:rollback` to roll back the last database migration
+ `npm run db:seed` to populate the database with seeds
+ `npm run db:unseed` to completely clear the database
+ `docker exec -it rds.acmucsd.local psql -U [RDS_USER] -d [RDS_DATABASE]` to access Postgres (`RDS_XYZ` from `.env`).

Take a look at [`package.json`](https://github.com/acmucsd/membership-portal/blob/master/package.json) for the actual commands.

#### Database Migrations
To write database migrations, take a look at the [Sequelize documentation](https://sequelize.org/master/manual/migrations.html) and [previous migrations](https://github.com/acmucsd/membership-portal/tree/master/app/db/migrations). Everything's already configured via [`.sequelizerc`](https://github.com/acmucsd/membership-portal/blob/master/.sequelizerc) so executing `npm run db:migrate` should work. Migrations on the production database automatically run upon deployment using Heroku's [`release` phrase](https://devcenter.heroku.com/articles/release-phase) (configured in the [Procfile](https://github.com/acmucsd/membership-portal/blob/master/Procfile#L1)).


