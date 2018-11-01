module.exports = function() {

    var api = {}
    var scripts = [];
    var triggers = [];
    var PATH_TO_SCRIPTS;

    api.parseAdminUsers = function(string) {

        var creds = string.split(/\s+/);

        var users = {};
        creds.forEach(function(u) {
            var bits = u.split(/\:/);
            users[bits[0]] = bits[1];
        });

        return users;

    }



    api.loadScriptsFromFile = function(src) {
        return new Promise(function(resolve, reject) {
            try {
                scripts = require(src);
            } catch(err) {
                return reject(err);
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
                return reject(err);
            }

            scripts = new_scripts;
            api.mapTriggers();
            resolve(scripts);
        });

    }



    api.mapTriggers = function() {
        for (var s = 0; s < scripts.length; s++) {

            // TODO: remove this when ID is part of datafile
            scripts[s].id = s;

            for (var t = 0; t < scripts[s].triggers.length; t++) {
                triggers.push({trigger: scripts[s].triggers[t], script: s});
            }
        }

        // sort in the order of _descending pattern length_
        triggers.sort(function(a,b) {

            return b.trigger.pattern.length - a.trigger.pattern.length;

        });
    }

    api.evaluateTriggers = function(query) {

        return new Promise(function(resolve, reject) {
            var res = [];

            // check regular expressions first
            for (var t = 0; t < triggers.length; t++) {
                var trigger = triggers[t].trigger;

                if (trigger.type == 'regexp') {

                    var found = false;
                    try {
                        var test = new RegExp(trigger.pattern,'i');
                        found = query.match(test);
                    } catch(err) {
                        console.log('ERROR IN REGEX', err);
                    }

                    if (found !== false && found !== null) {
                        res.push(triggers[t].script);
                    }
                }
            }

            for (var t = 0; t < triggers.length; t++) {
                var trigger = triggers[t].trigger;

                if (trigger.type == 'string') {

                    var found = false;
                    try {
                        var test = new RegExp('^' + trigger.pattern + '\\b','i');
                        found = query.match(test);
                    } catch(err) {
                        console.log('ERROR IN REGEX', err);
                    }

                    if (found !== false && found !== null) {
                        res.push(triggers[t].script);
                    }
                }
            }

            if (res.length) {
                resolve(scripts[res[0]]);
            } else {
                reject();
            }
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
                if (id == scripts[s]._id) { // TODO: why use mongo style id?
                    return resolve(scripts[s]);
                }
            }
            reject();
        });
    }

    api.getScripts = function(tag) {

        return new Promise(function(resolve, reject) {
            if (tag) {
                resolve(scripts.filter(function(s) {
                    return s.tags ? (s.tags.indexOf(tag) >= 0) : false;
                }))
            }
            resolve(scripts);
        });

    }


    api.useLocalStudio = function(botkit) {

        var mutagen = require(__dirname + '/botkit_mutagen.js');
        return mutagen(api, botkit);
    }

    return api;

}
