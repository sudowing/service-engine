


### install lib and dependencies
```
npm i knex pg service-engine
```

### example app
```
const knex = require('knex');
const ignite = require('service-engine').ignite;

const knexConfig = require('../knexfile');
const metadata = require("./metadata.json");

const knexConfig = {
    client: 'pg',
    connection: 'postgres://postgres:password@localhost:5432/postgres',
}

// consider all these keys required for now
const metadata = {
    appShortName: "some-app-service",
    title: "Some App Service",
    description: "Basic description of core resources.",
    termsOfService: "http://website.io/terms/",
    name: "Joe Wingard",
    email: "open-source@joewingard.com",
    url: "https://github.com/sudowing/service-engine",
    servers: [
        "http://localhost:8080",
        "https://alpha.com",
        "https://bravo.com",
        "https://charlie.com"
    ]
};

const port = 8080;

const db = knex(knexConfig);

const main = async () => {
  await db.migrate.latest();

  const { App, apolloServer, logger } = await ignite({ db, metadata });

  logger.info("🔧 DB Migrations Run");

  App.listen({ port }, () => {
    logger.info({ port 
    }, `🔥 REST Server ready at http://localhost:${port}/openapi`);
    logger.info(`🚀 GraphQL Server ready at http://localhost:${port}${apolloServer.graphqlPath}`);
  });
};

main();
```
