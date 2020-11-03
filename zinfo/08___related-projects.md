
# <a id="related-projects"></a>Related projects:

## <a id="related-projects_node-implementation-public-docker-image"></a>Node Implementation & Public Docker Image 

##### [GitHub Repo](https://github.com/sudowing/service-engine-docker) 

If you would like to see what a node.js implementation looks like, or are looking for something easily forkable, I've built such an application that serves as the basis for the public Docker Image available on [Docker Hub](https://hub.docker.com/r/sudowing/service-engine).

## <a id="related-projects_forkable-service-template"></a>Forkable Service Template 
##### [GitHub Repo](https://github.com/sudowing/service-engine-template) 

Instead of having to actually implement this within a node app, you can simply skip that step and run the app as a Docker container, using the  public docker image.

The repo above is a minimalistic project that implements the public Docker Container -- containing only the resources unique to an implementation (metadata, migration files, middleware, complex resources, permissions and env vars).

## <a id="related-projects_local-db-development-guide"></a>Local DB Development Guide
##### [GitHub Repo](https://github.com/sudowing/guide-local-databases)

Developing this project required working with multiple DBs and learning to standup and load PostGIS.

There are several guides spread around the internet explaining how to run various DBs via containers, so I've simply aggregated the steps and publsihed them here.

Additionally, the process of loading spacial data into PostGIS was completely new to me. I have worked with these types of systems, benefiting greatly from the work of some awesome data folks, but I'd never been required to dive into that myself. **This project changed that.**

In [this repo](https://github.com/sudowing/guide-local-databases#postgis-local-development-guide)
I've included instructions on how to run PostGIS via a container **AND** I've provided the steps needed to load it. From downloading source material (shapefiles), to converting them to `SQL` insert statements and using the `CLI` to import the data -- every step is documented.
