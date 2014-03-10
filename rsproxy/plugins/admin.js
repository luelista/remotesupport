var fs = require('fs'),
    pem = require('pem'),
    _ = require('underscore');

Plugin("admin", "0.0.1", function(App) {
  App.on('connection', function(handler) {
    if (handler.authState != 'admin') return;

    handler.messenger["admin:get_hosts"] = function(type, data, next) {
      var hosts = [];
      for (var i in App.connections) {
        var host = App.connections[i];
        hosts.push(
          _.extend({
            id: host.id,  self: host==handler,
            pendingCSR: host.pendingCSR?true:false,
            auth: host.authState
          }, host.hostInfo));
      }
      next(null, hosts);
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
