var net = require('net'),
    nssocket = require('nssocket'),
    tls = require('tls'),
    fs = require('fs');
var Netmask = require('netmask').Netmask;

var config = require('./config');
if(config.adminNetmask) config.adminNetmask = new Netmask(config.adminNetmask);

var connections = [];
var idCounter = 1;

// messaging server
nssocket.createServer({
  'type' : 'tls',
  'cert' : fs.readFileSync(config.serverCertFile),
  'key' : fs.readFileSync(config.serverKeyFile)
}, function (socket) {
  var unauthenticated = true;
  socket.authState = '';
  socket.hostInfo = {};
  socket.hostInfo.address = socket.socket.remoteAddress;
  socket.hostInfo.connectionTimestamp = Timestamp();
  socket.id = idCounter++; // TODO: make up more complicated id
  connections.push(socket);
  console.log('Connection...');
  
  socket.on('error', function(err) {
    console.log('socket error:', err);
    RemoveConnection(socket);
  });
  socket.data(['rsvp', 'login-as-admin'], function (data) {
    if (!unauthenticated) {
      socket.send(['rsvp', 'login-access-denied'], { 'reason': 'ALREADY_AUTHENTICATED' });
      return;
    }
    setTimeout(function() {
      if (data.username == config.adminUser && data.password == config.adminPassword) {
        if (!config.adminNetmask || config.adminNetmask.contains(socket.socket.remoteAddress)) {
          unauthenticated = false;
          AdminProtocol(socket);
          socket.send(['rsvp', 'login-successful'], { yourId: socket.id });
        } else {
          socket.send(['rsvp', 'error'], { 'type': 'ACCESS_DENIED', 'reason': 'IP_RANGE' });
        }
      } else {
        socket.send(['rsvp', 'error'], { 'type': 'ACCESS_DENIED', 'reason': 'CREDENTIALS' });
      }
    }, 1000);
  });
  
  socket.data(['rsvp', 'login-as-client'], function (data) {
    console.log('Login as client');
    if (!unauthenticated) {
      socket.send(['rsvp', 'error'], { 'reason': 'ALREADY_AUTHENTICATED' });
      return;
    }
    unauthenticated = false;
    for(var k in data.hostInfo) socket.hostInfo[k] = data.hostInfo[k];
    socket.hostInfo.connectionAlive = Timestamp();
    ClientProtocol(socket);
    socket.send(['rsvp', 'login-successful']);
  });
  
  socket.data(['rsvp', 'heartbeat'], function(data) {
    socket.hostInfo.connectionAlive = Timestamp();
    for (var key in data.hostInfo) {
      socket.hostInfo[key] = data.hostInfo[key];
    }
  })
  
  socket.send(['rsvp', 'please-authenticate']);
  
  socket.on('close', function() {
    RemoveConnection(socket);
  });
  console.log('...accepted');
  
}).listen(config.serverPort);

function RemoveConnection(socket) {
  var index = connections.indexOf(socket);
  if (index != -1) {
    connections.splice(index, 1);
  }
}

var tunnelIds = {};

// tunnel server
tls.createServer({
  'cert' : fs.readFileSync(config.serverCertFile),
  'key' : fs.readFileSync(config.serverKeyFile)
}, function(socket) {
  //socket.pause();
  socket.on('error',function(err) {});
  console.log("(tunnel connection)");
  socket.once('data', function(data) {
    socket.pause();
    var ID = data;
    console.log('incoming tunnel request: '+ID);
    if (tunnelIds[ID]) {
      var tunData = tunnelIds[ID];
      switch (tunData.state) {
      case 'connecting':
        tunnelIds[ID].waitingSocket.pipe(socket);
        socket.pipe(tunnelIds[ID].waitingSocket);
        socket.resume(); tunnelIds[ID].waitingSocket.resume();
        tunnelIds[ID].connectedSocket = socket;
        socket.on('close', function() { tunnelIds[ID].state='closed' });
        tunnelIds[ID].state = 'established';
        break;
      case 'listening':
        var newID = Math.floor((Math.random() * 100000000)+100000000).toString(36)
        tunnelIds[newID] = JSON.parse(JSON.stringify(tunnelIds[ID]));
        
        tunnelIds[newID].state = 'connecting';
        tunnelIds[newID].waitingSocket = socket;
        var recipient = GetConnectionById(tunnelIds[newID].clientId2);
        if (recipient) {
          console.log("calling clientId2 for tunnel with id:"+newID)
          recipient.send(['rsvp', 'tunnel-request'], { direction: tunnelIds[newID].nextDirection, host: tunnelIds[newID].host2, port: tunnelIds[newID].port2, tunnelId: String(newID) });
        }
        break;
      default:
        socket.write('Error'); socket.end();
      }
    } else {
      socket.end();
    }
  });
}).listen(config.serverPort + 1);


// helper functions

function Timestamp() {
  return Math.floor((+new Date()));
}

function GetConnectionById(id) {
  for (var i in connections) {
    if (id == connections[i].id) {
      return connections[i];
    }
  }
  return false;
}

function TidyConnections() {
  console.log("TidyConnections: checking "+connections.length+" connection");
  var ts = Timestamp();
  for (var i = connections.length - 1; i >= 0; i--) {
    if ((ts - connections[i].hostInfo.connectionAlive) > 90000) {
      //connections[i].hostInfo.connectionAlive = "DEAD";
      connections[i].destroy();
      connections.splice(i, 1);
    }
  }
}

setInterval(TidyConnections, 5000);


// protocol handlers

function AdminProtocol(socket) {
  socket.authState = 'admin';
  socket.data(['rsvp', 'admin', 'list-connections'], function() {
    var info = [];
    for (var i in connections) {
      info.push({ id: connections[i].id, auth: connections[i].authState, hostInfo: connections[i].hostInfo})
    }
    socket.send(['rsvp', 'connection-list-response'], { list: info });
  });
  socket.data(['rsvp', 'admin', 'send-message'], function(data) {
    var recipient = GetConnectionById(data.to);
    if (recipient) {
      recipient.send(['rsvp', 'message'], { fromAuth: 'admin', fromAddress: socket.remoteAddress, fromId: socket.id, message: data.message });
    } else {
      socket.send(['rsvp', 'error'], { 'type': 'SEND_MESSAGE_FAILED', reason: 'RECIPIENT_UNKNOWN' });
    }
  });
  socket.data(['rsvp', 'admin', 'exec-command'], function(data) {
    var tunId = Math.floor((Math.random() * 100000000)+100000000).toString(36)
    console.log("calling for tunnel with id",tunId);
    var recipient = GetConnectionById(data.clientId1);
    data.state = 'listening'; data.nextDirection = 'server-once'; data.port = data.port1; data.tunnelId = tunId;
    tunnelIds[tunId] = data;
    recipient.send(['rsvp', 'exec'], data);
  });
  socket.data(['rsvp', 'admin', 'create-tunnel'], function(data) {
    var tunId = Math.floor((Math.random() * 100000000)+100000000).toString(36)
    var recipient = GetConnectionById(data.clientId1);
    if (!recipient) return;
    data.state = 'listening'; data.nextDirection = 'connect';
    tunnelIds[tunId] = data;
    recipient.send(['rsvp', 'tunnel-request'], { direction: 'server', port: data.port1, tunnelId: tunId });
  });
  socket.data(['rsvp', 'admin', 'list-tunnels'], function(data) {
    socket.send(['rsvp', 'tunnel-list-response'], { list: tunnelIds });
  });
}

function ClientProtocol(socket) {
  socket.authState = 'client';
  socket.data(['rsvp', 'client', 'send-message'], function(data) {
    var recipient = GetConnectionById(data.to);
    if (recipient) {
      recipient.send(['rsvp', 'message'], { fromAuth: 'client', fromAddress: socket.remoteAddress, fromId: socket.id, message: data.message });
    }
  });
}

var Table = require('ascii-table');

process.on('SIGTSTP', function() {
  var tab = new Table();
  tab.setHeading('ID', 'State', 'OS', 'RemoteIP', 'Hostname', 'Display Name', 'CPU', 'Alive');
  for (var i in connections) {
    tab.addRow(connections[i].id, connections[i].authState, connections[i].hostInfo.type, connections[i].hostInfo.address, connections[i].hostInfo.hostname, connections[i].hostInfo.displayName, connections[i].hostInfo.loadavg, connections[i].hostInfo.connectionAlive);
  }
  
  console.log('Current connections to server:');
  console.log(tab.toString());
  
  var tab = new Table();
  tab.setHeading('ID', 'State', 'Client ID 1', 'Port 1', 'Next Direction', 'Client ID 2', 'Port 2');
  for (var i in tunnelIds) {
    tab.addRow(i, tunnelIds[i].state, tunnelIds[i].clientId1, tunnelIds[i].port1, tunnelIds[i].nextDirection, tunnelIds[i].clientId2, tunnelIds[i].port2);
  }
  console.log('Tunnel IDs:');
  console.log(tab.toString());
  
  
});


