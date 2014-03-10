var fs = require('fs'),
    pem = require('pem'),
    _ = require('underscore');

Plugin("admin", "0.0.1", function(App) {
  App.on('connection', function(handler) {
    handler.messenger["admin:get_hosts"] = function(type, data, next) {
      var hosts = [];
      for (var i in App.connections) {
        var host = App.connections[i];
        hosts.push(_.extend({}, host.hostInfo));
      }
      next(null, extend({ id: handler.id, auth: handler.authState }, handler.hostInfo));
    };

  });
});

var extend = function(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
        for (var prop in source) {
            obj[prop] = source[prop];
        }
    });
    return obj;
};
