var request = require('request');
var fs = require('fs');

const INTENT_CONFIDENCE_THRESHOLD = process.env.INTENT_CONFIDENCE_THRESHOLD || 0.7;

module.exports = function(db) {

    var api = {}
    var scripts = [];
    var triggers = [];
    var db = db;
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
                    return reject(err);
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
            resolve(scripts);
        });
    }

    api.writeScriptsToFile = function(new_scripts, alt_path) {

        return new Promise(function(resolve, reject) {
            try {
                require('fs').writeFileSync(alt_path || PATH_TO_SCRIPTS, JSON.stringify(new_scripts,null,2));
            } catch(err) {
                return reject(err);
            }

            scripts = new_scripts;
            api.mapTriggers();
            resolve(scripts);
        });

    }

    api.writeScriptsToDb = function(new_scripts) {
        return new Promise(function(resolve, reject) {
            db.collection('scripts').insertMany(scripts, function(err, result) {
                console.log(err);

                resolve(result.toArray());
            });
        });
    }

    api.writeScripts = function(new_scripts, alt_path) {
        return new Promise(function(resolve, reject) {
            try {
                if (db === null) {
                    scripts = api.writeScriptsToFile(new_scripts, alt_path);
                    api.mapTriggers();
                } else {
                    scripts = api.writeScriptsToDb(new_scripts);
                }
            } catch(err) {
                return reject(err);
            }

            resolve(scripts);
        });
    }

    api.deleteScript = function(command) {
        return new Promise(function(resolve, reject) {
            if (db === null) {
                api.getScripts().then(function(scripts) {

                    // delete script out of list.
                    scripts = scripts.filter((script) => { return (script.id !== command) });
        
                    // write scripts back to file.
                    api.writeScriptsToFile(scripts).then(function() {
                        res.json({
                            success: true,
                            data: scripts,
                        });
                    });
        
                }).catch(function(err) {
                    if (err) {
                        console.error('Error in getScripts',err);
                    }
                    res.json({});
                })
            } else {
                db.collection('scripts').deleteOne({'command': command}, function(err, resp) {
                    api.getScripts().then(function(response) {
                        resolve(response);
                    })
                })
            }
        });
    }

    api.saveScripts = function(update) {
        return new Promise(function(resolve, reject) {
            if (db === null) {
                api.getScripts().then(function(scripts) {
                    var found = false;
                    for (var s = 0; s < scripts.length; s++) {
                        if (scripts[s].id === update.id) {
                            found = s;
                        }
                    }

                    if (update.is_fallback) {
                        scripts.forEach(function(script) {
                            script.is_fallback = false;
                        });
                    }
        
                    if (found === false) {
        
                        if (!update.id && update._id) {
                            update.id = update._id;
                        } else if (!update.id) {
                            update.id = uuidv4();
                        }
                        update.modified = new Date();
                        scripts.push(update);
                        api.writeScriptsToFile(scripts).then(function() {
                            res.json({
                                success: true,
                                data: update,
                            });
                        });
        
                    } else if (new Date(scripts[found].modified) > new Date(update.modified)) {
        
                        // if the version in the database was more recently modified, reject this update!
                        resolve({
                            success: false,
                            message: 'Script was modified more recently, please refresh your browser to load the latest',
                        });
        
                    } else {
        
                        var original_name = scripts[found].command;

                        scripts[found] = update;
                        scripts[found].modified = new Date();
        
                        if (update.command != original_name) {
                            handleRenamed(scripts, original_name, update.command).then(function() {
                                api.writeScriptsToFile(scripts).then(function() {
                                    res.json({
                                        success: true,
                                        data: update,
                                    });
                                });
                            });
                        } else {
                            api.writeScriptsToFile(scripts).then(function() {
                                res.json({
                                    success: true,
                                    data: update,
                                });
                            });
                        }
                    }
                });
            } else {
                update.modified = new Date();
                delete update._id;
                db.collection('scripts').updateOne({'command': update.command}, { $set: update }, {upsert: true}, function(err, res) {
                    resolve({
                        success: true,
                        data: update,
                    });
                });
            }
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
            if (db) {
                api.getScripts().then(function(results) {
                    scripts = results;
                    api.mapTriggers();
                });
            }
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
            if (db === null) {
                for (var s = 0; s < scripts.length; s++) {
                    if (name.toLowerCase() == scripts[s].command.toLowerCase()) {
                        return resolve(scripts[s]);
                    }
                }
            } else {
                db.collection('scripts').findOne({ 'command': name.toLowerCase() }, function(err, response) {
                    return resolve(response);
                })
            }
            
        });
    }

    api.getScriptById = function(id) {

        return new Promise(function(resolve, reject) {
            if (db === null) {
                for (var s = 0; s < scripts.length; s++) {
                    if (id == scripts[s]._id || id == scripts[s].id) {
                        return resolve(scripts[s]);
                    }
                }
            } else {
                db.collection('scripts').findOne({ 'command': id }, function(err, response) {
                    return resolve(response);
                })
            }
            reject();
        });
    }

    api.getScripts = function(tag) {

        return new Promise(function(resolve, reject) {
            
            if (db === null) {
                if (tag) {
                    resolve(scripts.filter(function(s) {
                        return s.tags ? (s.tags.indexOf(tag) >= 0) : false;
                    }))
                } else {
                    resolve(scripts);
                }
            } else {
                if (tag) {
                    query = {'tag': tag}
                } else {
                    query = {}
                }
                db.collection('scripts').find(query, function(err, result) {
                    resolve(result.toArray());
                });
            }
            
        });

    }


    api.useLocalStudio = function(botkit) {

        var mutagen = require(__dirname + '/botkit_mutagen.js');
        return mutagen(api, botkit);
    }

    function handleRenamed(scripts, original_name, new_name) {
        return new Promise(function(resolve, reject) {
            async.each(scripts, function(command, next) {
                updateExecScript(command, original_name, new_name, next);
            }, function() {
                resolve();
            })
        });
    }

    function updateExecScript(command, original_name, new_name, next) {
        // need to look at command.script[*].script[*].action
        // need to look at command.script[*].script[*].collect.options[*].action
        var dirty = false;
        for (var t = 0; t < command.script.length; t++) {
            for (var m = 0; m < command.script[t].script.length; m++) {
                if (command.script[t].script[m].action == 'execute_script' && command.script[t].script[m].execute && command.script[t].script[m].execute.script == original_name) {
                    command.script[t].script[m].execute.script = new_name;
                    dirty = true;
                }

                if (command.script[t].script[m].collect && command.script[t].script[m].collect.options) {
                    for (var o = 0; o < command.script[t].script[m].collect.options.length; o++) {
                        if (command.script[t].script[m].collect.options[o].action=='execute_script' && command.script[t].script[m].collect.options[o].execute && command.script[t].script[m].collect.options[o].execute.script == original_name) {
                            command.script[t].script[m].collect.options[o].execute.script = new_name;
                            dirty = true;
                        }
                    }
                }
            }
        }

        if (dirty) {
            command.modified = new Date();
            next();
        } else {
            next();
        }
    }

    return api;

}
