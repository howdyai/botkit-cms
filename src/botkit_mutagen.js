module.exports = function(api, controller) {

    // evaluate incoming data
    controller.studio.evaluateTrigger = function(bot, text, user) {
        return api.evaluateTriggers(text);
    };

    // get command list
    controller.studio.getScripts = function(bot, tag) {
        return api.getScripts(tag);
    };

    // create a simple script
    // with a single trigger and single reply
    controller.studio.createScript = function(bot, trigger, text) {
        return new Promise(function(resolve, reject) {
            // TODO: Wtf does this do?
            // noop
            resolve();
        });
    };

    // load a script from the pro service
    controller.studio.getScriptById = function(bot, id, user) {
        return api.getScript(id);
    };

    // load a script from the pro service
    controller.studio.getScript = function(bot, text, user) {
        return api.getScript(text);
    };

    // get Botkit Studio identity
    controller.studio.identify = function() {
        return new Promise(function(resolve, reject) {
            resolve({
                name: process.env.BOT_NAME || 'Botkit Bot',
                platforms: [{type:(process.env.PLATFORM || 'web')}]
            });
        });
    }

    return controller;

}
