var request = require('request');
var fs = require('fs');

const INTENT_CONFIDENCE_THRESHOLD = process.env.INTENT_CONFIDENCE_THRESHOLD || 0.7;

module.exports = function() {

    var api = {}
    var scripts = [];
    var triggers = [];
    var PATH_TO_SCRIPTS;

    api.parseAdminUsers = function(string) {
        if (!string) {
            string = '';
        }

        var creds = string.split(/\s+/);

        var users = {};
        creds.forEach(function(u) {
            var bits = u.split(/\:/);
            users[bits[0]] = bits[1];
        });

        return users;

    }

    api.loadScriptsFromFile = function(src, alt_path) {
        return new Promise(function(resolve, reject) {

            if (fs.existsSync(src)) {
                try {
                    scripts = require(src);
                } catch(err) {
                    return reject('Cannot load scripts from file: ' + err.message);
                }
            } else {
                console.warn('Loading sample scripts...');
                try {
                    scripts = require(alt_path);
                } catch(err) {
                    return reject(err);
                }
            }

            PATH_TO_SCRIPTS = src;
            api.mapTriggers();
            resolve(scripts);
        });
    }

    api.writeScriptsToFile = function(new_scripts, alt_path) {

        return new Promise(function(resolve, reject) {
            try {
                require('fs').writeFileSync(alt_path || PATH_TO_SCRIPTS, JSON.stringify(new_scripts,null,2));
            } catch(err) {
                return reject('Cannot write scripts to file: ' + err.message);
            }

            scripts = new_scripts;
            api.mapTriggers();
            resolve(scripts);
        });

    }

    api.mapTriggers = function() {
        for (var s = 0; s < scripts.length; s++) {

            // TODO: remove this when ID is part of datafile
            if (!scripts[s].id) {
                scripts[s].id = s;
            }

            for (var t = 0; t < scripts[s].triggers.length; t++) {
                triggers.push({trigger: scripts[s].triggers[t], script: s});
            }
        }

        // sort in the order of _descending pattern length_
        triggers.sort(function(a,b) {

            return b.trigger.pattern.length - a.trigger.pattern.length;

        });
    }

    api.enrichMessage = function(message_text) {
        return new Promise(function(resolve, reject) {
            var query = {
                text: message_text
            };

            // endpoint in the form of
            // https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/<APPID>?subscription-key=<SUBID>&verbose=true&timezoneOffset=-360&q=
            if (process.env.LUIS_ENDPOINT) {

                var luis_uri = process.env.LUIS_ENDPOINT + query.text;
                request(luis_uri, function(error, response, body) {
                    if (error) {
                        console.error('Error communicating with LUIS', error);
                        resolve(query);
                    } else {
                        var luis_results = {};

                        try {
                            luis_results = JSON.parse(body);
                        } catch(err) {
                            console.error('Error parsing LUIS response', err);
                            return resolve(query);
                        }

                        if (!luis_results.intents) {
                            console.warn('No intents returned from LUIS.ai.  Key may be invalid');
                            resolve(query);
                        } else {
                            if (String(luis_results.Message) === 'The request is invalid.') {
                                console.warn('No intents returned from LUIS.ai.  Key may be invalid');
                                resolve(query);
                            } else {

                                query.luis = luis_results;

                                query.intents = [];
                                query.entities = [];

                                luis_results.intents.forEach(function(i) {
                                    query.intents.push(i);
                                });

                                luis_results.entities.forEach(function(e) {
                                    query.entities.push(e);
                                });

                                resolve(query);
                            }
                        }
                    }
                });
            } else {
                resolve(query);
            }
        })
    }

    api.evaluateTriggers = function(message_text) {

        return new Promise(function(resolve, reject) {
            var res = [];

            api.enrichMessage(message_text).then(function(query) {

                // if any intents were detected, check if they match a trigger...
                if (query.intents && query.intents.length) {
                    // check intents first
                    for (var t = 0; t < triggers.length; t++) {
                        var trigger = triggers[t].trigger;
                        if (trigger.type == 'intent') {
                            for (var i = 0; i < query.intents.length; i++) {
                                var intent = query.intents[i];
                                if (Number(intent.score) >= INTENT_CONFIDENCE_THRESHOLD) {
                                    if (intent.intent === trigger.pattern) {
                                        res.push(triggers[t].script);
                                    }
                                }
                            }
                        }
                    }
                }

                // check regular expressions
                for (var t = 0; t < triggers.length; t++) {
                    var trigger = triggers[t].trigger;
                    if (trigger.type == 'regexp') {

                        var found = false;
                        try {
                            var test = new RegExp(trigger.pattern,'i');
                            found = query.text.match(test);
                        } catch(err) {
                            console.error('ERROR IN TRIGGER REGEX', err);
                        }

                        if (found !== false && found !== null) {
                            res.push(triggers[t].script);
                        }
                    }
                }

                // check keywords
                for (var t = 0; t < triggers.length; t++) {
                    var trigger = triggers[t].trigger;

                    if (trigger.type == 'string') {

                        var found = false;
                        try {
                            var test = new RegExp('^' + trigger.pattern + '\\b','i');
                            found = query.text.match(test);
                        } catch(err) {
                            console.error('ERROR IN TRIGGER REGEX', err);
                        }

                        if (found !== false && found !== null) {
                            res.push(triggers[t].script);
                        }
                    }
                }

                // check for no results...
                if (!res.length) {
                    // find a script set with is_fallback true
                    for (var s = 0; s < scripts.length; s++) {
                        if (scripts[s].is_fallback === true) {
                            res.push(s);
                        }
                    }
                }

                if (res.length) {

                    // this is the script that will be triggered.
                    var triggered = scripts[res[0]];

                    // copy entities from LUIS into the conversation script
                    if (query.entities && query.entities.length) {
                        query.entities.forEach(function(e) {
                            var ne = {
                                name: e.type,
                                value: e.entity,
                                type: 'entity'
                            };
                            var cv = triggered.variables.filter(function(v) {
                                return v.name === ne.name && v.value === ne.value && v.type === ne.type;
                            });
                            if (cv.length === 0) {
                                triggered.variables.push(ne);
                            }
                        });
                    }

                    // if LUIS results exist, pass them down to the bot.
                    if (query.luis) {
                        triggered.luis = query.luis;
                    }

                    resolve(triggered);
                } else {
                    reject();
                }
            }).catch(reject);
        });

    }

    api.getScript = function(name) {

        return new Promise(function(resolve, reject) {
            for (var s = 0; s < scripts.length; s++) {
                if (name.toLowerCase() == scripts[s].command.toLowerCase()) {
                    return resolve(scripts[s]);
                }
            }
            reject();
        });
    }

    api.getScriptById = function(id) {

        return new Promise(function(resolve, reject) {
            for (var s = 0; s < scripts.length; s++) {
                if (id == scripts[s]._id || id == scripts[s].id) {
                    return resolve(scripts[s]);
                }
            }
            reject();
        });
    }

    api.getScripts = function(tag) {

        return new Promise(function(resolve, reject) {

            var response = scripts;
            if (tag) {
                response = scripts.filter(function(s) {
                    return s.tags ? (s.tags.indexOf(tag) >= 0) : false;
                });
            }

            // for backwards compatibility with Botkit Studio, map the command field to name
            response = response.map(function(s) {
                s.name = s.command;
                return s;
            });
            resolve(response);
        });

    }


    api.useLocalStudio = function(botkit) {

        var mutagen = require(__dirname + '/botkit_mutagen.js');
        return mutagen(api, botkit);
    }

    return api;

}
