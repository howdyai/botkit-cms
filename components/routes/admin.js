
const uuidv4 = require('uuid/v4');
const request = require('request');
const async = require('async');

module.exports = function(webserver, api) {

    webserver.get('/admin', function(req, res) {
        res.render('index',{
            layout: 'layouts/layout',
        });
    });

    webserver.get('/admin/edit/:name', function(req, res) {
        res.render('edit',{
            layout: 'layouts/layout',
            platform: process.env.PLATFORM || 'web',
            command_id: req.params.name,
        });
    });

    webserver.post('/admin/save', function(req, res) {
        api.saveScripts(req.body).then(function(response) {
            res.json(response)
        })
    });

    // receives: command, user
    webserver.post('/admin/api/script', function(req, res) {
        if (req.body.command) {
            api.getScript(req.body.command).then(function(script) {
                res.json({success: 'ok', data: script});
            }).catch(function(err) {
                if (err) {
                    console.error('Error in getScript',err);
                }
                res.json({});
            })
        } else if (req.body.id) {
            api.getScriptById(req.body.id).then(function(script) {
                res.json(script);
            }).catch(function(err) {
                if (err) {
                    console.error('Error in getScript',err);
                }
                res.json({});
            })
        }
    });


    // receives: command, user
    webserver.get('/admin/api/scripts', function(req, res) {
        api.getScripts(req.query.tag).then(function(scripts) {
            res.json({success: true, data: scripts});
        }).catch(function(err) {
            if (err) {
                console.error('Error in getScripts',err);
            }
            res.json({});
        })
    });

    function parseLUISEndpoint(endpoint) {

        // endpoint in form of 
        // https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/<APPID>?subscription-key=<SUBID>&verbose=true&timezoneOffset=-360&q=

        const config = {
            region: 'westus',
            app: '',
            key: '',
        }

        config.region = endpoint.match(/https\:\/\/(.*?)\.api/)[1];
        config.app = endpoint.match(/\/apps\/(.*?)\?/)[1];
        config.key = endpoint.match(/subscription\-key\=(.*?)\&/)[1];
        config.version = process.env.LUIS_VERSION || "0.1";

        return config;

    }

    webserver.get('/admin/api/luisIntents', function(req, res) {
        if (process.env.LUIS_ENDPOINT) {

            const luisConfig = parseLUISEndpoint(process.env.LUIS_ENDPOINT);
            var url = `https://${ luisConfig.region }.api.cognitive.microsoft.com/luis/api/v2.0/apps/${ luisConfig.app }/versions/${ luisConfig.version }/intents?skip=0&take=500`;

            var options = {
                method: 'GET',
                url: url,
                headers: {
                    'Ocp-Apim-Subscription-Key': luisConfig.key
                }
            };
            request(options, function(err, resp, body) {
                if (err) {
                    console.error('Error commnicating with LUIS:', err);
                    res.json({success: true, data: []});
                } else {
                    var intents = [];
                    try {
                        intents = JSON.parse(body);
                    } catch(err) {
                        console.error('Error parsing LUIS intents:', err);
                    }
                    res.json({success: true, data: intents});
                }                  
            });
          
        } else {
            res.json({success: true, data: []});
        }

    });

    webserver.delete('/admin/api/scripts/:id', function(req, res) {
        api.deleteScript(req.params.id).then(function(response) {
            res.json(response);
        })
    });

    webserver.get('/admin/config', function(req, res) {

        var allowed_tokens = process.env.TOKENS ? process.env.TOKENS.split(/\s+/) : [];

        var package_version = require('../../package.json').version;

        res.render('config',{
            layout: 'layouts/layout',
            tokens: allowed_tokens.join("\n"),
            token_count: allowed_tokens.length,
            version: package_version,
            url: req.protocol + "://" + req.headers.host
        });
    })


}
