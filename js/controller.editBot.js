
app.controller('editBot', ['$scope', '$cookies', 'sdk', '$rootScope', '$window', function($scope, $cookies, sdk, $rootScope, $window) {

    $scope.bot = {
        name: '',
        description: '',
        platform: null,
        loading: true,
        settings: {},
    };

    $scope.commands = [];
    $scope.manifest_download = null;

    // confirmation button for luis page
    var default_button_text = 'Update LUIS.ai Settings';

    $scope.ui.copy = 'Copy';
    $scope.ui.button_text = default_button_text;


    // manifest builder options
    $scope.ui.autoconfigure_website = true;
    $scope.ui.autoconfigure_tabs = true;
    $scope.ui.autoconfigure_base = null;

    $scope.filter_by_tag = function(tag, event) {
        $scope.ui.filter = tag;
        event.preventDefault();
    };

    $scope.clipped = function(e) {
        $scope.ui.copy = 'Copied';
        setTimeout(function() {
            $scope.ui.copy = 'Copy';
            $scope.$apply();
        }, 3000);
    };

    $scope.clipError = function(e) {
        $scope.handleAjaxError(e);
    };

    $scope.go = function(url) {
        window.open(url);
    };

    $scope.getCommands = function() {
        sdk.getCommandsByBot().then(function(commands) {
            $scope.commands = commands.sort(function(a, b) {
                // sort by modified date!!
                if (new Date(a.modified) < new Date(b.modified)) return 1;
                if (new Date(b.modified) > new Date(a.modified)) return -1;
                return 0;
            });
            $scope.$broadcast('commands_loaded');
            $scope.$apply();
        });
    };

    $scope.getCommands();
}]);


app.controller('botCommands', ['$scope',  'sdk', function($scope, sdk) {


    $scope.bot_id = 1;

    $scope.ui.external_url = '';

    $scope.parsed_commands = [];
    $scope.imported_commands = [];
    $scope.import_already_exists = [];

    $scope.ui = {
        filter: '',
        export_mode: false,
        copy: 'Copy',
        import_button_text: 'Import',
        sortField: '-modified',
    };

    $scope.command = {
        trigger: '',
        description: '',
    };

    $scope.toggleSort = function(sortby) {
        console.log('toggle sort',sortby);
        if ($scope.ui.sortField == sortby) {
            $scope.ui.sortField = '-' + sortby;
        } else if ($scope.ui.sortField == '-' + sortby) {
            $scope.ui.sortField = sortby;
        } else {
            $scope.ui.sortField = sortby;
        }
        console.log($scope.ui.sortField);
    }

    $scope.filter_by_tag = function(tag, event){
        // console.log('tag: ', tag);
        $scope.ui.filter = tag;
        event.preventDefault();
    };

    $scope.clipped = function(e) {
        $scope.ui.copy = 'Copied';
        setTimeout(function() {
            $scope.ui.copy = 'Copy';
            $scope.$apply();
        },3000);
    };

    $scope.clipError = function(e) {
        $scope.handleAjaxError(e);
    };

    $scope.filterRow = function(row) {
        var pattern = new RegExp($scope.ui.filter,'i');

        //search by tags
        if(row.tags){
            var in_tags = row.tags.filter(function(t){
                return t === $scope.ui.filter;
            });
            if(in_tags.length != 0){
                return true;
            }
        }

        // search name and description first
        if (row.command.match(pattern)) {
            return true;
        }
        if (row.description.match(pattern)) {
            return true;
        }

        if (!$scope.ui.searchScript) {
            return;
        }

        for (var t = 0; t < row.triggers.length; t++) {
            if (row.triggers[t].pattern.match(pattern)) {
                return true;
            }
        }
        for (var t = 0; t < row.script.length; t++) {
            if (row.script[t].topic.match(pattern)) {
                return true;
            }
            for (var m = 0; m < row.script[t].script.length; m++) {
                if (row.script[t].script[m].text) {
                    for (var v = 0; v < row.script[t].script[m].text.length; v++) {
                        if (row.script[t].script[m].text[v].match(pattern)) {
                            return true;
                        }
                    }
                }

                // FIX THIS
                // we should do some sort of recursive search of attachment values...

                if (row.script[t].script[m].action && row.script[t].script[m].action.match(pattern)) {
                    return true;
                }

            }

        }


        return false;
    };

    $scope.updateImportButton = function() {
        var import_count = 0;
        var update_count = 0;
        for (var x = 0; x < $scope.commands_for_import.length; x++) {
            if (!$scope.commands_for_import[x].exclude_from_import) {
                if ($scope.commands_for_import[x].already_exist) {
                    update_count++;
                } else {
                    import_count++;
                }
            }
        }

        var texts = [];
        if (import_count > 0) {
            texts.push('Import ' + import_count);
        }
        if (update_count > 0) {
            texts.push('Update ' + update_count);
        }

        if (texts.length) {
            $scope.ui.import_button_text =  texts.join(' and ');
        } else {
            $scope.ui.import_button_text = 'Import';
        }

    }

    $scope.getExternalUrl = function(){
        sdk.getExternalUrl(String($scope.ui.external_url)).then(function(response){
            var data = response.data;
            $scope.commands_for_import = [];
            try{
                // var parsed = JSON.parse(response.data);
                data.forEach(function(c){


                    if (!c.command || !c.script || !c.script.length) {
                        throw new Error('Invalid script discovered in imported JSON.');
                    }

                    var demuxed = c;
                    demuxed.botId = $scope.bot_id;
                    demuxed.deleted = false;
                    var existencia = $scope.commands.filter(function(c){
                        return c.command === demuxed.command;
                    });
                    if(existencia.length > 0){
                        demuxed.already_exist = true;
                    }else {
                        demuxed.already_exist = false;
                    }
                    $scope.commands_for_import.push(demuxed);
                    $scope.updateImportButton();
                });
            }
            catch(err){
                // we should do some sort of ajaxy error handling thing here maybe.
                return $scope.handleAjaxError('Data at URL does not appear to be valid scripts');

            }
        });
    };

    $scope.import_unparsed = function(){
        $scope.commands_for_import = [];

        try{
            var parsed = JSON.parse($scope.ui.un_parsed_commands);
            parsed.forEach(function(c){

                if (!c.command || !c.script || !c.script.length) {
                    throw new Error('Invalid script discovered in imported JSON.');
                }

                var demuxed = c;
                demuxed.botId = $scope.bot_id;
                demuxed.deleted = false;
                var existencia = $scope.commands.filter(function(c){
                    return c.command === demuxed.command;
                });
                if(existencia.length > 0){
                    demuxed.already_exist = true;
                }else {
                    demuxed.already_exist = false;
                }
                $scope.commands_for_import.push(demuxed);
                $scope.updateImportButton();
            });
        }
        catch(err){
        // we should do some sort of ajaxy error handling thing here maybe.
            console.log('err: ', err);
            $scope.handleAjaxError(err);
        }
    };

    $scope.makeImportApi = function(){

        $scope.parseImport();

        if ($scope.imported_commands.length) {
            if (!confirm('Import or update ' + $scope.imported_commands.length + ' scripts?')) {
                return false;
            }
        } else {
            $scope.ui.import_mode = false;
        }

        $scope.import_already_exists = [];

        async.each($scope.imported_commands, function(command, next) {

            var existencia = $scope.commands.filter(function(c){
                return c.command === command.command;
            });
            if(existencia.length > 0){
            // get the id and do an update instead
                var upd_cmd = command;
                var to_update = existencia.filter(function(e){
                    return e.command === upd_cmd.command;
                });
                upd_cmd._id = to_update[0]._id;
                upd_cmd.id = to_update[0].id;
                sdk.saveCommand(upd_cmd).then(function() {
                    next();
                }).catch(function(err) {
                    next(err);
                });
            }else {
                sdk.saveCommand(command).then(function(command) {
                    next();
                }).catch(function(err) {
                    next(err);
                });
            }

        }, function(err) {

            $scope.getCommands();
            if (err) {
                $scope.handleAjaxError(err);
            } else {
                $scope.ui.import_mode = false;
                $scope.confirmation('Import successful!');
            }
            $scope.imported_commands = [];
        });
    };

    $scope.add_to_import = function(command){
        command.exclude_from_import = !command.exclude_from_import;
        $scope.updateImportButton();
    };

    $scope.parseImport = function() {
        $scope.imported_commands = [];
        for (var x = 0; x < $scope.commands_for_import.length; x++) {
            if (!$scope.commands_for_import[x].exclude_from_import) {
                $scope.imported_commands.push($scope.commands_for_import[x]);
            }
        }
    };

    $scope.toggleExportMode = function() {
        $scope.ui.export_mode = !$scope.ui.export_mode;
        for (var x = 0; x < $scope.commands.length; x++) {
            $scope.commands[x].exclude_from_export = false;
        }
        $scope.ui.export_count = $scope.commands.length;
    }

    $scope.toggleImportMode = function() {
        $scope.ui.import_button_text = 'Import';
        $scope.ui.import_mode = !$scope.ui.import_mode;
        $scope.commands_for_import = [];
    }


    $scope.add_to_export = function(command){
        command.exclude_from_export = !command.exclude_from_export;
        var count = 0;
        for (var x = 0; x < $scope.commands.length; x++) {
            if (!$scope.commands[x].exclude_from_export) {
                count++;
            }
        }
        $scope.ui.export_count = count;
    };

    $scope.clearExport = function() {
        $scope.ui.export_display = false;
        $scope.ui.export_mode = false;
    }

    $scope.createExport = function() {
        $scope.parsed_commands = [];
        for (var x = 0; x < $scope.commands.length; x++) {
            if (!$scope.commands[x].exclude_from_export) {
                var muxed = {};
                muxed.command = $scope.commands[x].command;
                muxed.description = $scope.commands[x].description;
                muxed.script = $scope.commands[x].script;
                muxed.triggers = $scope.commands[x].triggers;
                muxed.variables = $scope.commands[x].variables;
                muxed.tags = $scope.commands[x].tags;
                $scope.parsed_commands.push(muxed);
            }
        }

        $scope.ui.exported_text = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify($scope.parsed_commands,0,4));

        $scope.ui.export_display = true;

    };


    $scope.deleteCommand = function(command) {

        // WAIT! Is this the fallback script?
        if (command.is_fallback) {
            if (!confirm('Deleting this script will disable your bot\'s fallback behavior. Are you sure you want to continue?')) {
                return false;
            }
        } else {
            if (!confirm('Delete this command?')) {
                return false;
            }
        }

        sdk.removeCommand($scope.bot_id, command).then(function() {
            $scope.getCommands();
        }).catch(function(err) {
            $scope.handleAjaxError(err);
        });

    };


    $scope.createScriptModal = function() {
        $scope.ui.modal_create = true;
    }

    $scope.setAsFallback = function(command) {
        command.is_fallback = true;
        sdk.saveCommand(command).then(function() {
            // update UI
            $scope.commands.forEach(function(c) {
                if (c.id !== command.id) {
                    c.is_fallback = false;
                }
            });
            $scope.$apply();
        }).catch(function(err) {
            $scope.handleAjaxError(err);
        });
    }

    $scope.addCommand = function() {

        // make sure this command name does not already exist
        for (var c = 0; c < $scope.commands.length; c++) {
            if ($scope.commands[c].command.toLowerCase() == $scope.command.trigger.toLowerCase()) {
                return $scope.handleAjaxError('A script with the name "' + $scope.command.trigger + '" already exists. Please choose another name.');
            }
        }

        var new_command = {
            command: $scope.command.trigger,
            botId: $scope.bot_id,
            description: $scope.command.description,
            triggers: [
                {
                    type:"string",
                    pattern: $scope.command.trigger,
                }
            ],
            variables: [
                {
                    "name":"question_1",
                    "type":"string"
                },
                {
                    "name":"question_2",
                    "type":"string"
                },
                {
                    "name":"question_3",
                    "type":"string"
                }
            ],
            script: [{
                "topic":"default",
                "script":[
                    {
                        "text": ["This is the " + $scope.command.trigger + " script. Customize me!"],
                    },
                    {
                        "action": "complete",
                    }
                ]
            },
            {
                "topic":"on_timeout",
                "script":[
                    {
                        "text": ["Looks like you got distracted. We can continue later."],
                    },
                    {
                        "action": "timeout",
                    }
                ]
            }
            ]
        };

        sdk.saveCommand(new_command).then(function(command) {

            // clear and reset the UI
            $scope.command.trigger = '';
            $scope.command.description = '';
            $scope.add_command.$setPristine();

            // it would be nice to refocus the trigger field here
            // FIX THIS if possible (not angular friendly)

            $scope.commands.unshift(command);
            $scope.ui.modal_create = false;

            $scope.$apply();

        }).catch(function(err) {
            $scope.handleAjaxError(err);
        });

    };

    $scope.getCommands();

}]);
