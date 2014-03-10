Sequelize = require("sequelize")
sequelize = new Sequelize("database", "username", "password",

  # sqlite! now!
  dialect: "sqlite"

  # the storage engine for sqlite
  # - default ':memory:'
  storage: app.configDir + "/rs-server.sqlite"
)
Certificate = sequelize.define("User",
  id:
    type: Sequelize.INTEGER
    primaryKey: true
    autoIncrement: true

  commonName: Sequelize.STRING
  ou: Sequelize.STRING
  fingerprint: Sequelize.STRING
)
ManagedHosts = sequelize.define("ManagedHosts",
  status: Sequelize.STRING
  permission: Sequelize.STRING
)
Certificate.hasMany Certificate,
  through: ManagedHosts

CSR = sequelize.define("CSR",
  id:
    type: Sequelize.INTEGER
    primaryKey: true
    autoIncrement: true

  commonName: Sequelize.STRING
  ou: Sequelize.STRING
  modulus: Sequelize.STRING
  pem: Sequelize.STRING
  cert: Sequelize.STRING
  privateKey: Sequelize.STRING
  remoteEndpoint: Sequelize.STRING
)

#.authenticate()

#.sync({ force: true })
sequelize.sync().complete (err) ->
  unless not err
    console.log "Unable to connect to the database:", err
  else
    console.log "Connection has been established successfully."

exports.sequelize = sequelize
exports.Certificate = Certificate
exports.ManagedHosts = ManagedHosts
exports.CSR = CSR
