var Sequelize = require('sequelize');

var sequelize = new Sequelize('database', 'username', 'password', {
  // sqlite! now!
  dialect: 'sqlite',

  // the storage engine for sqlite
  // - default ':memory:'
  storage: app.configDir+'/rs-server.sqlite'
});

var User = sequelize.define('User', {
  username: Sequelize.STRING,
  password: Sequelize.STRING
})

var CSR = sequelize.define('CSR', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  commonName: Sequelize.STRING,
  ou: Sequelize.STRING,
  modulus: Sequelize.STRING,
  pem: Sequelize.STRING,
  cert: Sequelize.STRING,
  privateKey: Sequelize.STRING,
  remoteEndpoint: Sequelize.STRING
})

sequelize
//.authenticate()
.sync()//({ force: true })
.complete(function(err) {
  if (!!err) {
    console.log('Unable to connect to the database:', err)
  } else {
    console.log('Connection has been established successfully.')
  }
})


exports.sequelize = sequelize;
exports.User = User;
exports.CSR = CSR;
