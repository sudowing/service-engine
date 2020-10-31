
# Related projects:
## Implementation & Public Docker Image 
This project, `service-engine`, is a distributed as an `NPM` package -- but must be implemented to be useful.

I've built project that implements this package, so if you would like to see what that looks like -- or are looking for something easily forkable -- this is probably

Also, I've used this implementation as the basis for the public Docker Image available on [Docker Hub](https://hub.docker.com/r/sudowing/service-engine).

## Forkable Service Template 
[Clonable project](https://github.com/sudowing/service-engine-template) 

Instead of having to actually implement this within a node app, you can simply skip that step and run the app as a Docker container, using the  public docker image.

This project 

, containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars)
## Demo Project 
demo project, complete with insomnia export that shows multiple CRUD calls via REST & GraphQL against all currenly supported DBs (postgres, mysql and sqlite3)
## Local DB Guide

Developing this project required working with multiple DBs and learning to standup and load PostGIS.

There are several guides spread around the internet explaining how to run various DBs via containers, so I've simply aggregated the steps and publsihed them here.

Seperately -- the process of loading spacial data into PostGIS was completely new to me. I have worked with these types of systems, benefiting greatly from the work of some awesome data folks, but I'd never been required to dive into that myself.

This project change that. so I've also included instructions on how to run PostGIS via a container **AND** I've provided the steps needed to load it. From downloading source material (shapefiles), converting them to `SQL` insert statements to the `CLI` needed to quickly import the data -- I've documented it all.

[Local DB Guide](https://github.com/sudowing/guide-local-databases), which shows you how to quickly setup and load demo postgres, postgis and mysql databases -- used for the demo project and your exploration of this framework.
Much of that guide is built on prior-art, but it aggregates step-by-step instructions required for the running (and populating) of various db engines, mostly within docker containers with persistant data.
