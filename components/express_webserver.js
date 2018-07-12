var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var hbs = require('express-hbs');

module.exports = function() {


    var webserver = express();
    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));

    webserver.use(express.static(__dirname + '/../public'));

    webserver.engine('hbs', hbs.express4({
        partialsDir: __dirname + '/../views/partials'
    }));

    webserver.set('view engine', 'hbs');
    webserver.set('views', __dirname + '/../views/');


    webserver.listen(process.env.PORT || 3000, null, function() {

        console.log('Express webserver configured and listening at http://localhost:' + (process.env.PORT || 3000));

    });

    return webserver;

}
