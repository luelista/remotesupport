fs = require("fs")
pem = require("pem")
_ = require("underscore")

Plugin "admin", "0.0.1", (App) ->
  App.on "connection", (handler) ->
    return  unless handler.authState is "admin"

    handler.messenger["admin:get_hosts"] = (type, data, next) ->
      hosts = []
      for i of App.connections
        host = App.connections[i]
        hosts.push _.extend(
          id: host.id
          pendingCSR: (if host.pendingCSR then true else false)
          auth: host.authState
        , host.hostInfo)
      next null, hosts
