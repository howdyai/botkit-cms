require('dotenv').config()

var api = require('studio-api-only')();


api.writeScriptsToFile = function(path, scripts) {

  return new Promise(function(resolve, reject) {
    try {
      require('fs').writeFileSync(path, JSON.stringify(scripts,null,2));
    } catch(err) {
      return reject(err);
    }
    resolve();
  });

}

// load scripts from file
api.loadScriptsFromFile(__dirname + '/data/scripts.json').catch(function(err) {
  console.log('Could not load scripts from file:', err);
  process.exit(1);
});

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver.js')();


webserver.get('/', function(req, res) {
  // show list of scripts.
  api.getScripts().then(function(scripts) {
    res.render('index',{
      layout: 'layouts/layout',
      scripts: scripts
    });
  });

});


webserver.get('/edit/:name', function(req, res) {

  res.render('edit',{
    layout: 'layouts/layout',
    command_id: req.params.name,
  });

});

webserver.post('/save', function(req, res) {

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
    res.json({success: 'ok', data: script});
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
      res.json({success: true, data: scripts});
    }).catch(function(err) {
      if (err) {
        console.error('Error in getScripts',err);
      }
      res.json({});
    })
  });
