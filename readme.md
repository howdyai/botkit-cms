This project will serve as a drop-in replacement for users of Botkit Studio.

## Get Script Content

This project is designed to be used in conjunction with data exported from a Botkit Studio account.  To acquire this data file, follow the instructions below:

* Login to your Botkit Studio account.  
* Navigate to a specific bot, then navigate to that bot's "Scripts" tab.
* Click the "Export" button located in the upper right hand corner of the script list.
* De-select any scripts you do not want to include
* Click the "Export ##" button at the bottom of the screen.
* Click "Download" to download the file, or copy paste the content of the window into a local file named `scripts.json`

## Add a local script service to a Botkit app

First, npm install this:

```bash
npm install --save howdylabs/ministudio
```

[Get your existing scripts](#get-script-content), and put the resulting `scripts.json` in the main folder of your bot project.

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

### Configuration

Options for this service are controlled via environment variables, which can be stored in a `.env` file at the project root.

Here is an example `.env` file:

```
# Chat platform
# PLATFORM=[slack,teams,ciscospark,web,facebook]
PLATFORM=slack

# authentication tokens for Bot users
# TOKENS=123 456
TOKENS=youwillneverguessmysecretbottoken

# Admin users for UI
# USERS=username:password username2:password2 username3:password3
USERS=admin:123secret
```

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

## Building Project

Modifications to the front end application or css should be done to their original source files, then compiled by the build process. To build the Javascript and CSS files from their source locations, run the following command:

```bash
gulp build
```

The front end editor application included in this project is built with Angular. The source code of the this application is broken up into several component files in the `js/` folder. These are compiled into a single source file and moved to a final home at `public/js/scripts.js`  by the build process.

The CSS is controlled by SASS files in the `sass/` folder. These are compiled into a single source file and moved to a final home at `public/css/new.css`  by the build process.





TODO:

* move stuff out of bower to cdn where possible
* support for fallback script
* deal with id/command/uniqueness
* delete script
