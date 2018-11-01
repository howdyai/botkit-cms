var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var hbs = require('express-hbs');
var basicAuth = require('express-basic-auth')

module.exports = function(admin_creds) {


    var webserver = express();
    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));

    webserver.use(express.static(__dirname + '/../public'));

    webserver.engine('hbs', hbs.express4({
        partialsDir: __dirname + '/../views/partials'
    }));

    webserver.set('view engine', 'hbs');
    webserver.set('views', __dirname + '/../views/');

    var authFunction = basicAuth({
        users: admin_creds,
        challenge: true,
    });

    webserver.use(function(req, res, next) {
        if (req.url.match(/^\/admin/)) {
            authFunction(req, res, next);
        } else {
            next();
        }
    });


    webserver.listen(process.env.PORT || 3000, null, function() {

        console.log('Express webserver up on port ' + (process.env.PORT || 3000));
        console.log('Login: http://localhost:' + (process.env.PORT || 3000) + '/admin/');
        console.log('API Root: http://localhost:' +  (process.env.PORT || 3000) + '/');

    });

    return webserver;

}
