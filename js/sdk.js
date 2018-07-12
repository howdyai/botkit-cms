// sdk.js

angular.module('howdyPro').factory('sdk', ['$cookieStore', '$http', '$q', function($cookieStore, $http, $q) {
        //======================================================================
        // variables
        //======================================================================
        var sdk = {};
        var Session = {};
        var accessToken = {};
        var Configs = {
            "verboselogging": "false",
            "tracing": "false",
            "services": {
                "authenticationServiceURI": "/api/v1",
                "botServiceURI": "/api/v1",
                "statServiceURI": "/api/v1",
                "commandServiceURI": "/api/v1",
                "userServiceURI": "/api/v1",
            }
        };
        //======================================================================
        // constants
        //======================================================================
        // services
        const AUTH_SERVICE = Configs.services.authenticationServiceURI;
        const BOT_SERVICE = Configs.services.botServiceURI;
        const COMMAND_SERVICE = Configs.services.commandServiceURI;
        const STAT_SERVICE = Configs.services.statServiceURI;
        const USER_SERVICE = Configs.services.userServiceURI;

        // requests
        const REQUEST_SLA = 2000;
        const REQUEST_OK_SC = 200;
        const REQUEST_FAILED_SC = 400;
        const REQUEST_UNAUTH_SC = 401;
        const REQUEST_SERVERERR_SC = 500;
        const REQUEST_ABORTED = 'REQUEST ABORTED';
        // exceptions
        const INVALID_SESSION = 'Invalid Token';
        const INVALID_METHOD = 'Invalid Method';
        // debugging and diagnostics
        const VERBOSE_LOGGING = Configs.verboselogging === "true" ? true : false;
        //======================================================================
        // Generic Exception Handling method
        //======================================================================
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
            _log('AUTH_SERVICE: ', AUTH_SERVICE);
            _log('BOT_SERVICE: ', BOT_SERVICE);
            _log('COMMAND_SERVICE: ', COMMAND_SERVICE);
            var headers = {
                "Content-Type": "application/json"
            };
            if (sign) {
                _log("SIGNING REQUEST: ", uri);
                // If Session is not defined --> Extract the session object via the $cookieStore
                if (!this.accessToken) {
                  _log('extracting access token');
                  var session = $cookieStore.get('session');
//                  this.accessToken = session.id;
                    this.accessToken = 'editor';
                }
                // this.Session = $cookieStore.get('session');
                if (this.accessToken) {
                    _log("accessToken: ", this.accessToken);
                    if (uri.match(/\?/)) {
                        uri = uri.concat('&access_token=', this.accessToken);
                    } else {
                        uri = uri.concat('?access_token=', this.accessToken);
                    }
                    _log("uri: ", uri);
                    // headers = {
                    //     "Content-Type": "application/json",
                    //     "session": Session
                    // };
                } else {
                    _log("REQUEST REJECTED ==> INVALID_SESSION");
                    deferred.reject(INVALID_SESSION);
                    return;
                }
            }
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

        sdk.apiCall = function(method, uri, type, parameters, usetoken) {

            var deferred = $q.defer();
            request(uri, type, parameters, usetoken).then(function(response) {
                if (response.statuscode !== REQUEST_OK_SC) {
                    _log(method + " : RESPONSE ACCEPTED: " + response);
                    if (response.error) {
                        deferred.reject(response.error);
                    } else {
                        deferred.resolve(response);
                    }
                } else {
                //   console.log('response: ', response);
                    _log(method + " : RESPONSE REJECTED: " + response);
                    deferred.reject('Request Failed: INVALID REQUEST: RESPONSE: ' + response);
                }
            }).catch(function(err) {
            //   console.log('err: ', err);
                _log(method + " : RESPONSE HTTP ERROR: " + err);
                deferred.reject(err);
            });
            return deferred.promise;

        };

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
        // AuthenticationService
        //======================================================================
        sdk.login = function(credentials) {
            return sdk.v2('/api/v2/users/login','post', credentials, false);
        };


        sdk.signup = function(credentials) {

            return sdk.v2('/api/v2/users','post', credentials, false);

        }


        sdk.reverify = function(username) {
            return sdk.v2('/api/v2/users/reverify','post',{"email": username},false);
        }

        sdk.requestPasswordReset = function(username) {
            return sdk.v2('/api/v2/users/resetPassword','post',{"email": username},false);
        }


        sdk.resetPassword = function(password, access_token) {
            return sdk.v2('/api/v2/users/resetPassword','put',{"password": password, "token": access_token},false);
            //
            // const method = "sdk.resetPassword";
            // var uri = AUTH_SERVICE + '/users/change-password';
            // return sdk.apiCall(method, uri, 'post', {password: password, confirmation: password, access_token: access_token}, false);
        }

        sdk.changePassword = function(userId, password) {
          return sdk.v2('/api/v2/users/' + userId + '/password','put',{password: password},true);
        }

        sdk.whoami = function() {

          var session = $cookieStore.get('session');
          var token = session.id;

          return sdk.v2('/api/v2/users/whoami/'+token,'get', {},true);
        }

        sdk.updateTOS = function(userId) {
            return sdk.v2('/api/v2/users/' + userId,'put', {"termsAcceptedDate": new Date(), notifications: {newsletter: true}},true);
        }

        sdk.submitSurvey = function(answers) {
          return sdk.v2('/app/survey', 'post', answers, true);
        }

        sdk.updateUser = function(userId, fullname, notifications, settings) {

            return sdk.v2('/api/v2/users/' + userId,'put',{"fullname": fullname, "notifications": notifications, "settings": settings},true);
        }

        sdk.updateUserIsNew = function(userId) {

            return sdk.v2('/api/v2/users/' + userId,'put', {"isNew": false},true);
        }

        sdk.changeRole = function(customerId, userId, role) {

            return sdk.v2('/api/v2/customers/' + customerId + '/users/' + userId +'/role','put',{role: role},true);

        };

        sdk.changeNotificationPref = function(customerId, userId, pref) {
            return sdk.v2('/api/v2/customers/' + customerId + '/users/' + userId+'/notifications','put',{notifications: pref},true);
        };
        sdk.getStrataByUser = function(userId) {
            return sdk.v2('/api/v2/users/' + userId + '/strata','get',{},true);
        };


        sdk.removeFromTeam = function(customerId, userId) {

            return sdk.v2('/api/v2/customers/' + customerId + '/users/' + userId,'delete',{},true);

        }


        sdk.sendInvite = function(userId, customerId, email, role, created) {

            var params = {
                receiverRole: role,
                receiverEmail: email,
            }
            return sdk.v2('/api/v2/customers/' + customerId + '/invite','post',params, true);

        }


        sdk.deleteInvite = function(customerId, invite_id) {
            return sdk.v2('/api/v2/customers/' + customerId + '/invites/' + invite_id,'delete',{}, true);

        };

        sdk.getPlans = function() {
            return sdk.v2('/api/v2/servicePlans','get',{}, true);
        };

        sdk.getPlan = function(plan_name) {
            return sdk.v2('/api/v2/servicePlans','get',{name: plan_name}, true);
        };

        sdk.createSubscription = function(subscription) {
          const method = "sdk.createSubscription";
          var uri = COMMAND_SERVICE + '/subscriptions';
          return sdk.apiCall(method, uri, 'post', subscription, true);
        };

        sdk.cancelSubscription = function(customerId) {

          return sdk.v2('/api/v2/customers/' + customerId + '/subscription/cancel','post',{}, true);
        };


        sdk.getSubscription = function(customerId) {

          return sdk.v2('/api/v2/customers/' + customerId+'/subscription','get',{}, true);
        };

        sdk.getInvites = function(customerId) {

            return sdk.v2('/api/v2/customers/' + customerId+'/invites','get',{}, true);

        }


        sdk.getCustomerById = function(customerId) {
            return sdk.v2('/api/v2/customers/' + customerId,'get',{}, true);
        };

        sdk.getUsersByCustomer = function(customerId) {
            return sdk.v2('/api/v2/customers/' + customerId+'/users','get',{}, true);
        };

        sdk.getUsersByCustomerWithRoles = function(customerId) {
            return sdk.v2('/api/v2/customers/' + customerId+'/users/roles','get',{}, true);
        };


        sdk.createTeam = function(customer) {

            return sdk.v2('/api/v2/customers','post',customer, true);

        };

        sdk.createStripeSubscription = function(customerId, plan, token, coupon) {

            return sdk.v2('/api/v2/customers/' + customerId + '/subscribe','post',{
              plan: plan,
              token: token,
              coupon: coupon,
            }, true);

        };

        sdk.changeStripeSubscription = function(customerId, plan) {

            return sdk.v2('/api/v2/customers/' + customerId + '/subscribe','put',{
              plan: plan,
            }, true);

        };

        sdk.updateStripePayment = function(customerId, token) {

            return sdk.v2('/api/v2/customers/' + customerId + '/subscribe','put',{
              token: token,
            }, true);

        };


        //======================================================================
        // BotService
        //======================================================================
        sdk.getBotsByCustomer = function(customerId) {

          return sdk.v2('/api/v2/customers/' + customerId + '/bots', 'get', {}, true);

        };

        sdk.getBotByID = function(botID) {

            return sdk.v2('/api/v2/bots/' + botID, 'get', {}, true);

        };


        sdk.getBotHash = function(botID) {
          var uri = '/app/bots/' + botID + '/hash';
          var method ='sdk.getBotHash';
          return sdk.apiCall(method, uri, 'get', {}, true);
        };

        sdk.createBot = function(customerId, bot) {
            return sdk.v2('/api/v2/customers/' + customerId + '/bots', 'post', bot, true);
        };

        sdk.removeBot = function(bot) {
            return sdk.v2('/api/v2/customers/' + bot.customerId + '/bots/'+bot._id, 'delete', {}, true);
        };

        sdk.updateBot = function(bot) {
            // const method = "sdk.updateBot";
            // var uri = AUTH_SERVICE + '/bots/' + bot.id;

            var opts = {
                name: bot.name,
                description: bot.description,
                // platform: bot.platform,
                console_enabled: bot.console_enabled,
                settings: bot.settings,
            }

            return sdk.v2('/api/v2/bots/' + bot._id, 'put', opts, true);
        }

        sdk.resetToken = function(bot_id) {

          return sdk.v2('/api/v2/bots/' + bot_id + '/resetToken', 'put',{}, true);
        };

        // FIX THIS
        // this should only return customers in which userId is an ADMIN
        // but since we do not currently have the role stored... there's no way to do this!
        sdk.getCustomersByAdmin = function(userId) {
            return sdk.v2('/api/v2/users/' + userId + '/customers','get',{},true);
        };

        sdk.getCustomersByUser = function(userId) {
            return sdk.v2('/api/v2/users/' + userId + '/customers','get',{},true);
        };

        sdk.updateCustomer = function(customer) {
            const method = "sdk.updateCustomer";
            var uri = AUTH_SERVICE + '/customers/' + customer._id;
            var opts = {
                name: customer.name,
                description: customer.description,
                invitationSent: customer.invitationSent,
                avatarURL: customer.avatarURL,
                settings: customer.settings,
            }

            return sdk.v2('/api/v2/customers/' + customer._id,'put',opts,true);
        }

        //======================================================================
        // commandService
        //======================================================================
        sdk.getCommandById = function(botId, id) {
            return sdk.v2('/api/v1/commands/name','post',{command: id}, true);
        };

        sdk.getCommandByName = function(botId, id) {
            return sdk.v2('/api/v1/commands/name','post',{command: id}, true);
        };


        sdk.getCommandsByBot = function(id) {

            return sdk.v2('/api/v1/commands/list','get',{}, true);

        };

        sdk.addCommand = function(command) {
            return sdk.v2('/api/v2/bots/' + command.botId+'/commands','post',command, true);
        };

        sdk.removeCommand = function(bot_id, command) {
          const method = "sdk.removeCommand";
          command.deleted = true;
          // return sdk.v2('/api/v2/commands/' + command._id,'put',{deleted:true}, true);
          var uri = '/api/v2/bots/' + bot_id + '/commands/' + command._id;
          return sdk.v2(uri, 'put',{deleted:true}, true);
        };

        sdk.saveCommand = function(command) {
          const method = "sdk.saveCommand";

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

                  // console.log('clean: ', clean_script[t].script[m]);

                  // remove selectable threads from the complete actions
                  var last_script = clean_script[t].script[clean_script[t].script.length-1]
                  if(last_script.action === "execute_script"){
                    if(last_script.selected_scripts_threads){
                      delete last_script.selected_scripts_threads
                    }
                  }

                  // console.log('last_script: ', last_script);
              }
          }


          cloned.script = clean_script;
          // console.log('cloned.script: ', cloned.script);

          return sdk.v2('/save','post',cloned, true);

        };

        return sdk;
    }]);
