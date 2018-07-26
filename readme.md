This project will serve as a drop-in replacement for users of Botkit Studio.

## Get Script Content

...


## Add a local script service to a Botkit app

First, npm install this:

```
npm install --save howdylabs/ministudio
```

then, add to your's main file, just after defining your controller object

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

Then, modify your Botkit app to include a pointer to this new service.

```
var controller = Botkit.platform({
  studio_command_uri: 'https://my.new.service'
})
```

[![Remix on Glitch](https://cdn.glitch.com/2703baf2-b643-4da7-ab91-7ee2a2d00b5b%2Fremix-button.svg)](https://glitch.com/edit/#!/import/github/howdylabs/ministudio)

PROS: content edits that happen here don't require restart or redeploy of the bot app itself

CONS: a new microservice has to be hosted and operated


### Securing API

You can lock down access to the API by specifying one or more access tokens in the TOKENS environment variable (or in the .env file).  

If any tokens are specified, access to the API requies a valid value in the `access_token` url query parameter.  Botkit will automatically use the Botkit Studio `studio_token` value for this.


TODO:

* support for fallback script
