
# Development Notes

## NPM Link

Developing this framework requires using `npm link` to add a local branch of this repo as a dependency for another project that implements it.

One one occasion, and for a reason I did't understand, the implementing project lost track of the local dependency. To resolve that I had to __unlink__ and __relink__ the dependency. If you are ever in a similar situation, the these steps should resolve the issue:



1. Delete the node_modules in both the dependency and the consumer module.
2. Run npm unlink --no-save [dependency-module]
3. re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.


## File Watchers


I use [nodemon](https://www.npmjs.com/package/nodemon) when developing locally to contineally restart the server upon saved changes. On occasion, and for unknown reasons, my system would report this error: 

>Error: ENOSPC: System limit for number of file watchers reached

After a little Sherlocking, I found a solution on [this medium post](https://medium.com/@bestafiko/npm-npm-start-error-enospc-system-limit-for-number-of-file-watchers-reached-bdc0eab0a159). :100: to @bestafiko

```sh
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

## Publishing

Publishing new versions requires creating a tarball and pushing that NPM. For quick reference, here are the steps.

```sh
npm login # enter username & password
npm pack && npm publish
```
