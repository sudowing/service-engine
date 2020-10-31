
# Related projects:
## Public Docker Image 
Source for [public dockerfile](https://github.com/sudowing/service-engine-docker) that implements this node lib
## Forkable Service Template 
[Clonable project](https://github.com/sudowing/service-engine-template) that implements the public docker image, containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars)
## Demo Project 
demo project, complete with insomnia export that shows multiple CRUD calls via REST & GraphQL against all currenly supported DBs (postgres, mysql and sqlite3)
## Local DB Guide 
[Local DB Guide](https://github.com/sudowing/guide-local-databases), which shows you how to quickly setup and load demo postgres, postgis and mysql databases -- used for the demo project and your exploration of this framework.
Much of that guide is built on prior-art, but it aggregates step-by-step instructions required for the running (and populating) of various db engines, mostly within docker containers with persistant data.
