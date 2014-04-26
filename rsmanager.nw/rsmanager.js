
var net = require('net'),
    MultiplexStream = require('multiplex-stream'),
    tls = require('tls'),
    fs = require('fs'),
    pem = require('pem'),
    rsproto = require('rsproto');

App = {};
App.debugCache=[];
App.debug = function(){ App.debugCache.push(arguments) }

App.configDir = process.env.RS_DIR || "./config";
App.config = rsproto.loadConfig(App.configDir + '/config.json');

var serverHost = process.env.RS_HOST || App.config.proxy_host || "127.0.0.1";
var serverPort = process.env.RS_PORT || App.config.proxy_port || 4711;

var certCountry = App.config.certificate_country || "DE",
    certState = App.config.certificate_state || "",
    certOrganization = App.config.certificate_organization || "Acme Remote Support";

var args = process.argv.slice(2);
App.conn = null;

function connect() {
  var crtPath = App.configDir+"/rsctl.crt";
  if (!fs.existsSync(crtPath)) crtPath = null;
  var caCertPath = App.configDir+"/rsctl-ca.crt";
  if (!fs.existsSync(caCertPath)) caCertPath = null;
  App.debug("Connecting to "+serverHost+":"+serverPort);
  App.conn = new rsproto(serverHost, serverPort, 'rsmanager', false, App.configDir+"/rsctl.key", crtPath, caCertPath);
}

connect();
App.conn.on('ctrlmessage', function(mtype, data) {
  App.debug("on Control Message", mtype);
});


// Takes an ISO time and returns a string representing how
// long ago the date represents.
App.prettyDate=function(time){
  var date = new Date(typeof time == 'number' ? time : (time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);
      
  if ( isNaN(day_diff) || day_diff < 0)
    return time;
  if ( day_diff >= 31 )
    return date.getDate()+"."+(date.getMonth()+1)+"."+date.getFullYear();
      
  return day_diff == 0 && (
      diff < 60 && /*"just now"*/ Math.floor(diff) + " secs ago" ||
      diff < 120 && "1 minute ago" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
      diff < 7200 && "1 hour ago" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}




App.prettyTimespan=function(diff){
  var  day_diff = Math.floor(diff / 86400);
      
  if ( isNaN(day_diff) || day_diff < 0)
    return diff;
  if ( day_diff >= 31 )
    return Math.ceil( day_diff / 30 ) + " months";
      
  return day_diff == 0 && (
      diff < 60 && "" + diff + " secs" ||
      diff < 120 && "1 minute" ||
      diff < 3600 && Math.floor( diff / 60 ) + " minutes" ||
      diff < 7200 && "1 hour" ||
      diff < 86400 && Math.floor( diff / 3600 ) + " hours") ||
    day_diff == 1 && "1 day" ||
    day_diff < 7 && day_diff + " days" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks";
}







var gui = require('nw.gui');
var mainMenu = new gui.Menu({ type: 'menubar' });
gui.Window.get().menu = mainMenu;

var menu = new gui.Menu();
mainMenu.append(
    new gui.MenuItem({
        label: 'Custom Menu',
        submenu: menu
    })
);
menu.append(new gui.MenuItem({ label: 'Item B' }));
menu.append(new gui.MenuItem({ type: 'separator' }));
menu.append(new gui.MenuItem({ label: 'Item C' }));

