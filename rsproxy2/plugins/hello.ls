fs = require("fs")
pem = require("pem")
_ = require("underscore")

Plugin "hello_world", "0.0.1", (App) ->

  App.on "connection", (handler) ->

    handler.messenger["hello:who_am_i"] = (type, data, next) ->
      next null, _.extend(
        id: handler.id
        auth: handler.authState
      , handler.hostInfo)
