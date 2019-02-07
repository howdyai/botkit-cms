require('dotenv').config()
var api = require(__dirname + '/src/api.js')()

if (!process.env.USERS) {
    throw new Error('Specify at least one username:password combo in the USERS environment variable')
}

var admin_creds = api.parseAdminUsers(process.env.USERS);

// load scripts from file
api.loadScriptsFromFile(__dirname + '/.data/scripts.json', __dirname + '/sample_scripts.json').catch(function(err) {
    console.log('Could not load scripts from file:', err);
    process.exit(1);
}).then(function(scripts) {
    // verify that we can now write back to the file.
    api.writeScriptsToFile(scripts).catch(function(err) {
        console.error(err);
        process.exit(1);
    });
}).catch(function(err) {
    console.error(err);
    process.exit(1);
});

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')(admin_creds);

require(__dirname + '/components/routes/admin.js')(webserver, api);
require(__dirname + '/components/routes/api.js')(webserver, api);

webserver.get('/', function(req, res) {
    res.render('instructions',{layout: null});
});
