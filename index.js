require('dotenv').config();
var MongoClient = require('mongodb').MongoClient;

async function connect() {
  if (!process.env.USERS) {
    console.log('Please specify at least one username:password combo in the USERS environment variable')
  }
    
  if (process.env.MONGODB_URL) {
    client = await MongoClient.connect(process.env.MONGODB_URL)
    db = client.db(process.env.MONGODB_DB_NAME);
  } else {
    db = null;
  }
  
  var api = require(__dirname + '/src/api.js')(db);
  var admin_creds = api.parseAdminUsers(process.env.USERS);

  // Set up an Express-powered webserver to expose oauth and webhook endpoints
  var webserver = require(__dirname + '/components/express_webserver.js')(admin_creds);

  require(__dirname + '/components/routes/admin.js')(webserver, api);
  require(__dirname + '/components/routes/api.js')(webserver, api);
  
  // load scripts
  if (db === null) {
    api.loadScriptsFromFile(__dirname + '/.data/scripts.json', __dirname + '/.data/sample_scripts.json').catch(function(err) {
      console.log('Could not load scripts from file:', err);
      process.exit(1);
    });
  }
    
  webserver.get('/', function(req, res) {
    res.render('instructions',{layout: null});
  });
}

connect();
