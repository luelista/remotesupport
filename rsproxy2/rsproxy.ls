
net = require("net")
MultiplexStream = require("multiplex-stream")
tls = require("tls")
fs = require("fs")
events = require("events")
Netmask = require("netmask").Netmask

App = ->
App:: = new events.EventEmitter()
app = new App()

global.app = app
app.configDir = process.env.RS_DIR or "/tmp/rs"
app.config = require(app.configDir + "/rs-server-config")
app.config.adminNetmask = new Netmask(app.config.adminNetmask)  if app.config.adminNetmask

app.db = require("./database")
app.plugins = []

global.Plugin = (name, ver, onInit) !->
  app.plugins.push(
    name: name
    ver: ver
    onInit: onInit
  )

App::runPlugins = ->
  for i of @plugins
    @plugins[i].onInit this

fs.readdirSync("./plugins").forEach (file) ->
  require "./plugins/" + file if file.match(/\.js$/)

app.connections = []
app.idCounter = 1
app.seqCounter = 1
app.tls_options =
  key: fs.readFileSync(app.configDir + "/rs-server.key")
  cert: fs.readFileSync(app.configDir + "/rs-server.crt")

  # This is necessary only if using the client certificate authentication.
  requestCert: true

  # This is necessary only if the client uses the self-signed certificate.
  ca: [ fs.readFileSync(app.configDir + "/ca/rs-ca.crt") ]


# The connectTimeout optionally specifies how long to
# wait in milliseconds for the downstream multiplex to
# accept connections. It defaults to 3000 milliseconds
app.multiplex_options = connectTimeout: 5000
ClientHandler = (cleartextStream) ->
  self = this
  @cleartextStream = cleartextStream
  @id = app.idCounter++ # TODO: make up more complicated id
  @authState = ""
  @hostInfo =
    address: cleartextStream.remoteAddress
    connectionTimestamp: +new Date()
  if cleartextStream.authorized
    @cert = cleartextStream.getPeerCertificate()
    @authState = (if (@cert.subject.OU is app.config.adminOU) then "admin" else "host")
    @hostInfo.cn = @cert.subject.CN
    @hostInfo.email = @cert.subject.EMAIL
  @sequenceCallback = {}
  @messenger = {}
  downstreamMultiplex = new MultiplexStream(app.multiplex_options, (downstreamConnection) ->
    self.onMultiplexConnection downstreamConnection
  )
  cleartextStream.pipe(downstreamMultiplex).pipe cleartextStream
  cleartextStream.on "close", ( ->
    index = app.connections.indexOf(this)
    app.connections.splice index, 1  if index > -1
  ).bind(this)

ClientHandler:: = new events.EventEmitter()
ClientHandler::onControlConnection = require("rsproto/jsonCtrlMessage").onControlConnection
ClientHandler::onMultiplexConnection = (connection) ->

  # a multiplexed stream has connected from upstream.
  # The assigned id will be accessible as downstreamConnection.id
  switch connection.id
    when "\"ctrl"
      @controlConnection = connection
      @onControlConnection connection

ClientHandler::sendMessage = (mtype, data, callback) ->
  seqnum = null
  if callback
    seqnum = app.seqCounter++
    @sequenceCallback[seqnum] = callback
  @controlConnection.write JSON.stringify([ seqnum, null, mtype, data ]) + "\n"


# run server
tls.createServer(app.tls_options, (cleartextStream) ->
  console.log "Connection..."
  handler = new ClientHandler(cleartextStream)
  app.connections.push handler
  app.emit "connection", handler
)
.listen(app.config.serverPort)
.on "clientError", (err, pair) ->
  console.log "clientError", err

app.runPlugins()
console.log "Listening on port " + app.config.serverPort + " ..."
