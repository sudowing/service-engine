
## development notes

What worked for me was to:

    Delete the node_modules in both the dependency and the consumer module.
    Run npm unlink --no-save [dependency-module]
    re-link with the 2-link commands as per npm-link

Now I am able to fully test my unpublished module locally.

Additionally, there is an npm pack command which can help you test your unpublished modules, although not quite as robust.

### file watchers (I reach limits)
https://medium.com/@bestafiko/npm-npm-start-error-enospc-system-limit-for-number-of-file-watchers-reached-bdc0eab0a159

echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p


