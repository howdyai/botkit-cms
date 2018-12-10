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
