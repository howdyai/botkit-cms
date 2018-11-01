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
        var update = req.body;
        // TODO: ensure modified is not in past
        // update.modified = new Date();

        api.getScripts().then(function(scripts) {
            var found = false;
            for (var s = 0; s < scripts.length; s++) {
                if (scripts[s].command == update.command) {
                    found = s;
                    console.log('found timestamp', scripts[s].modified, 'incoming timestamp:', update.modified);
                }
            }


            if (found === false) {

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
                res.json({
                    success: false,
                    message: 'Script was modified more recently, please refresh your browser to load the latest',
                });

            } else {

                scripts[found] = update;
                scripts[found].modified = new Date();
                console.log('Updating modified date to', scripts[found].modified);

                api.writeScriptsToFile(scripts).then(function() {
                    res.json({
                        success: true,
                        data: update,
                    });
                });
            }
        });

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



}
