/* this is the main app.js file */

var app = angular.module('howdyPro', ['ngCookies','ngclipboard','dndLists','monospaced.elastic']);

app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('{%');
    $interpolateProvider.endSymbol('%}');
}).config( [
    '$compileProvider',
    function( $compileProvider )
    {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|data):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }
]);


app.directive('compile', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                return scope.$eval(attrs.compile);
            },
            function(value) {
                element.html(value);
                $compile(element.contents())(scope);
            }
        )};
}]);


function truncateString(value, max, wordwise, tail) {
    if (!value) return '';

    max = parseInt(max, 10);
    if (!max) return value;
    if (value.length <= max) return value;

    value = value.substr(0, max);
    if (wordwise) {
        var lastspace = value.lastIndexOf(' ');
        if (lastspace !== -1) {
            //Also remove . and , so its gives a cleaner result.
            if (value.charAt(lastspace-1) === '.' || value.charAt(lastspace-1) === ',') {
                lastspace = lastspace - 1;
            }
            value = value.substr(0, lastspace);
        }
    }

    return value + (tail || ' …');
}


app.filter('truncateString', function () {
    return function (value, max, wordwise, tail) {
        return truncateString(value, max, wordwise, tail);
    }
});

// copied from https://stackoverflow.com/questions/16630471/how-can-i-invoke-encodeuricomponent-from-angularjs-template
app.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

app.controller('app', ['$scope', '$http', '$sce', '$cookies','sdk', '$location', function($scope, $http, $sce, $cookies, sdk, $location) {



    $scope.ui = {
        modalVisible: false,
        modalText: '',
        saved: false,
        commandsExpanded: false,
        inspectorExpanded: true,
        confirmText: null,
        confirmShow: false,
    };

    $scope.goto = function(url) {

        window.location = url;

    }

    $scope.open = function(url) {

        window.open(url);

    }



    $scope.saved = function() {
        $scope.ui.saved = true;
        setTimeout(function() {
            $scope.ui.saved = false;
        },1000);
    }

    $scope.confirmation = function(message, do_not_clear) {
        $scope.ui.confirmText =  $sce.trustAsHtml(message);
        $scope.ui.confirmShow = true;
        $scope.$apply();
        if (!do_not_clear) {
            setTimeout(function() {
                $scope.ui.confirmShow = false;
                $scope.$apply();
            }, 3000);
        }
    }

    $scope.getCookie = function(key) {
        return $cookies.get(key);
    }

    $scope.setCookie = function(key,val) {
        var now = new Date();
        now.setDate(now.getDate() + 365);

        var cookie_domain = '.botkit.ai';
        if (!$location.host().match(/botkit\.ai/)) {
            cookie_domain = $location.host();
        }

        $cookies.put(key,val,{
            expires: now,
            path: '/',
            domain: cookie_domain,
        });
    }

    $scope.showModal = function(text) {
        $scope.ui.modalText = $sce.trustAsHtml(text);
        $scope.ui.modalVisible = true;
        $scope.$apply();
    };

    $scope.hideModal = function() {
        $scope.ui.modalVisible = false;
    };

    $scope.showUpgrade = function(reason) {

        $scope.ui.showUpgrade = true;
        $scope.$apply();

    }

    $scope.dismissUpgrade = function() {
        $scope.ui.showUpgrade = false;
    }

    $scope.handleAjaxError = function(error) {
        var error_text = '';
        console.log('HANDLE AJAX',error);
        if (error.message) {
            error_text = error.message;
        } else if (error.error) {
            error_text = error.error;
        } else if (error.data && error.data.error && error.data.error) {
            // details, name, message, stack, status, statusCode
            // details contains a bunch of info, down to the field
            error_text = error.data.error;
        } else if (error.statusText) {
            error_text = error.statusText;
        } else {
            if (typeof(error) == 'string') {
                error_text = error;
            } else {
                error_text = JSON.stringify(error);
            }
        }

        $scope.showModal('ERROR: ' + error_text);

    };



    $scope.toggle = function(obj,field) {
        if (obj[field] === true || obj[field]=='true') {
            delete(obj[field]);
        } else {
            obj[field] = true;
        }
    };

    $scope.truncateString = truncateString;

    if ($cookies.get('customer')) {
        $scope.customer = $cookies.get('customer');
    }



}]);

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}


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

app.directive('keypressEvents', ['$rootScope', '$document', function($rootScope, $document) {
    return {
        restrict: 'A',
        link: function() {
            $document.bind('keydown', function(e) {
                if (e.keyCode == 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
                    e.preventDefault();
                    $rootScope.$broadcast('should.save');
                    $
                }
            });
        }
    }
}]);

app.controller('carousel', ['$scope', function($scope) {

}]);

app.controller('teamsMode', ['$scope', function($scope) {

    $scope.toggleTap = function(attachment) {
        if (attachment.tap) {
            delete(attachment.tap);
        } else {
            attachment.tap = {
                type: 'imBack',
                title: 'My card',
                value: 'I tapped this card',
            };
        }
    }

    $scope.addAction = function(attachment) {

        if (!attachment.buttons) {
            attachment.buttons = [];
        }

        attachment.buttons.push({
            type: 'imBack'
        });
    }

    $scope.deleteButton = function(attachment, idx) {
        attachment.buttons.splice(idx, 1);
    }


    $scope.deleteTeamsAttachment = function(message, idx) {
        message.platforms.teams.attachments.splice(idx, 1);

    }

    $scope.addTeamsAttachment = function(message, type) {
        if (!message.platforms) {
            message.platforms = {};
        }

        if (!message.platforms.teams) {
            message.platforms.teams = {
                attachments: [],
            };
        }

        delete(message.placeholder);

        message.platforms.teams.attachments.push({
            type: type,
            title: 'New attachment',
            name: 'New attachment',
            buttons: [],
            images: [],
        });

        $scope.makeDirty();
        $scope.focus(message);

    }

}]);

app.controller('ciscosparkMode', ['$scope', function($scope) {

    $scope.deleteCiscoFile = function(idx) {

        $scope.ui.outgoing_message.platforms.ciscospark.files.splice(idx, 1);

    }

    $scope.addCiscoFile = function(idx) {
        if (!$scope.ui.outgoing_message.platforms) {
            $scope.ui.outgoing_message.platforms = {};
        }
        if (!$scope.ui.outgoing_message.platforms.ciscospark) {
            $scope.ui.outgoing_message.platforms.ciscospark = {};
        }
        if (!$scope.ui.outgoing_message.platforms.ciscospark.files) {
            $scope.ui.outgoing_message.platforms.ciscospark.files = [];
        }

        $scope.ui.outgoing_message.platforms.ciscospark.files.push({
            url: ''
        });


    }

}]);



app.controller('webMode', ['$scope', function($scope) {

    $scope.deleteWebFile = function(idx) {

        $scope.ui.outgoing_message.platforms.web.files.splice(idx, 1);

    }

    $scope.addWebFile = function(idx) {
        if (!$scope.ui.outgoing_message.platforms) {
            $scope.ui.outgoing_message.platforms = {};
        }
        if (!$scope.ui.outgoing_message.platforms.web) {
            $scope.ui.outgoing_message.platforms.web = {};
        }
        if (!$scope.ui.outgoing_message.platforms.web.files) {
            $scope.ui.outgoing_message.platforms.web.files = [];
        }

        $scope.ui.outgoing_message.platforms.web.files.push({
            url: ''
        });


    }

}]);


app.controller('scriptEditor', ['$scope', '$cookies', '$sce', 'sdk', '$location', '$anchorScroll', '$http', function($scope, $cookies, $sce, sdk, $location, $anchorScroll, $http) {


    $scope.addMetaVar = function() {
        if (!$scope.ui.outgoing_message.meta) {
            $scope.ui.outgoing_message.meta = [];
        }
        $scope.ui.outgoing_message.meta.push({
            key: 'key',
            value: 'value'
        });
    }

    $scope.deleteMeta = function(meta, idx) {
        $scope.ui.outgoing_message.meta.splice(idx, 1);
        $scope.makeDirty();
    }

    /// allow forms in includes to be referenced here.
    $scope.formHolder = {};

    $scope.ui.scripts = false;

    $scope.features = {

        branches: true, // is it possible to create/switch branches
        tokens: true, // are tokens visible
        questions: true, // is it possible to make a question
        conditionals: true, // is it possible to add conditions to a question
        custom_variables: true, // is it possible to specify the name of a response
        final_action: true, // able to change final action of branch
        allow_quit: true
    };

    var opts = {
        new_line: '',
        newBranch: '',
        saving: false,
        help: true,
        triggers: false,
        variables: true,
        inspector: true,
        properties: true,
        carousel_position: 0,
        editor_mode: 'multiuser',
        confirmShow: false,
        confirmText: '',
        dirty: false,
        lastSaved: false,
    };

    // do not redefine $scope.ui
    for (var k in opts) {
        $scope.ui[k] = opts[k];
    }

    $scope.$on('should.save', function() {
        $scope.save();
    });

    window.onbeforeunload = function() {
        if ($scope.ui.dirty) {
            return 'dirty';
        }
    }

    $scope.displayFilenameFromURL = function(url) {
        var file = url.substring(url.lastIndexOf('/') + 1);
        if (file == '') {
            // if no clear filename is found, return the whole url
            file = url;
        }
        return file;
    }

    $scope.decideMode = function(platform) {

        var mode = 'oneonone';
        switch (platform) {
            case 'slack':
                mode = 'multiuser';
                break;
            case 'ciscospark':
                mode = 'multiuser';
                break;
            case 'teams':
                mode = 'multiuser';
                break;
            case 'facebook':
                mode = 'oneonone';
                break;
            case 'web':
                mode = 'oneonone';
                break;
            default:
                mode = 'oneonone';
                break;
        }

        return mode;

    }


    $scope.makeDirty = function() {
        $scope.ui.dirty = true;
        $scope.ui.invalid = false;
    }



    $scope.updateConditionlessOption = function(opt){
        $scope.makeDirty()
    }


    $scope.updateConditionalText = function(opt){
        // this needs a bunch of work
        $scope.ui.conditional_needRight = false;

        if(opt.conditional.test){
            if(opt.conditional.test == 'equals' || opt.conditional.test == '!equals'){
                $scope.ui.conditional_needRight = true;
            }
        }

        if(opt.conditional.execute && opt.conditional.execute.script){
            var selected_command = $scope.bot.commands.filter(function(c){
                return c.command === opt.conditional.execute.script;
            })
            opt.conditional.selected_scripts_threads = selected_command[0].script;
        // pick the first one in the list
        // opt.conditional.execute.thread = opt.conditional.selected_scripts_threads[0].topic;
        }
    }



    $scope.condition_action_then_select = function(opt){
        $scope.makeDirty();
        if(opt.conditional.action !== "execute_script"){
        //  cleaning off these options because the user is NOT executing a script at this point.
            delete opt.conditional['execute'];
        }else {
            if (!opt.conditional.execute) {
                opt.conditional.execute = {
                    script: null,
                    thread: null,
                }
                // we want this to default to the first script in the list
                // set the dropdown value to the name of the command
                opt.conditional.execute.script = $scope.bot.commands[0].command;

                // now we need a reference to the list of threads for this command
                opt.conditional.selected_scripts_threads = $scope.bot.commands[0].script;

                // and we need to select the first one
                opt.conditional.execute.thread = opt.conditional.selected_scripts_threads[0].topic;
                $scope.updateConditionalText(opt);
            }
        }
    }


    $scope.action_then_select = function(opt){
        $scope.makeDirty();
        if(opt.action !== "execute_script"){
        //  cleaning off these options because the user is NOT executing a script at this point.
            delete opt['execute'];
        } else {
            if (!opt.execute) {
                opt.execute = {
                    script: null,
                    thread: null,
                }
                // we want this to default to the first script in the list
                // set the dropdown value to the name of the command
                opt.execute.script = $scope.bot.commands[0].command;

                // now we need a reference to the list of threads for this command
                opt.selected_scripts_threads = $scope.bot.commands[0].script;

                // and we need to select the first one
                opt.execute.thread = opt.selected_scripts_threads[0].topic;
            }
        }
    }

    $scope.ui.copy = 'Copy';

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

    $scope.command = {
        script: {
            script: [{
                topic: 'default',
                script: []
            }]
        }
    };

    $scope.thread = null;

    $scope.trigger = {
        pattern: '',
        type: 'string'
    };

    $scope.variable = {
        name: '',
        type: 'string'
    };


    $scope.confirmation = function(message, do_not_clear) {
        $scope.ui.confirmText = $sce.trustAsHtml(message);
        $scope.ui.confirmShow = true;
        if (!do_not_clear) {
            setTimeout(function() {
                $scope.ui.confirmShow = false;
                $scope.$apply();
            }, 3000);
        }
    }

    $scope.next = function(msg) {
        var max = msg.text.length;
        if ($scope.ui.carousel_position < (max - 1)) {
            $scope.ui.carousel_position++;
        } else if ($scope.ui.carousel_position >= (max - 1)) {
            if (msg.text[max - 1]) {
                $scope.addAlternate(msg);
            }
            $scope.ui.carousel_position = msg.text.length - 1;
        }
    }

    $scope.prev = function(msg) {
        $scope.ui.carousel_position--;
        if ($scope.ui.carousel_position < 0) {
            $scope.ui.carousel_position = 0;
        }
    }


    $scope.saveName = function() {
        $scope.save();
        $scope.ui.editName = false;
    }

    $scope.editThread = function(thread, $event) {

        $event.stopPropagation();
        if (thread.topic == 'default') {
            return false;
        }

        $scope.ui.rename_thread = thread.topic;
        $scope.ui.editbranch = true;
    }

    $scope.duplicateThreadModal = function(thread, $event) {

        $event.stopPropagation();
        delete($scope.ui.dupe_thread_name);
        $scope.ui.thread_to_duplicate = thread;
        $scope.ui.dupethread = true;
    }

    $scope.duplicateThread = function(new_name) {
        if (!$scope.isUniqueThread(new_name)) {
            alert('That thread name is already in use');
            return;
        }

        // copy thread
        var new_thread = angular.copy($scope.ui.thread_to_duplicate);
        new_thread.topic = new_name;

        // insert it
        $scope.command.script.script.push(new_thread);

        // make it active
        $scope.setThread(new_name);


        // close modal
        delete($scope.ui.thread_to_duplicate);
        delete($scope.ui.dupethread);
    }



    $scope.redirectToThread = function(thread, message) {

        $scope.setThread(thread);
        alert(message);

        return false;
    };

    $scope.removeThread = function(thread, $event) {
        $event.stopPropagation();

        if (thread.topic == 'default') {
            return false;
        }

        // if this thread is referenced _anywhere_ this should fail
        for (var t = 0; t < $scope.command.script.script.length; t++) {
            // messages in this thread are in the .script field, WEIRD
            for (var m = 0; m < $scope.command.script.script[t].script.length; m++) {
                if ($scope.command.script.script[t].script[m].collect) {
                    for (var o = 0; o < $scope.command.script.script[t].script[m].collect.options.length; o++) {
                        if ($scope.command.script.script[t].script[m].collect.options[o].action == thread.topic) {
                            return $scope.redirectToThread($scope.command.script.script[t].topic, 'This thread is currently in use! Before you delete it, please update the conversation to point to another action.');
                            // change topic to this
                        }
                    }
                }
                if ($scope.command.script.script[t].script[m].action == thread.topic) {
                    return $scope.redirectToThread($scope.command.script.script[t].topic, 'This thread is currently in use! Before you delete it, please update the conversation to point to another action.');
                }
            }
        }

        if (confirm('Permanently delete the thread called "' + thread.topic + '"?')) {
            for (var t = 0; t < $scope.command.script.script.length; t++) {
                if ($scope.command.script.script[t].topic == thread.topic) {
                    $scope.command.script.script.splice(t, 1);
                    // $scope.save();
                    $scope.makeDirty();
                    $scope.setThread('default');
                    return;
                }
            }
        }

        return false;
    }

    $scope.renameThread = function(thread, new_name) {
        // make sure it changed
        if (!$scope.ui.newbranch && thread.topic == new_name) {
            $scope.ui.editbranch = false;
            return;
        }

        // need to make sure this thread name isn't duplicating an existing one

        if (!$scope.isUniqueThread(new_name)) {
            alert('That thread name is already in use');
            return;
        }


        if ($scope.ui.newbranch) {
            $scope.makeDirty();
            $scope.command.script.script.push({
                topic: new_name,
                script: [{
                    text: ['This is ' + new_name],
                },
                {
                    action: 'complete',
                }
                ]
            });
        } else {


            // find places in the conversation where we the action points at this thread
            // in addition to thread.topic field, the value would also appear as:
            // * a possible condition in any of the questions
            // * the value of an action on any message
            // need to iterate over each thread, each message and check these conditions and replace with new value.
            // this stuff all lives in, weirdly, $scope.command.script.script

            for (var t = 0; t < $scope.command.script.script.length; t++) {
                // messages in this thread are in the .script field, WEIRD
                for (var m = 0; m < $scope.command.script.script[t].script.length; m++) {
                    if ($scope.command.script.script[t].script[m].collect) {
                        for (var o = 0; o < $scope.command.script.script[t].script[m].collect.options.length; o++) {
                            if ($scope.command.script.script[t].script[m].collect.options[o].action == thread.topic) {
                                $scope.command.script.script[t].script[m].collect.options[o].action = new_name;
                            }
                        }
                    }
                    if ($scope.command.script.script[t].script[m].action == thread.topic) {
                        $scope.command.script.script[t].script[m].action = new_name;
                    }
                }
            }

            thread.topic = new_name;
        }
        $scope.ui.editbranch = false;
        $scope.ui.newbranch = false;
        $scope.makeDirty();

    }

    $scope.removeTrigger = function(idx) {
        $scope.command.triggers.splice(idx, 1);
        $scope.makeDirty();
        return;

    };

    $scope.closeTriggers = function() {

        if ($scope.trigger.pattern != '') {
            if (!confirm('Do you want to discard these unsaved changes?')) {
                return false;
            }
        }

        $scope.ui.triggers = false;
        $scope.trigger = {
            pattern: '',
            type: 'string'
        };


    }

    $scope.addTrigger = function() {
        var new_trigger = {
            pattern: $scope.trigger.pattern,
            type: $scope.trigger.type,
            id: Math.floor(Math.random() * 500),
        };

        for (var x = 0; x < $scope.command.triggers.length; x++) {
            if ($scope.command.triggers[x].pattern == new_trigger.pattern) {
                return $scope.handleAjaxError('The pattern "' + new_trigger.pattern + '" already exists!');
            }
        }

        $scope.command.triggers.unshift(new_trigger);

        $scope.trigger.pattern = '';
        $scope.formHolder.add_trigger.$setPristine();
        $scope.makeDirty();

    };


    $scope.words_only = '\\w+';
    $scope.tag_input_invalid = false;
    $scope.addTag = function(event){
        event.preventDefault();

        if(!$scope.command.tags){
            $scope.command.tags = [];
        }

        if($scope.ui.tag){
            $scope.tag_input_invalid = false;
            var tag_exist = $scope.command.tags.filter(function(t){
                return t === $scope.ui.tag;
            });

            if(tag_exist.length === 0){
                $scope.command.tags.push($scope.ui.tag);
            }
            $scope.ui.tag = '';
            $scope.makeDirty();
        }else {
            $scope.tag_input_invalid = true;
        }


    };


    $scope.removeTag = function(idx) {
        var tag = $scope.command.tags[idx];
        if (confirm('Remove the tag "' + tag + '"?')) {
            $scope.command.tags.splice(idx, 1);
            $scope.makeDirty();
        }
        return;

    };

    $scope.removeVariable = function(variable, idx) {

        // if this variable is referenced _anywhere_ this should fail
        for (var t = 0; t < $scope.command.script.script.length; t++) {
            // messages in this thread are in the .script field, WEIRD
            for (var m = 0; m < $scope.command.script.script[t].script.length; m++) {
                if ($scope.command.script.script[t].script[m].collect && $scope.command.script.script[t].script[m].collect.key == variable.name) {
                    return $scope.redirectToThread($scope.command.script.script[t].topic, 'This variable is currently in use! Before you delete it, please update the conversation to point to another variable.');
                }
            }
        }

        $scope.command.variables.splice(idx, 1);

        $scope.command.script.variables = $scope.command.variables.map(function(i) {
            return i.name;
        });
        $scope.makeDirty();

    };

    $scope.addVariable = function(variable) {

        var new_variable = {
            name: variable.name,
            type: variable.type,
            id: Math.floor(Math.random() * 500),
        };

        if (!$scope.command.variables) {
            $scope.command.variables = [];
        };

        for (var x = 0; x < $scope.command.variables.length; x++) {
            if ($scope.command.variables[x].name == new_variable.name) {
                return $scope.handleAjaxError('The variable "' + new_variable.name + '" already exists!');
            }
        }

        $scope.command.variables.unshift(new_variable);


        $scope.variable.name = '';
        if ($scope.formHolder.add_variable) {
            $scope.formHolder.add_variable.$setPristine();
        }
        $scope.command.script.variables = $scope.command.variables.map(function(i) {
            return i.name;
        });
        $scope.makeDirty();

    };

    $scope.addVariableAndSet = function(variable, message) {
        message.key = variable.name;
        $scope.addVariable(variable);
    };

    $scope.addMetaVar = function() {
        if (!$scope.ui.outgoing_message.meta) {
            $scope.ui.outgoing_message.meta = [];
        }
        $scope.ui.outgoing_message.meta.push({
            key: 'key',
            value: 'value'
        });
    }
    //
    $scope.deleteMeta = function(meta, idx) {
        $scope.ui.outgoing_message.meta.splice(idx, 1);
    }

    $scope.getBotCommands = function(bot_id){
        return new Promise(function(resolve, reject){
            sdk.getCommandsByBot(bot_id).then(function(bot_commands){
                resolve(bot_commands);
            }).catch(function(err){
                reject(err);
            });
        });
    }


    $scope.execute_script_selected = function(opt){
        $scope.makeDirty();
        // we need to update the list of threads here.
        // find the selected script
        var selected_command = $scope.bot.commands.filter(function(c){
            return c.command === opt.execute.script;
        })
        opt.selected_scripts_threads = selected_command[0].script;
        // pick the first one in the list
        opt.execute.thread = opt.selected_scripts_threads[0].topic;
    }

    $scope.conditional_execute_script_selected = function(opt){
        $scope.makeDirty();
        // we need to update the list of threads here.
        // find the selected script
        var selected_command = $scope.bot.commands.filter(function(c){
            return c.command === opt.conditional.execute.script;
        })
        opt.conditional.selected_scripts_threads = selected_command[0].script;
        // pick the first one in the list
        opt.conditional.execute.thread = opt.conditional.selected_scripts_threads[0].topic;
        $scope.updateConditionalText(opt);
    }

    $scope.conditional_tread_select = function(opt){
        $scope.makeDirty();
        $scope.updateConditionalText(opt);
    }


    $scope.getCommandById = function(id) {
        return new Promise(function(resolve, reject) {
            sdk.getCommandById($scope.bot._id, id).then(function(command) {
                resolve(command);
            }).catch(function(err) {
                reject(err);
            });
        });
    };

    $scope.entryKeypress = function(e) {
        if (e.keyCode == 13) {
            $scope.addLine();
            //$scope.toText();
            e.preventDefault();
            return false;
        }
    };

    $scope.isUniqueThread = function(name) {

        for (var t = 0; t < $scope.command.script.script.length; t++) {
            if ($scope.command.script.script[t].topic == name) {
                return false;
            }
        }

        return true;
    };

    $scope.createThread = function() {

        $scope.ui.rename_thread = "";
        $scope.ui.editbranch = true;
        $scope.ui.newbranch = true;
    }

    $scope.validate = function() {

        var found_invalid = false;
        for (var t = 0; t < $scope.command.script.script.length; t++) {
            // any validation to do at the script level?

            // NOTE:
            // we do not want to validate the LAST element in the same way we validate all the others
            // because it is the "last action", not a normal message.
            for (var m = 0; m < $scope.command.script.script[t].script.length - 1; m++) {

                // stuff for validating conditionals
                if($scope.command.script.script[t].script[m].conditional){
                    $scope.command.script.script[t].script[m].conditional.validators = {};
                    // remove this when you are done:

                    var x = $scope.command.script.script[t].script[m].conditional;
                    var condition_invalid = false;
                    if($scope.command.script.script[t].script[m].conditional.left === '_new' && !$scope.command.script.script[t].script[m].conditional.left_val){
                        $scope.command.script.script[t].script[m].conditional.validators.left_val_invalid = true;
                        condition_invalid = true;
                    }
                    if($scope.command.script.script[t].script[m].conditional.test === 'equals' || $scope.command.script.script[t].script[m].conditional.test === '!equals'){
                        if($scope.command.script.script[t].script[m].conditional.right === '_new' && !$scope.command.script.script[t].script[m].conditional.right_val){
                            $scope.command.script.script[t].script[m].conditional.validators.right_val_invalid = true;
                            condition_invalid = true;
                        }
                    }
                    if($scope.command.script.script[t].script[m].conditional.action === '_new' && !$scope.newbranch){
                        $scope.command.script.script[t].script[m].conditional.validators.action_new_invalid = true;
                        condition_invalid = true;
                    }

                    if(condition_invalid){
                        // $scope.validationError('Invalid condition input!');
                        return false;
                    }


                }

                // new stuff for meta data
                if ($scope.command.script.script[t].script[m].meta) {
                    for (var r = 0; r < $scope.command.script.script[t].script[m].meta.length; r++) {
                        if ($scope.command.script.script[t].script[m].meta[r].key == '') {
                            $scope.command.script.script[t].script[m].meta[r].invalid = true;
                            $scope.validationError('Meta data must have a key name');
                            return false;
                        } else {
                            delete($scope.command.script.script[t].script[m].meta[r].invalid);
                        }
                    }
                }


                // validate required text, if required!
                // different platforms have different behaviors
                if ($scope.bot.platform == 'facebook') {

                    // validate that message has text if required
                    if ((!$scope.command.script.script[t].script[m].fb_attachment &&
                            $scope.command.script.script[t].script[m].text &&
                            !$scope.command.script.script[t].script[m].text[0]) ||
                        ($scope.command.script.script[t].script[m].fb_attachment &&
                            $scope.command.script.script[t].script[m].fb_attachment.template_type == 'button' &&
                            $scope.command.script.script[t].script[m].text &&
                            !$scope.command.script.script[t].script[m].text[0])
                    ) {

                        // mark as invalid and focus!
                        $scope.command.script.script[t].script[m].invalid = true;
                        $scope.command.script.script[t].script[m].focused = true;
                        found_invalid = true;

                        console.log('Validation error: message has no text');
                        $scope.focus($scope.command.script.script[t].script[m]);
                        $scope.validationError('Message has no text');
                        return false;

                    } else {
                        delete($scope.command.script.script[t].script[m].invalid)
                    }

                } else if ($scope.bot.platform == 'slack') {

                    // blank text is ok if there is at least one attachment
                    if (
                        (!$scope.command.script.script[t].script[m].attachments ||
                            !$scope.command.script.script[t].script[m].attachments.length) &&
                        (!$scope.command.script.script[t].script[m].text ||
                            !$scope.command.script.script[t].script[m].text[0])
                    ) {
                        // mark as invalid and focus!
                        $scope.command.script.script[t].script[m].invalid = true;
                        $scope.command.script.script[t].script[m].focused = true;
                        found_invalid = true;

                        console.log('Validation error: message has no text');
                        $scope.focus($scope.command.script.script[t].script[m]);
                        $scope.validationError('Message has no text');
                        return false;

                    } else {
                        delete($scope.command.script.script[t].script[m].invalid)
                    }

                } else if ($scope.bot.platform == 'ciscospark') {

                    if ($scope.command.script.script[t].script[m].platforms &&
                    $scope.command.script.script[t].script[m].platforms.ciscospark &&
                    $scope.command.script.script[t].script[m].platforms.ciscospark.files &&
                    $scope.command.script.script[t].script[m].platforms.ciscospark.files.length
                    ) {
                        for (var f = 0; f < $scope.command.script.script[t].script[m].platforms.ciscospark.files.length; f++) {
                            if (!$scope.command.script.script[t].script[m].platforms.ciscospark.files[f].url) {
                                $scope.command.script.script[t].script[m].platforms.ciscospark.files[f].invalid =true;
                                $scope.validationError('File URL cannot be blank');
                                return false;
                            } else {
                                delete($scope.command.script.script[t].script[m].platforms.ciscospark.files.invalid);
                            }
                        }
                    }

                } else if ($scope.bot.platform == 'web') {

                    // TODO: add validation for files!!
                    if ($scope.command.script.script[t].script[m].platforms &&
                    $scope.command.script.script[t].script[m].platforms.web &&
                    $scope.command.script.script[t].script[m].platforms.web.files &&
                    $scope.command.script.script[t].script[m].platforms.web.files.length
                    ) {
                        for (var f = 0; f < $scope.command.script.script[t].script[m].platforms.web.files.length; f++) {
                            if (!$scope.command.script.script[t].script[m].platforms.web.files[f].url) {
                                $scope.command.script.script[t].script[m].platforms.web.files[f].invalid =true;
                                $scope.validationError('File URL cannot be blank');
                                return false;
                            } else {
                                delete($scope.command.script.script[t].script[m].platforms.web.files.invalid);
                            }
                        }
                    }
                } else if ($scope.bot.platform == 'teams') {

                    // blank text is ok if there is at least one attachment
                    if (
                        (!$scope.command.script.script[t].script[m].platforms ||
                            !$scope.command.script.script[t].script[m].platforms.teams ||
                            !$scope.command.script.script[t].script[m].platforms.teams.attachments ||
                            !$scope.command.script.script[t].script[m].platforms.teams.attachments.length) &&
                        (!$scope.command.script.script[t].script[m].text ||
                            !$scope.command.script.script[t].script[m].text[0])
                    ) {
                        // mark as invalid and focus!
                        $scope.command.script.script[t].script[m].invalid = true;
                        $scope.command.script.script[t].script[m].focused = true;
                        found_invalid = true;

                        console.log('Validation error: message has no text');
                        $scope.focus($scope.command.script.script[t].script[m]);
                        $scope.validationError('Message has no text');
                        return false;

                    } else {
                        delete($scope.command.script.script[t].script[m].invalid)
                    }


                }


                // validate that the question/answer values are all set
                if ($scope.command.script.script[t].script[m].collect) {
                    if (!$scope.command.script.script[t].script[m].collect.key) {
                        // mark as invalid and focus!
                        $scope.command.script.script[t].script[m].invalid_key = true;
                        $scope.command.script.script[t].script[m].focused_user = true;
                        found_invalid = true;
                        console.log('Validation error: question is missing variable');
                        $scope.focusUser($scope.command.script.script[t].script[m]);
                        $scope.validationError('Select a variable to store user response');

                        return false;
                    } else {
                        $scope.command.script.script[t].script[m].invalid_key = false;
                    }

                    if ($scope.command.script.script[t].script[m].collect.options && $scope.command.script.script[t].script[m].collect.options.length) {
                        var options_valid = true;
                        for (var o = 0; o < $scope.command.script.script[t].script[m].collect.options.length; o++) {
                            if (!$scope.command.script.script[t].script[m].collect.options[o].default &&
                                (!$scope.command.script.script[t].script[m].collect.options[o].pattern || !$scope.command.script.script[t].script[m].collect.options[o].action)
                            ) {
                                $scope.command.script.script[t].script[m].collect.options[o].invalid = true;
                                $scope.command.script.script[t].script[m].focused_user = true;
                                options_valid = false;
                            } else {
                                delete($scope.command.script.script[t].script[m].collect.options[o].invalid);
                            }
                        }

                        if (!options_valid) {
                            $scope.validationError('Invalid conditional');
                            found_invalid = true;
                        }
                    }
                }

                // validate that any facebook quick replies have the proper fields
                if ($scope.command.script.script[t].script[m].quick_replies) {
                    for (var r = 0; r < $scope.command.script.script[t].script[m].quick_replies.length; r++) {
                        if ($scope.command.script.script[t].script[m].quick_replies[r].content_type == 'text') {
                            if (!$scope.command.script.script[t].script[m].quick_replies[r].title ||
                                !$scope.command.script.script[t].script[m].quick_replies[r].payload) {
                                console.log('Quick reply is missing title or payload');
                                $scope.command.script.script[t].script[m].quick_replies[r].invalid = true;
                                $scope.validationError('Quick reply is missing title or payload');
                                return false;
                            } else {
                                delete($scope.command.script.script[t].script[m].quick_replies[r].invalid);
                            }
                        }
                    }
                }


                // validate that any slack attachments have the proper fields
                if ($scope.command.script.script[t].script[m].attachments) {
                    for (var r = 0; r < $scope.command.script.script[t].script[m].attachments.length; r++) {
                        if ($scope.command.script.script[t].script[m].attachments[r].actions && $scope.command.script.script[t].script[m].attachments[r].actions.length) {

                            for (var a = 0; a < $scope.command.script.script[t].script[m].attachments[r].actions.length; a++) {
                                if ($scope.command.script.script[t].script[m].attachments[r].actions[a].type == 'button' &&
                                    !($scope.command.script.script[t].script[m].attachments[r].actions[a].name &&
                                        $scope.command.script.script[t].script[m].attachments[r].actions[a].text &&
                                        (
                                            $scope.command.script.script[t].script[m].attachments[r].actions[a].value ||
                                          $scope.command.script.script[t].script[m].attachments[r].actions[a].url
                                        )
                                    )
                                ) {
                                    $scope.command.script.script[t].script[m].attachments[r].actions[a].invalid = true;
                                    $scope.validationError('Button is missing a required field');
                                    return false;
                                } else if ($scope.command.script.script[t].script[m].attachments[r].actions[a].type == 'select' &&
                                    !($scope.command.script.script[t].script[m].attachments[r].actions[a].name &&
                                        $scope.command.script.script[t].script[m].attachments[r].actions[a].text &&
                                        $scope.command.script.script[t].script[m].attachments[r].actions[a].data_source)
                                ) {
                                    $scope.command.script.script[t].script[m].attachments[r].actions[a].invalid = true;
                                    $scope.validationError('Menu is missing a required field');
                                    return false;
                                } else {
                                    delete($scope.command.script.script[t].script[m].attachments[r].actions[a].invalid);
                                }
                            }

                            if (!$scope.command.script.script[t].script[m].attachments[r].callback_id) {
                                $scope.command.script.script[t].script[m].attachments[r].callback_invalid = true;
                                $scope.validationError('Callback ID must be specified');
                                return false;
                            } else {
                                delete($scope.command.script.script[t].script[m].attachments[r].callback_invalid);
                            }

                        }
                    }
                }


                // validate that any facebook attachments have the proper fields
                if ($scope.command.script.script[t].script[m].fb_attachment) {
                    if ($scope.command.script.script[t].script[m].fb_attachment.buttons) {
                        for (var b = 0; b < $scope.command.script.script[t].script[m].fb_attachment.buttons.length; b++) {
                            if ($scope.command.script.script[t].script[m].fb_attachment.buttons[b].type == 'postback') {
                                if (!$scope.command.script.script[t].script[m].fb_attachment.buttons[b].title ||
                                    !$scope.command.script.script[t].script[m].fb_attachment.buttons[b].payload) {
                                    console.log('Button template button is missing title or payload');
                                    $scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid = true;
                                    $scope.validationError('Button template button is missing title or payload');
                                    return false;
                                } else {
                                    delete($scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid);
                                }
                            }
                            if ($scope.command.script.script[t].script[m].fb_attachment.buttons[b].type == 'web_url') {
                                if (!$scope.command.script.script[t].script[m].fb_attachment.buttons[b].title ||
                                    !$scope.command.script.script[t].script[m].fb_attachment.buttons[b].url ||
                                    !$scope.command.script.script[t].script[m].fb_attachment.buttons[b].webview_height_ratio) {
                                    console.log('Button template web_url is missing url, webview_height_ratio or payload');
                                    $scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid = true;
                                    $scope.validationError('Button template web_url is missing url, webview_height_ratio or payload');

                                    return false;
                                } else {
                                    delete($scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid);
                                }
                            }
                            if ($scope.command.script.script[t].script[m].fb_attachment.buttons[b].type == 'phone_number') {
                                if (!$scope.command.script.script[t].script[m].fb_attachment.buttons[b].title ||
                                    !$scope.command.script.script[t].script[m].fb_attachment.buttons[b].payload) {
                                    console.log('Button template phone_number is missing title or payload');
                                    $scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid = true;

                                    $scope.validationError('Button template phone_number is missing title or payload');
                                    return false;
                                } else {
                                    delete($scope.command.script.script[t].script[m].fb_attachment.buttons[b].invalid);
                                }
                            }
                        }
                    }


                    if ($scope.command.script.script[t].script[m].fb_attachment.elements) {
                        for (var e = 0; e < $scope.command.script.script[t].script[m].fb_attachment.elements.length; e++) {

                            if (!$scope.command.script.script[t].script[m].fb_attachment.elements[e].title) {
                                $scope.command.script.script[t].script[m].fb_attachment.elements[e].invalid_title = true;
                                $scope.validationError('Each element in the attached carousel must have a title');
                                return false;
                            } else {
                                delete($scope.command.script.script[t].script[m].fb_attachment.elements[e].invalid_title);
                            }

                            // in addition to the title, must have AT LEAST one other field
                            if (!$scope.command.script.script[t].script[m].fb_attachment.elements[e].subtitle &&
                                !$scope.command.script.script[t].script[m].fb_attachment.elements[e].item_url &&
                                !$scope.command.script.script[t].script[m].fb_attachment.elements[e].image_url &&
                                !($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons &&
                                    $scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons.length)
                            ) {

                                $scope.command.script.script[t].script[m].fb_attachment.elements[e].invalid = true;
                                $scope.validationError('Each element in the attached carousel must have at least one of: subtitle, image, link, or buttons');
                                return false;

                            } else {

                                delete($scope.command.script.script[t].script[m].fb_attachment.elements[e].invalid);
                            }

                            if ($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons) {
                                for (var b = 0; b < $scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons.length; b++) {

                                    if ($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].type == 'postback') {
                                        if (!$scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].title ||
                                            !$scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].payload) {
                                            console.log('Button template button is missing title or payload');
                                            $scope.validationError('Button template button is missing title or payload');

                                            $scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].invalid = true;
                                            return false;
                                        } else {
                                            delete($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].invalid);
                                        }
                                    }
                                    if ($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].type == 'web_url') {
                                        if (!$scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].title ||
                                            !$scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].url ||
                                            !$scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].webview_height_ratio) {
                                            console.log('Button template web_url is missing url, webview_height_ratio or payload');
                                            $scope.validationError('Button template web_url is missing url, webview_height_ratio or payload');

                                            $scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].invalid = true;
                                            return false;
                                        } else {
                                            delete($scope.command.script.script[t].script[m].fb_attachment.elements[e].buttons[b].invalid);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // validate any teams attachments
                if ($scope.command.script.script[t].script[m].platforms && $scope.command.script.script[t].script[m].platforms.teams) {

                    var message = $scope.command.script.script[t].script[m];
                    if (message.platforms.teams.attachments && message.platforms.teams.attachments.length) {
                        for (var a = 0; a < message.platforms.teams.attachments.length; a++) {
                            var attachment = message.platforms.teams.attachments[a];

                            if (attachment.type != 'file') {
                                if (!attachment.title && !attachment.subtitle && !attachment.text && !attachment.buttons.length && (!attachment.images || !attachment.images.length || !attachment.images[0].url)) {
                                    attachment.invalid = true;
                                    $scope.validationError('Attachments cannot be blank');
                                    return false;
                                } else {
                                    delete(attachment.invalid);
                                }
                            } else {
                                if (!attachment.name && !attachment.contentUrl) {
                                    attachment.invalid = true;
                                    $scope.validationError('Attachments cannot be blank');
                                    return false;
                                } else {
                                    delete(attachment.invalid);
                                }
                            }

                            // make sure buttons have all necessary fields
                            if (attachment.buttons && attachment.buttons.length) {
                                for (var b = 0; b < attachment.buttons.length; b++) {
                                    if (!attachment.buttons[b].title || !attachment.buttons[b].value) {
                                        attachment.buttons[b].invalid = true;
                                        $scope.validationError('Button is missing title or value');
                                        return false;
                                    } else {
                                        delete(attachment.buttons[b].invalid);
                                    }
                                }
                            }

                            if (attachment.tap) {
                                if (!attachment.tap.action) {
                                    attachment.tap.invalid_title = true;
                                    attachment.tap.invalid_value = true;
                                    $scope.validationError('Attachment tap action is incomplete');
                                    return false;
                                }

                                if (!attachment.tap.action.title) {
                                    attachment.tap.invalid_title = true;
                                    $scope.validationError('Attachment tap action requires a title');
                                    return false;
                                } else {
                                    delete(attachment.tap.invalid_title);
                                }

                                if (!attachment.tap.action.value) {
                                    attachment.tap.invalid_value = true;
                                    $scope.validationError('Attachment tap action requires a value');
                                    return false;
                                } else {
                                    delete(attachment.tap.invalid_value);
                                }



                            }

                        }
                    }
                }

                if (found_invalid) {
                    $scope.setThread($scope.command.script.script[t].topic);
                    return false;
                }
            }

        }
        $scope.ui.invalid = false;

        return true;

    };

    $scope.saveInfo = function() {

        $scope.ui.modal_info = false;
        $scope.makeDirty();

    }
    $scope.showCode = function() {

        $scope.save().then(function() {
            $http({
                method: 'GET',
                url: '/app/bots/' + $scope.bot._id + '/code/' + $scope.command._id,
            }).then(function successCallback(response) {
                $scope.ui.generated_code = response.data;
                $scope.ui.exported_text = 'data:application/javascript;charset=utf-8,' + encodeURIComponent($scope.ui.generated_code);
                $scope.ui.modal_code = true;
            });
        });
    }

    $scope.export = function() {

        $scope.save().then(function(raw_script) {

            // clean up fields we don't want in the export
            delete(raw_script.id);
            delete(raw_script._id);
            delete(raw_script.ownerId);
            delete(raw_script.posthooks);
            delete(raw_script.prehooks);

            delete(raw_script.deleted);
            delete(raw_script.botId);
            delete(raw_script.already_exist);


            $scope.ui.export_json = JSON.stringify([raw_script], null, 4);
            $scope.ui.exported_text = 'data:text/json;charset=utf-8,' + encodeURIComponent($scope.ui.export_json);

            $scope.ui.modal_export = true;

        });


    }

    $scope.validationError = function(msg) {
        $scope.ui.invalid = true;
        $scope.ui.validation_error = msg;
    }

    $scope.saveStatus = function() {
        var rendered = 'Last saved ' + moment($scope.ui.lastSaved).fromNow();
        return $sce.trustAsHtml(rendered);
    }


    $scope.save = function() {

        return new Promise(function(resolve, reject) {
            if ($scope.validate()) {
                $scope.ui.saving = true;
                // call sdk here and do something!
                sdk.saveCommand($scope.command).then(function(res) {
                    $scope.ui.saving = false;
                    $scope.ui.dirty = false;

                    $scope.ui.invalid = false;
                    $scope.ui.lastSaved = new Date();

                    $scope.command.modified = res.modified;

                    $scope.saved();
                    $scope.confirmation('Saved successfully.');
                    $scope.$apply();
                    resolve(res);
                }).catch(function(err) {
                    $scope.ui.saving = false;
                    $scope.handleAjaxError(err);
                });
            } else {
                $scope.handleAjaxError('Invalid script options were found. Please correct the highlighted problems before saving.');
                // reject('Invalid script options were found. Please correct the highlighted problems before saving.');
            }
        });

    };

    $scope.addAlternate = function(line) {
        line.text.push('...');
        $scope.makeDirty();
    };

    $scope.deleteAlternate = function(line, index) {
        if (line.text.length > 1) {
            line.text.splice(index, 1);
            if ($scope.ui.carousel_position >= line.text.length) {
                $scope.ui.carousel_position--;
            }
        } else {
            line.text[0] = '';
        }

        $scope.makeDirty();

    };

    $scope.generateCallbackID = function(attachment) {

        if (!attachment.callback_id || attachment.callback_id === '') {
            var id = null;
            if (attachment.title) {
                id = attachment.title.toLowerCase().replace(/\W/g,'_');
            } else {
                id = 'callback_id';
            }
            attachment.callback_id = id;
        }

    }

    $scope.addAction = function(attachment) {
        if (!attachment.actions) {
            attachment.actions = [];
        }
        attachment.actions.push({
            text: 'Button',
            name: 'button',
            value: '1',
            type: 'button'
        });

        $scope.generateCallbackID(attachment);
        $scope.makeDirty();

    };

    $scope.addLink = function(attachment) {
        if (!attachment.actions) {
            attachment.actions = [];
        }
        attachment.actions.push({
            text: 'Open Link',
            name: 'link_button',
            url: 'https://...',
            type: 'button'
        });

        $scope.generateCallbackID(attachment);
        $scope.makeDirty();

    };


    $scope.addMenu = function(attachment) {
        if (!attachment.actions) {
            attachment.actions = [];
        }
        attachment.actions.push({
            text: 'Menu',
            name: 'menu',
            type: 'select',
            data_source: 'default'
        });

        $scope.generateCallbackID(attachment);
        $scope.makeDirty();

    };

    $scope.editActionMenu = function(action) {

        if (!action.options) {
            action.options = [{
                text: 'Option 1',
                value: '1',
                description: 'This is the first option',
                selected: false,
            }];
            $scope.makeDirty();

        }

        $scope.ui.current_action = action;

        $scope.ui.modal_menu = true;

    }

    $scope.deleteMenuOption = function(action, index) {
        action.options.splice(index, 1);
        $scope.makeDirty();

    }

    $scope.toggleSelected = function(options, index) {
        if (options[index].selected) {
            delete(option[index].selected);
        } else {
            options[index].selected = true;
        }
        for (var o = 0; o < options.length; o++) {
            if (o != index) {
                delete(options[o].selected);
            }
        }
        $scope.makeDirty();

    }


    $scope.attachmentImageType = function(attachment) {

        if (attachment.thumb_url) {
            attachment.image_url = attachment.thumb_url;
            delete attachment.thumb_url;
        } else {
            attachment.thumb_url = attachment.image_url;
            delete attachment.image_url;
        }

    }

    $scope.addAuthor = function(attachment) {

        attachment.author_name = 'Author Name';
        attachment.hasAuthor = true;
    }

    $scope.addImage = function(attachment) {
        attachment.hasImage = true;
    }

    $scope.addFooter = function(attachment) {
        attachment.hasFooter = true;
    }


    $scope.addField = function(attachment) {
        if (!attachment.fields) {
            attachment.fields = [];
        }
        attachment.fields.push({
            title: 'Title',
            value: 'Value',
        });
        $scope.makeDirty();

    };

    $scope.addAttachment = function(msg) {
        if (!msg.attachments) {
            msg.attachments = [];
        }

        msg.attachments.push({
            title: 'New Attachment',
            text: 'A juicy little nugget of content',
            fields: [],
            actions: [],
        });

        $scope.makeDirty();

    }

    $scope.deleteAttachment = function(message, index) {
        if (confirm('Are you sure you want to permanently delete this attachment?')) {
            message.attachments.splice(index, 1);
            $scope.makeDirty();
        }
    }

    $scope.duplicateAttachment = function(message, index) {
        message.attachments.push(angular.copy(message.attachments[index]));
        $scope.makeDirty();
    }

    $scope.deleteButton = function(attachment, index) {
        attachment.actions.splice(index, 1);
        $scope.makeDirty();

    }

    $scope.deleteField = function(attachment, index) {
        attachment.fields.splice(index, 1);
        $scope.makeDirty();

    }

    $scope.addAttachmentLine = function() {
        if ($scope.validate()) {
            var msg = {
                'placeholder': true,
                text: [""],
            }

            $scope.thread.script.splice(-1, 0, msg);
            $scope.processGroups();
            $scope.makeDirty();
        }
    }

    $scope.fb_insertAttachment = function(msg, type) {
        $scope.fb_addAttachment(msg, type);
        $scope.focus(msg);


    }

    /* Facebook specific features */
    $scope.fb_addQuickReply = function(msg, type) {
        if (!msg.quick_replies) {
            msg.quick_replies = [];
        }

        if (type == 'text') {
            msg.quick_replies.push({
                title: 'Hello',
                payload: 'hello',
                content_type: 'text'
            });
        } else if (type == 'location') {
            msg.quick_replies.push({
                content_type: 'location'
            });
        }

        $scope.makeDirty();
    }

    $scope.removeQuickReply = function(msg, idx) {
        msg.quick_replies.splice(idx, 1);

        // remove this field if it is empty
        // otherwise facebook rejects it
        if (msg.quick_replies.length == 0) {
            delete(msg.quick_replies);
        }
        $scope.makeDirty();

    }


    $scope.fb_addAttachment = function(msg, type) {

        msg.placeholder = false;

        if (type == 'button') {
            if (!msg.text[0]) {
                msg.text = ['Button template sample text'];
            }
            msg.fb_attachment = {
                template_type: 'button',
                buttons: [{
                    "type": "postback",
                    "title": "Button",
                    "payload": "Payload"
                }, ]
            }
        } else if (type == 'generic') {

            msg.fb_attachment = {
                template_type: 'generic',
                elements: []
            };

            $scope.addFBElement(msg);
        } else if (type == 'image') {

            msg.fb_attachment = {
                type: 'image',
                payload: {
                    url: 'http://placekitten.com/500/250',
                }
            };

        }
        $scope.makeDirty();

    }

    $scope.resetQuickReply = function(option) {

        option.fb_quick_reply = !option.fb_quick_reply;

        if (option.fb_quick_reply) {
            if (!option.fb_quick_reply_payload) {
                option.fb_quick_reply_payload = option.pattern;
            }
        } else {
            delete option.fb_quick_reply_payload;
            delete option.fb_quick_reply_image_url;
        }
        $scope.makeDirty();

    }

    $scope.resetFBButton = function(button) {

        if (button.type == 'web_url') {
            delete button.payload;
        } else if (button.type == 'element_share') {
            delete button.payload;
            delete button.title;
            delete button.url;
        } else {
            delete button.url;
        }
        $scope.makeDirty();


    }

    $scope.addFBElement = function(msg) {
        msg.fb_attachment.elements.push({
            title: "Item",
            buttons: [{
                "type": "postback",
                "title": "Button",
                "payload": "payload"
            }],
        });
        $scope.makeDirty();

    };

    $scope.deleteFBElement = function(msg, idx) {
        msg.fb_attachment.elements.splice(idx, 1);
        if (msg.fb_attachment.elements.length == 0) {
            $scope.deleteFBAttachment(msg);
        }
        $scope.makeDirty();

    }

    $scope.deleteFBElementButton = function(msg, el, idx) {
        msg.fb_attachment.elements[el].buttons.splice(idx, 1);
        $scope.makeDirty();

    }

    $scope.translateButtonType = function(type) {
        switch (type) {
            case 'postback':
                return 'Button';
                break;
            case 'web_url':
                return 'Link';
                break;
            case 'phone_number':
                return 'Call';
                break;
            case 'element_share':
                return 'Share';
                break;
        }
    }

    $scope.addFBElementButton = function(msg, type, idx) {
        if (!msg.fb_attachment.elements[idx].buttons) {
            msg.fb_attachment.elements[idx].buttons = [];
        }

        switch (type) {
            case 'postback':
                msg.fb_attachment.elements[idx].buttons.push({
                    type: 'postback',
                    title: 'Button',
                    payload: 'payload',
                });
                break;
            case 'web_url':
                msg.fb_attachment.elements[idx].buttons.push({
                    type: 'web_url',
                    title: 'Open Link',
                    url: 'http://botkit.ai',
                    webview_height_ratio: 'full',
                });
                break;
            case 'phone_number':
                msg.fb_attachment.elements[idx].buttons.push({
                    type: 'phone_number',
                    title: 'Call Us',
                    payload: '+12125555555',
                });
                break;
            case 'element_share':
                msg.fb_attachment.elements[idx].buttons.push({
                    type: 'element_share',
                });
                break;
        }
        $scope.makeDirty();

    }

    $scope.deleteFBAttachment = function(msg) {

        msg.fb_attachment = undefined;
        $scope.makeDirty();

    }

    $scope.deleteFBButton = function(msg, idx) {

        msg.fb_attachment.buttons.splice(idx, 1);
        if (msg.fb_attachment.buttons.length == 0) {
            //$scope.addFBButton(msg);
            $scope.deleteFBAttachment(msg);
        }
        $scope.makeDirty();

    }

    $scope.addFBButton = function(msg, type) {
        if (msg.fb_attachment.buttons.length < 3) {
            switch (type) {
                case 'postback':
                    msg.fb_attachment.buttons.push({
                        type: 'postback',
                        title: 'Button',
                        payload: 'payload',
                    });
                    break;
                case 'web_url':
                    msg.fb_attachment.buttons.push({
                        type: 'web_url',
                        title: 'Open Link',
                        url: 'http://botkit.ai',
                        webview_height_ratio: 'full',
                    });
                    break;
                case 'phone_number':
                    msg.fb_attachment.buttons.push({
                        type: 'phone_number',
                        title: 'Call Us',
                        payload: '+12125555555',
                    });
                    break;
            }
        }
        $scope.makeDirty();

    }


    $scope.generateBackLinks = function() {

        var backlinks = [];

        $scope.bot.commands.map(function(command) {
        // do not look for local links
            if (command.command != $scope.command.command) {
                command.script.map(function(thread) {
                    thread.script.map(function(message) {
                        var paths = [];
                        if (message.collect && message.collect.options) {
                            paths = message.collect.options.filter(function(option) {
                                return (option.action=='execute_script' && option.execute.script == $scope.command.command && option.execute.thread == $scope.thread.topic);
                            });
                        }

                        if (paths.length || (message.action == 'execute_script' &&  message.execute.script == $scope.command.command && message.execute.thread == $scope.thread.topic)) {
                            backlinks.push({
                                action: 'execute_script',
                                execute: {
                                    script: command.command,
                                    thread: thread.topic,
                                }
                            })
                        }
                    });
                });
            }
        });

        // look for references to the current thread in other parts of this script.
        for (var t = 0; t < $scope.command.script.script.length; t++) {
            // messages in this thread are in the .script field, WEIRD
            for (var m = 0; m < $scope.command.script.script[t].script.length; m++) {
                if ($scope.command.script.script[t].topic != $scope.thread.topic) {
                    if ($scope.command.script.script[t].script[m].collect) {
                        for (var o = 0; o < $scope.command.script.script[t].script[m].collect.options.length; o++) {
                            if ($scope.command.script.script[t].script[m].collect.options[o].action == $scope.thread.topic) {
                                backlinks.push({
                                    action: $scope.command.script.script[t].topic,
                                })
                            }
                        }
                    }
                    if ($scope.command.script.script[t].script[m].action == $scope.thread.topic) {
                        backlinks.push({
                            action: $scope.command.script.script[t].topic,
                        });
                    }
                }
            }
        }

        // remove dupes
        var distinct = [];
        for (var b = 0; b < backlinks.length; b++) {

            var found = distinct.filter(function(a) {
                if (a.action == backlinks[b].action) {
                    if (a.action != 'execute_script' || (a.execute.script == backlinks[b].execute.script && a.execute.thread == backlinks[b].execute.thread)) {
                        return true;
                    }
                }
            })

            if (!found.length) {
                distinct.push(backlinks[b]);
            }

        }

        $scope.ui.backlinks = distinct;

    }

    $scope.setThread = function(thread) {
        if ($scope.unfocus()) {

            var current = $scope.thread ? $scope.thread.topic : '';
            if (current == thread && thread != 'default') {
                // no change
                return;
            }

            for (var t = 0; t < $scope.command.script.script.length; t++) {
                // reset editable status
                $scope.command.script.script[t].editable = false;

                if ($scope.command.script.script[t].topic == thread) {
                    $scope.thread = $scope.command.script.script[t];
                }
            }

            $scope.generateBackLinks();
            $scope.processGroups();
            $location.hash('topic-' +  $scope.thread.topic);
        }
    };

    $scope.toggleQuestion = function(line) {
        if (line.collect) {
            line.collect = null;
        } else {
            $scope.convertToQuestion(line);
        }
        $scope.makeDirty();
        $scope.processGroups();
    };

    $scope.listVariables = function() {

        return new Promise(function(resolve, reject) {

            var vars = {};

            for (var t = 0; t < $scope.command.script.script.length; t++) {

                var thread = $scope.command.script.script[t];
                for (var l = 0; l < thread.script.length; l++) {
                    if (thread.script[l].collect) {
                        vars[thread.script[l].collect.key] = 1;
                    }
                }
            }

            var list = [];
            for (var key in vars) {
                list.push(key);
            }
            resolve(list);

        });
    };

    $scope.convertToQuestion = function(line) {

        if (!$scope.command.variables || !$scope.command.variables.length) {
            $scope.command.variables = [];
        }
        $scope.listVariables().then(function(keys) {

            var keyname = null;

            // if a list of predefined variables is NOT present, autogenerate
            //   if (!$scope.command.script.variables) {
            //       // generate a new key name
            //       keyname = 'question_' + (keys.length + 1);
            //
            //       // ensure it is unique (maybe someone deleted another question)
            //       var cursor = keys.length;
            //       while (keys.filter(function(i) { return (i == keyname) }).length) {
            //           cursor++;
            //           keyname = 'question_' + (cursor + 1);
            //       }
            //   }

            // add entities as variables
            // if ($scope.entities.length) {
            //   $scope.entities.forEach(function(e){
            //     $scope.addVariable(
            //         {
            //           id: e.id,
            //           name: e.name,
            //           type: 'entity',
            //         }
            //     );
            //   });
            // }

            // if predefined variables exist, use the first one in the list as default.
            if ($scope.command.variables.length) {
                keyname = $scope.command.variables[0].name;
            } else {
                keyname = 'temporary_value';

                $scope.addVariable({
                    name: keyname,
                    type: 'string',
                });

            }
            line.collect = {
                key: keyname,
                options: [{
                    default: true,
                    pattern: 'default',
                    action: 'next'
                }]
            };


            //   line.focused_user = true;
            $scope.$apply();
            //$scope.focusUser(line);
            $scope.processGroups();
            $scope.makeDirty();

        });

    };

    $scope.addCondition = function(options) {
        options.push({
            pattern: 'sample',
            type: 'string',
            action: 'next'
        });
        $scope.makeDirty();
    }
    $scope.removeCondition = function(line, index) {
        line.collect.options.splice(index, 1);

        // if all options have been deleted, reset the default action to 'next' which causes the conversation to continue
        if (line.collect.options.length == 1) {
            if (line.collect.options[0].default) {
                line.collect.options[0].action = 'next';
            }
        }

        $scope.makeDirty();
    };

    $scope.toggleMultiple = function(line) {
        if (line.collect.multiple) {
            // find default action, set it to wait
            for (var o = 0; o < line.collect.options.length; o++) {
                if (line.collect.options[o].default) {
                    line.collect.options[o].action = 'wait';
                }
            }
            // there is only a default option
            if (line.collect.options.length == 1) {
                line.collect.options.push({
                    pattern: 'done',
                    type: 'string',
                    action: 'next',
                })
            }
            $scope.makeDirty();
        }
    }


    $scope.addConditionLine = function() {
        var new_line = $scope.ui.new_line;
        $scope.ui.new_line = '';
        if (!new_line) {
            new_line = 'Conditional Behavior'
        }
        // add the line of dialog
        var msg = {
            text: [new_line],
            conditional: {
                left: null,
                test: null,
                right: null,
                action: null
            }
        };

        if (msg.text[0].match(/\?$/i)) {
            $scope.convertToQuestion(msg);
        }

        $scope.thread.script.splice(-1, 0, msg);

        $scope.processGroups();

        // scroll this card into view
        $location.hash('card' + ($scope.thread.script.length - 1));
        $anchorScroll();
        // $scope.focus(msg);
        $scope.focusConditional(msg);
        $scope.makeDirty();
    };




    $scope.addLine = function() {
        var new_line = $scope.ui.new_line;
        $scope.ui.new_line = '';
        if (new_line) {
            // add the line of dialog

            var msg = {
                text: [new_line],
            };

            if (msg.text[0].match(/\?$/i)) {
                $scope.convertToQuestion(msg);
            }

            $scope.thread.script.splice(-1, 0, msg);

            $scope.processGroups();

            // scroll this card into view
            $location.hash('card' + ($scope.thread.script.length - 1));
            $anchorScroll();
            $scope.focus(msg);
            $scope.makeDirty();
        }
    };

    $scope.removeLineAt = function(index) {
        if (confirm('Remove this line?')) {
            $scope.thread.script.splice(index, 1);
            $scope.processGroups();
            $scope.unfocus();
            $scope.makeDirty();

        };
    };

    $scope.addLineAt = function(index, text) {
        if ($scope.unfocus()) {
            $scope.thread.script.splice(index, 0, {
                text: [text || ''],
            });
            $scope.processGroups();

            $scope.focus($scope.thread.script[index]);
            $scope.makeDirty();

        }
    };

    $scope.renderConditional = function(line) {

        var text;
        if(line.conditional.left === '_new'){
            text = '<span class="condition"><span class="label">IF: </span><span class="clause"><span class="variable">' + line.conditional.left_val + '</span> <span class="test">' + line.conditional.test + '</span>';
        }else {
            text = '<span class="condition"><span class="label">IF: </span><span class="clause"><span class="variable">' + line.conditional.left + '</span> <span class="test">' + line.conditional.test + '</span>';
        }
        switch (line.conditional.test) {
            case 'equals':
            case '!equals':
                if(line.conditional.right === '_new'){
                    text = text + ' <span class="variable">' + line.conditional.right_val + '</span>';
                }else {
                    text = text + ' <span class="variable">' + line.conditional.right + '</span>';
                }

                break;
        }

        text = text + '</span></span>';

        desc = '';
        switch (line.conditional.action) {
            case 'next':
                desc = 'continue with the thread';
                break;
            case 'repeat':
                desc = 'repeat this message until a conditional is matched';
                break;
            case 'wait':
                desc = 'wait for more input until a conditional is matched';
                break;
            case 'complete':
                desc = 'complete the conversation successfully';
                break;
            case 'stop':
                desc = 'end the conversation immediately and mark it as unsuccessful';
                break;
            case 'timeout':
                desc = 'end the conversation immediately and mark it as a timeout';
                break;
            case 'execute_script':
                desc = 'execute a different script: ' + line.conditional.execute.script + ', thread: ' + line.conditional.execute.thread;
                break;
            default:
                desc = 'jump to a different thread: ' + line.conditional.action;
        }

        text = text + '<span class="then"><span class="label">THEN: </span><span class="action">' + desc + '</span></span>';

        return $sce.trustAsHtml(text);

    }

    $scope.rendered = function(txt) {
        var rendered = txt.replace(/\{\{([\w\.\_\d]+)\}\}/igm, '<span class=\"variable\">$1</span>');
        rendered = rendered.replace(/\{(.*?)\}/igm, function(matches) {

            var options = matches.replace(/^\{/, '').replace(/\}$/, '').split('|');
            return '<span class="list">' + options[0] + '</span>';

        }); // "<span class=\"list\">One of: ($1)</span>");

        return $sce.trustAsHtml(rendered);
    };

    $scope.navigate = function(thread, $event) {
        $event.stopPropagation();
        if (thread == 'stop' || thread == 'next' || thread == 'repeat' || thread == 'complete') {
            return;
        } else {
            $scope.setThread(thread);
        }
    }

    $scope.renderSummary = function(line) {


        var conditions = line.collect.options.length - 1;

        var phrase = (conditions == 1) ? 'condition' : 'conditions';

        var text = [];
        text.push('Test user response against ' + conditions + ' ' + phrase + '.');

        // find default action
        var action = null;
        var default_options = null;
        var branches = {};
        for (var o = 0; o < line.collect.options.length; o++) {
            if (line.collect.options[o].default) {
                default_options = line.collect.options[0];
                action = line.collect.options[o].action;
            } else {
                switch (line.collect.options[o].action) {
                    case 'next':
                    case 'repeat':
                    case 'wait':
                    case 'complete':
                    case 'stop':
                    case 'timeout':
                        break;

                    default:
                        branches[line.collect.options[o].action] = 1;
                }
            }
        }

        // if (Object.keys(branches).length) {
        //   text.push('Possibly switch threads to: '+ Object.keys(branches).join(', '));
        // }

        if (action) {
            desc = '';
            switch (action) {
                case 'next':
                    desc = 'continue with the thread';
                    break;
                case 'repeat':
                    desc = 'repeat this message until a conditional is matched';
                    break;
                case 'wait':
                    desc = 'wait for more input until a conditional is matched';
                    break;
                case 'complete':
                    desc = 'complete the conversation successfully';
                    break;
                case 'stop':
                    desc = 'end the conversation immediately and mark it as unsuccessful';
                    break;
                case 'timeout':
                    desc = 'end the conversation immediately and mark it as a timeout';
                    break;
                case 'execute_script':
                    desc = 'execute a different script: ' + default_options.execute.script + ', thread: ' + default_options.execute.thread + '</span>';
                    break;
                default:
                    desc = 'jump to a different thread: ' + action
            }
            text.push('If no condition matches, ' + desc + '.');
        }

        return $sce.trustAsHtml(text.join('<br/>'));

    }

    $scope.followOption = function(option, $event) {

        $event.stopPropagation();

        switch (option.action) {
            case 'next':
            case 'stop':
            case 'timeout':
            case 'repeat':
            case 'wait':
            case 'complete':
                break;
            case 'execute_script':
                // find id of script
                var destination = $scope.bot.commands.filter(function(c) {
                    return c.command == option.execute.script;
                });

                if (destination.length) {
                    if ($scope.ui.dirty) {
                        if (confirm('Navigate to ' + destination[0].command + '?')) {
                            $scope.goto('/admin/edit/' + destination[0].command + '?thread=' + option.execute.thread);
                        }
                    } else {
                        $scope.goto('/admin/edit/' + destination[0].command + '?thread=' + option.execute.thread);
                    }
                }

                break;
            default:
                $scope.setThread(option.action);
        }
    }
    $scope.shouldDisplayFinalAction = function() {

        if ($scope.thread.script.length > 1) {
            var next_to_last = $scope.thread.script[$scope.thread.script.length-2];
            if (next_to_last.collect) {
                var d = next_to_last.collect.options.filter(function(o) { return o.action=='next'; });
                if (d.length) {
                    return true;
                } else {
                    return false;
                }
            }
        }

        return true;
    }

    $scope.generateActionClass = function(action) {

        switch (action) {
            case 'next':
            case 'stop':
            case 'timeout':
            case 'repeat':
            case 'wait':
            case 'complete':
            case 'execute_script':
                return action;
            default:
                return '';
        }

    }

    $scope.renderOptionNew = function(option, count) {

        var rendered = '';
        var maxlength = 35;

        if (option.default) {
            if (count == 1) {
                // rendered = '...and then ';
            } else {
                rendered = 'otherwise: ';
            }
        } else {
            if (option.pattern) {
                rendered = '<span class="utterance"> ' + $scope.truncateString(option.pattern,maxlength,true) + '</span>';
            }
        }

        switch (option.action) {

            case 'next':
                rendered = rendered + ' <span class="action"><i class="fa fa-play-circle" aria-hidden="true"></i> Continue</span>';
                break;
            case 'stop':
                rendered = rendered + ' <span class="action"><i class="fa fa-hand-paper-o" aria-hidden="true"></i> Failed</span>';
                break;
            case 'timeout':
                rendered = rendered + ' <span class="action"><i class="fa fa-clock-o" aria-hidden="true"></i> Timed Out</span>';
                break;
            case 'repeat':
                rendered = rendered + ' <span class="action"><i class="fa fa-repeat" aria-hidden="true"></i> Repeat</span>';
                break;
            case 'wait':
                rendered = rendered + '<span class="action"><i class="fa fa-commenting" aria-hidden="true"></i> Wait for more</span>';
                break;
            case 'complete':
                rendered = rendered + ' <span class="action"><i class="fa fa-check-square" aria-hidden="true"></i> Conversation Complete</span>';
                break;
            case 'execute_script':
                rendered = rendered + '<span class="action"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i> Go to <span class="branch-title" ng-click="followOption(option||line,$event)">' + $scope.truncateString(option.execute.script,maxlength,true); + ':' + $scope.truncateString(option.execute.thread,maxlength,true) + '</span></span>';
                break;
            default:
                rendered = rendered + ' <span class="action"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i> Go to <span class="branch-title" ng-click="followOption(option||line,$event)">' + $scope.truncateString(option.action,maxlength,true); + '</span></span>';
        }



        return $sce.trustAsHtml(rendered);
    }


    $scope.renderOption = function(option, count) {

        var rendered = '';

        if (option.default) {
            if (count == 1) {
                rendered = '...and then ';
            } else {
                rendered = '...otherwise, ';
            }
        } else {
            rendered = '...and if bot hears "' + option.pattern + '," ';
        }

        switch (option.action) {

            case 'next':
                rendered = rendered + ' <span class="bold">continue to next message</span>';
                break;
            case 'stop':
                rendered = rendered + ' <span class="bold">stop: mark failed</span>';
                break;
            case 'timeout':
                rendered = rendered + ' <span class="bold">stop: mark timed out</span>';
                break;
            case 'repeat':
                rendered = rendered + ' <span class="bold">repeat this line</span>';
                break;
            case 'wait':
                rendered = rendered + '<span class="bold">wait for more input</span>';
                break;
            case 'complete':
                rendered = rendered + ' <span class="bold">stop: mark successful</span>';
                break;
            case 'execute_script':
                rendered = rendered + '<span class="bold">execute script: </span><span class="branch-title">' + options.execute.script + ', thread: ' + options.execute.thread + '</span>';
                break;
            default:
                rendered = rendered + ' <span class="bold">jump to thread </span><span class="branch-title">' + option.action + '</span>';
        }



        return $sce.trustAsHtml(rendered);
    }

    $scope.renderLastAction = function(line) {

        var rendered = 'And then, ';
        switch (line.action) {

            case 'next':
                rendered = rendered + ' <span class="bold">continue to next message</span>';
                break;
            case 'stop':
                rendered = rendered + ' <span class="bold">stop: mark failed</span>';
                break;
            case 'timeout':
                rendered = rendered + ' <span class="bold">stop: mark timed out</span>';
                break;
            case 'repeat':
                rendered = rendered + ' <span class="bold">repeat this line</span>';
                break;
            case 'complete':
                rendered = rendered + ' <span class="bold">stop: mark successful</span>';
                break;
            case 'execute_script':
                rendered = rendered + '<span class="bold">execute script: </span><span class="branch-title">' + line.execute.script + ', thread: ' + line.execute.thread + '</span>';
                break;
            default:
                rendered = rendered + ' <span class="bold">jump to thread <span class="branch-title">' + line.action + '</span></span>';
        }
        return $sce.trustAsHtml(rendered);
    }

    $scope.removeAction = function(line) {
        delete(line.action);
        $scope.makeDirty();

    };

    $scope.isUniqueThread = function(name) {

        for (var t = 0; t < $scope.command.script.script.length; t++) {
            if ($scope.command.script.script[t].topic == name) {
                return false;
            }
        }

        return true;
    };

    $scope.addThreadAsAction = function(newbranch, line) {

        if ($scope.isUniqueThread(newbranch)) {
            $scope.command.script.script.push({
                topic: newbranch,
                script: [{
                    text: ['This is ' + newbranch],
                },
                {
                    action: 'complete',
                }
                ]
            });

            line.action = newbranch;
            $scope.makeDirty();

        } else {
            alert('That thread name is already in use');
        }
    };

    $scope.unfocus = function() {
        // if I haven't selected a thread yet, there is nothing to unfocus
        if (!$scope.thread) {
            $scope.ui.incoming_message = null;
            $scope.ui.outgoing_message = null;
            return true;
        }

        if ($scope.validate()) {
            for (var l = 0; l < $scope.thread.script.length; l++) {
                $scope.thread.script[l].focused = false;
                $scope.thread.script[l].focused_user = false;
                $scope.ui.incoming_message = null;
                $scope.ui.outgoing_message = null;
            }
            return true;
        } else {
            return false;
        }

    }

    $scope.propertiesIsEmpty = function() {
        return (!$scope.ui.outgoing_message && !$scope.ui.conditional && !$scope.ui.incoming_message);
    }

    $scope.properties = function() {
        if ($scope.ui.outgoing_message) {
            return '/js/partials/properties_outgoing.html';
        } else if ($scope.ui.conditional) {
            return '/js/partials/conditional.html';
        } else if ($scope.ui.incoming_message) {
            return '/js/partials/properties_incoming.html';
        }else {
            return '/js/partials/properties_none.html';
        }
    }
    $scope.focusOnly = function(line) {

        if (!line.focused) {
            if ($scope.unfocus()) {
                line.focused = true;
            }
        }
    }

    $scope.focusConditional = function(line, force) {
        var possible_opts = $scope.command.variables.map(function(o){
            var z = '{{responses.' + o.name + '}}';
            return z;
        });
        possible_opts.push("_new");

        if(line.conditional.left){
            var left_exist = possible_opts.filter(function(o){
                return o == line.conditional.left;
            });
            if(left_exist.length == 0){
                line.conditional.left_val = line.conditional.left;
                line.conditional.left = '_new'
            }
        }else {
            line.conditional.left = possible_opts[0];
        }


        var right_exist = possible_opts.filter(function(o){
            return o == line.conditional.right;
        });
        if(right_exist.length == 0){
            line.conditional.right_val = line.conditional.right;
            line.conditional.right = '_new'
        }

        if(!line.conditional.test){
            line.conditional.test = 'exists';
        }
        if(!line.conditional.action){
            line.conditional.action = 'next';
        }
        $scope.updateConditionalText(line);
        if (!line.focused) {
            if ($scope.unfocus()) {
                line.focused = true;
                $scope.ui.conditional = line;
                $scope.ui.outgoing_message = false;
                $scope.ui.incoming_message = false;
                $scope.ui.properties = true;

            }
        }
    };


    $scope.focus = function(line, force) {
        if (!line.focused) {
            if ($scope.unfocus()) {
                line.focused = true;
                $scope.ui.conditional = false;
                $scope.ui.outgoing_message = line;
                $scope.ui.properties = true;
                $scope.ui.carousel_position = 0;
            }
        }
    };

    $scope.focusUser = function(line) {
        if (!line.focused_user) {
            if ($scope.unfocus()) {
                line.focused_user = true;
                $scope.ui.conditional = false;
                $scope.ui.incoming_message = line;
                $scope.ui.properties = true;
            }
        }
    };

    $scope.blur = function(line) {
        line.focused = false;
        $scope.ui.outgoing_message = null;
        $scope.ui.incoming_message = null;

    };

    $scope.processGroups = function() {

        var in_group = false;

        // add classes to groupings of messages so they can be presented slightly differently
        // basically we want to hide the bot icon til the last message if he is sending more than one
        //
        for (var m = 0; m < $scope.thread.script.length; m++) {
            $scope.thread.script[m].first_in_group = false;
            $scope.thread.script[m].last_in_group = false;
            $scope.thread.script[m].middle_of_group = false;

            if (!in_group) {
                $scope.thread.script[m].first_in_group = true;
                in_group = true;
            }

            if ($scope.thread.script[m].collect ||
                (m == $scope.thread.script.length - 2)) { // why -2? final action counts
                $scope.thread.script[m].last_in_group = true;
                in_group = false;

            }

            if (in_group && !$scope.thread.script[m].first_in_group && !$scope.thread.script[m].last_in_group) {
                $scope.thread.script[m].middle_of_group = true;
            }

        }

    }


    $scope.attachmentWidget = function() {
        return '/js/partials/' + $scope.bot.platform + '_attachments.html';
    }

    $scope.fbAttachmentType = function() {
        return '/js/partials/facebook_' + $scope.ui.outgoing_message.fb_attachment.template_type + '_attachment.html';
    }

    $scope.getLUISIntents = function() {
        sdk.getLUISIntents().then(function(intents) {
            $scope.ui.intents = intents;
            $scope.$apply();
        });
    }

    $scope.bot = {
        _id: 'static',
        platform: platform,
    };

    $scope.getCommandById(command_id).then(function(command) {

        $scope.command = command; // store for later possible use
        $scope.command.script.script = command.script
        if (command.variables) {
            $scope.command.script.variables = command.variables.map(function(i) {
                return i.name;
            });
        } else {
            $scope.command.script.variables = [];
        }

        $scope.getBotCommands(bot_id).then(function(bot_commands){
            $scope.bot.commands = bot_commands;
            $scope.ui.scripts = true;

            // Now that I have a list of all the commands,
            // I can look for messages with conditionals that are set to the execute_script action
            // and add the necessary lookup info
            $scope.command.script.map(function(first_layer){
                first_layer.script = first_layer.script.map(function(second_layer){
                    if(second_layer.action === 'execute_script'){
                        var selected_script = $scope.bot.commands.filter(function(c){
                            return c.command === second_layer.execute.script;
                        });
                        second_layer.selected_scripts_threads = selected_script[0].script;
                    }
                    if(second_layer.collect){
                        second_layer.collect.options = second_layer.collect.options.map(function(collects_input){
                            if(collects_input.action === 'execute_script'){
                                var selected_script = $scope.bot.commands.filter(function(c){
                                    return c.command === collects_input.execute.script;
                                });
                                collects_input.selected_scripts_threads = selected_script[0].script;
                            }
                            return collects_input;
                        });
                    }
                    return second_layer;
                });
                return first_layer;
            });

            var start_thread = getParameterByName('thread') || 'default';
            $scope.setThread(start_thread);
            $scope.$apply();


        }).catch(function(err) {
            $scope.handleAjaxError(err);
        });

    }).catch(function(err) {
        $scope.handleAjaxError(err);
    });


    $scope.lastError = null;
    $scope.ui.editor_mode = $scope.decideMode(platform);
    $scope.getLUISIntents();

}]);

// sdk.js

angular.module('howdyPro').factory('sdk', ['$http', '$q', function($http, $q) {
        //======================================================================
        // variables
        //======================================================================
        var sdk = {};

        const VERBOSE_LOGGING = false;
        const REQUEST_OK_SC = 200;


        function handleError(err) {
            console.log('*** HANDLING ERROR');
            console.error(err);
        }
        //======================================================================
        // Verbose Logging function
        //======================================================================
        function _log(msg, args) {
            if (VERBOSE_LOGGING) {
                if (!args) {
                    console.log(msg);
                } else {
                    if (Array.isArray(args)) {
                        args.forEach(function(arg) {
                            console.log(msg + ': ', arg);
                        });
                    } else {
                        console.log(msg + ': ', args);
                    }
                }
            }
        }
        //======================================================================
        // requests
        //======================================================================
        function request(uri, method, data, sign) {
            var deferred = $q.defer();
            // log arguments
            _log('uri: ', uri);
            _log('method: ', method);
            _log('data: ', data);
            _log('sign: ', sign);
            // log service endpoints
            var headers = {
                "Content-Type": "application/json"
            };
            var opts = {};
            if (method === 'get') {
                opts = {
                    method: method,
                    url: uri,
                    headers: headers
                };

                if (data) {
                    for (var key in data) {
                        opts.url = opts.url + "&" + key + "=" + encodeURIComponent(data[key]);
                    }
                }

            } else if (method === 'post' || method === 'put' || method === 'delete') {
                opts = {
                    method: method,
                    url: uri,
                    data: data,
                    headers: headers
                };
            } else {
                _log("REQUEST REJECTED ==> INVALID_METHOD");
                deferred.reject(INVALID_METHOD);
                return;
            }
            _log("OPTS: ", opts);
            if (!opts || !opts.url) {
                deferred.reject(REQUEST_ABORTED);
                return;
            } else {
                _log("DISPATCHING REQUEST...")
                $http(opts).then(function(response) {
                    if (response.statuscode !== REQUEST_OK_SC) {
                        _log("REQUEST RESOLVED ==> REQUEST_OK_SC");
                        _log("REQUEST ==> RESPONSE.DATA:", response.data);
                        deferred.resolve(response.data);
                    } else {
                        // Invalid response
                        // Status codes less than -1 are normalized to zero.
                        // -1 usually means the request was aborted, e.g. using a config.timeout
                        if (response.statuscode === -1) {
                            _log("REQUEST REJECTED ==> REQUEST_ABORTED");
                            deferred.reject(REQUEST_ABORTED);
                        } else {
                            _log("REQUEST REJECTED ==> !== REQUEST_OK_SC");
                            deferred.reject(response.data);
                        }
                    }
                }, function(error) {
                    handleError(error);
                    deferred.reject(error);
                });
            }
            return deferred.promise;
        };

        sdk.noop = function() {
            var deferred = $q.defer();
            setTimeout(function() {
                deferred.resolve('noop');
            },1000);
            return deferred.promise;
        }

        sdk.v2 = function(uri, type, parameters, usetoken) {
            return new Promise(function(resolve, reject) {
                request(uri, type, parameters, usetoken).then(function(response) {
                    // console.log('GOT RESPONSE', response)

                    var data = response.data;
                    if (response.success) {
                      resolve(response.data);
                    } else {
                      reject(response);
                    }
                }).catch(function(err) {
                    reject(err);
                });
            });
        }

        // get external url for import
        sdk.getExternalUrl = function(uri){
          const method = "sdk.getExternalUrl";
          var deferred = $q.defer();
          $http({
            method: 'GET',
            url: '/app/bots/:botid/import/external?uri=' + uri,
            headers: {"Content-Type": "application/json"}
          }).then(function successCallback(response) {
              // console.log(response);
              deferred.resolve(response);
            }, function errorCallback(response) {
              // console.log('err');
              // console.log(response);
              deferred.reject(new Error(response));
            });
            return deferred.promise;
        };


        //======================================================================
        // commandService
        //======================================================================
        sdk.getCommandById = function(botId, id) {
            return sdk.v2('/admin/api/script','post',{command: id}, true);
        };

        sdk.getCommandByName = function(botId, id) {
            return sdk.v2('/admin/api/script','post',{command: id}, true);
        };


        sdk.getCommandsByBot = function(id) {

            return sdk.v2('/admin/api/scripts','get',{}, true);

        };

        sdk.getLUISIntents = function(id) {
            return sdk.v2('/admin/api/luisIntents','get',{}, true);
        };

        sdk.removeCommand = function(bot_id, command) {
          command.deleted = true;
          var uri = '/admin/api/scripts/' + command.id;
          return sdk.v2(uri, 'delete',{deleted:true}, true);
        };

        sdk.saveCommand = function(command) {

          var cloned = JSON.parse(JSON.stringify(command));
          var clean_script = cloned.script;

          // remove all the weird ui fields that get jammed in here
          for (var t = 0; t < clean_script.length; t++) {
              delete clean_script[t].editable;
              for (var m = 0; m < clean_script[t].script.length; m++) {
                  delete clean_script[t].script[m].first_in_group;
                  delete clean_script[t].script[m].last_in_group;
                  delete clean_script[t].script[m].middle_of_group;
                  delete clean_script[t].script[m].focused;
                  delete clean_script[t].script[m].focused_user;
                  delete clean_script[t].script[m].invalid;
                  delete clean_script[t].script[m].invalid_key;
                  delete clean_script[t].script[m].placeholder;


                  // remove flag fields on attachments
                  if (clean_script[t].script[m].attachments) {
                    for (var a = 0; a < clean_script[t].script[m].attachments.length; a++) {
                      delete clean_script[t].script[m].attachments[a].hasAuthor;
                      delete clean_script[t].script[m].attachments[a].hasFooter;
                      delete clean_script[t].script[m].attachments[a].hasImage;
                    }
                  }

                  // remove empty quick reply list, as this will be rejected by Facebook
                  if (clean_script[t].script[m].quick_replies && !clean_script[t].script[m].quick_replies.length) {
                    delete clean_script[t].script[m].quick_replies;
                  }

                  // remove selectable thread
                  if(clean_script[t].script[m].collect && clean_script[t].script[m].collect.options){
                    for (var i = 0; i < clean_script[t].script[m].collect.options.length; i++) {
                      if(clean_script[t].script[m].collect.options[i].selected_scripts_threads){
                        delete clean_script[t].script[m].collect.options[i].selected_scripts_threads
                      }
                    }
                  }

                  // remove selectable thread from a condition action
                  // console.log('clean_script[t].script[m]: ', clean_script[t].script[m]);
                  if(clean_script[t].script[m].conditional && clean_script[t].script[m].conditional.selected_scripts_threads){
                    delete clean_script[t].script[m].conditional.selected_scripts_threads
                  }

                  if(clean_script[t].script[m].conditional && clean_script[t].script[m].conditional.left == '_new'){
                    clean_script[t].script[m].conditional.left = clean_script[t].script[m].conditional.left_val;
                    delete clean_script[t].script[m].conditional.left_val;
                  }

                  if(clean_script[t].script[m].conditional && clean_script[t].script[m].conditional.right == '_new'){
                    clean_script[t].script[m].conditional.right = clean_script[t].script[m].conditional.right_val;
                    delete clean_script[t].script[m].conditional.right_val;
                  }
                  if(clean_script[t].script[m].conditional && clean_script[t].script[m].conditional.validators){
                    delete clean_script[t].script[m].conditional.validators;
                  }

                  // remove selectable threads from the complete actions
                  var last_script = clean_script[t].script[clean_script[t].script.length-1]
                  if(last_script.action === "execute_script"){
                    if(last_script.selected_scripts_threads){
                      delete last_script.selected_scripts_threads
                    }
                  }
              }
          }


          cloned.script = clean_script;

          return sdk.v2('/admin/save','post',cloned, true);

        };

        return sdk;
    }]);
