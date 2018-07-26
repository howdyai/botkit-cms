This project will serve as a drop-in replacement for users of Botkit Studio.

## Get Script Content

...


## Add a local script service to a Botkit app

First, npm install this:

```bash
npm install --save howdylabs/ministudio
```

Then, add to your's main file, just after defining your controller object

```js
var studio = require('ministudio')();
studio.useLocalStudio(controller);

studio.loadScriptsFromFile(__dirname + '/scripts.json').catch(function(err) {
  console.error('Error loading scripts', err);
});
```

PROS: no external api calls

CONS: script content now has to live in bot repo, requires a restart for content changes


## Create a replacement API microservice

Clone this repo and set it up on a public host somewhere. Clicking the Glitch link below will do this for you.

[Get your existing scripts](#get-script-content), and put the resulting `scripts.json` file in the `data/` folder.

Launch the app, then load it in your web browser. You should see a link to the editor screen.

Make sure your new service is available at a public address on the web. Then, modify your Botkit app to include a pointer to this new service.

```
var controller = Botkit.platform({
  studio_command_uri: 'https://my.new.service'
})
```

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/howdylabs/ministudio)

PROS: content edits that happen here don't require restart or redeploy of the bot app itself

CONS: a new microservice has to be hosted and operated

### Editor Configuration

The Botkit dialog editor can be used in one of several different flavors, controlled by the `PLATFORM` environment variable.

| Value | Description
|--- |---
| web | Botkit Anywhere mode
| slack | Slack mode
| teams | Microsoft Teams mode
| ciscospark | Cisco Spark / Webex Teams mode
| facebook | Facebook mode


### Securing Admin / Editor Access

Access can be limited and users can be controlled using the `USERS` environment variable.

Set the variable to a space separated list of user:password pairs. Users will be shown a login prompt when accessing any url within the `/admin/` url.

### Securing API Access

You can lock down access to the API by specifying one or more access tokens in the TOKENS environment variable (or in the .env file).  

If any tokens are specified, access to the API requies a valid value in the `access_token` url query parameter.  Botkit will automatically use the Botkit Studio `studio_token` value for this.


TODO:

* support for fallback script
