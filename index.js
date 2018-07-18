require('dotenv').config()
var api = require(__dirname + '/src/api.js')()

if (!process.env.USERS) {
  console.log('Please specify at least one username:password combo in the USERS environment variable')
}

var allowed_tokens = process.env.TOKENS ? process.env.TOKENS.split(/\s+/) : [];
var admin_creds = api.parseAdminUsers(process.env.USERS); // TODO: make this env based

// load scripts from file
api.loadScriptsFromFile(__dirname + '/data/scripts.json').catch(function(err) {
  console.log('Could not load scripts from file:', err);
  process.exit(1);
});

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')(admin_creds);

webserver.get('/', function(req, res) {
  res.render('instructions',{layout: null});
});

webserver.get('/admin', function(req, res) {
  // show list of scripts.
  api.getScripts().then(function(scripts) {
    res.render('index',{
      layout: 'layouts/layout',
      scripts: scripts
    });
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

  console.log('SAVE SCRIPT', req.body);
  var update = req.body;
  // TODO: ensure modified is not in past
  update.modified = new Date();

  api.getScripts().then(function(scripts) {
    var found = false;
    for (var s = 0; s < scripts.length; s++) {
      if (scripts[s].command == update.command) {
        scripts[s] = update;
        scripts[s].modified = new Date();
        found = true;
      }
    }

    if (!found) {
      scripts.push(update);
    }

    api.writeScriptsToFile(__dirname + '/data/scripts.json', scripts).then(function() {
      res.json({
        success: true,
        data: req.body,
      });
    });
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




  if (allowed_tokens && allowed_tokens.length) {
    // require an access token
    webserver.use(function(req, res, next) {

      if (req.url.match(/^\/api\//)) {
        if (!req.query.access_token) {
          res.status(403);
          res.send('Access denied');
        } else {

          // test access_token against allowed tokens
          if (allowed_tokens.indexOf(req.query.access_token) >= 0) {
            next();
          } else {
            res.status(403);
            res.send('Invalid access token');
          }
        }
      } else {
          next();
      }
    })
  }


  /* Recreate the bot-facing API */

  // receives: triggers, user
  webserver.post('/api/v1/commands/triggers', function(req, res) {
    // look for triggers
    api.evaluateTriggers(req.body.triggers).then(function(results) {
          results.id = results.command;
          res.json(results);
    }).catch(function() {
      res.json({});
    })

  });

  // receives: command, user
  webserver.post('/api/v1/commands/name', function(req, res) {
    api.getScript(req.body.command).then(function(script) {
      res.json(script);
    }).catch(function(err) {
      if (err) {
        console.error('Error in getScript',err);
      }
      res.json({});
    })
  });

    // receives: command, user
    webserver.post('/api/v1/commands/id', function(req, res) {
      api.getScriptById(req.body.id).then(function(script) {
        res.json(script);
      }).catch(function(err) {
        if (err) {
          console.error('Error in getScript',err);
        }
        res.json({});
      })
    });


    // receives: command, user
    webserver.get('/api/v1/commands/list', function(req, res) {
      api.getScripts(req.query.tag).then(function(scripts) {
        res.json(scripts);
      }).catch(function(err) {
        if (err) {
          console.error('Error in getScripts',err);
        }
        res.json({});
      })
    });

    // receives: command, user
    webserver.post('/api/v1/stats', function(req, res) {

      res.json({});

    });
