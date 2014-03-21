var fs = require('fs'),
    pem = require('pem'),
    _ = require('underscore');

Plugin("tunnel_broker", "0.0.1", function(App) {
  var tunIdCounter = 1;
  var tunInfo = {};

  App.on('connection', function(handler) {
    handler.messenger["tunnel_broker:connect"] = function(type, data, next) {
      tunIdCounter++;
      tunInfo[tunIdCounter] = { info: data };
      var conn = App.getConnectionById(info.targetId);
      if (!conn) {
        handler.sendMessage('on_forward_error', 'host not found');
        return;
      }
      conn.sendMessage('tunnel:connect', { tunnelId: tunIdCounter , info: data }, function(err, info) {
        next(null, { tunnelId: tunIdCounter });
      });
    };

    handler.on('multiplexconnect', function(id, conn) {
      if (id.length > 2 && id.substr(0,2) == "T:") {
        var tunId = parseInt(id.substr(2), 10);
        var info = tunInfo[tunId];

        var conn = App.getConnectionById(info.targetId);
        if (!conn) {
          handler.sendMessage('on_forward_error', 'host not found');
          return;
        }
        var ended = false;
        var downstream = conn.multiplex.connect({
          // optionally specify an id for the stream. By default
          // a v1 UUID will be assigned as the id for anonymous streams
          id: 'T:'+tunIdCounter
        }, function() {
          connection.pipe(downstream).pipe(connection);
        }.bind(this)).on('error', function(error) {
          this.sendMessage('on_forward_error', ''+error);
        }.bind(this)).on('end', function() {
          console.log("host end");
          if (!ended) connection.end("Host closed connection");
          ended = true;
        });
        connection.on('end', function() {
          console.log("admin end");
          if (!ended) downstream.end();
          ended = true;
        });

      }
    });

  });
});
