// angular.module('botkit.scriptui',[]).
//     directive('scriptui', ['$cookies', function($cookies) {
//       return {
//           restrict: 'A',
//           scope: {
//               'script': '=',
//               'features': '='
//           },
//           templateUrl: '/js/partials/scriptui.html',
//           controller: ['$scope','$sce', '$location', '$anchorScroll', function($scope,$sce,$location, $anchorScroll) {
//
//               $scope.mode = 'script';
//
//
//
//               $scope.addAlternate = function(line) {
//                   line.text.push('...');
//               };
//
//               $scope.deleteAlternate = function(line, index) {
//                   line.text.splice(index,1);
//               };
//
//               $scope.addAttachment = function(msg) {
//                   if (!msg.attachments) {
//                       msg.attachments = [];
//                   }
//
//                   msg.attachments.push({
//                       actions:[],
//                       fields: [],
//                   });
//
//                   $scope.$emit('scriptui-save');
//
//               }
//
//               $scope.deleteAttachment = function(message, index) {
//                   message.attachments.splice(index,1);
//                   $scope.$emit('scriptui-save');
//
//               }
//
//               $scope.deleteButton = function(attachment, index) {
//                   attachment.actions.splice(index,1);
//                   $scope.$emit('scriptui-save');
//
//               }
//
//               $scope.deleteField = function(attachment, index) {
//                   attachment.fields.splice(index,1);
//                   $scope.$emit('scriptui-save');
//
//               }
//
//
//
//
//               $scope.setTopic = function(topic) {
//
//                   var current = $scope.topic ? $scope.topic.topic : '';
//                   if (current == topic && topic != 'default') {
//                       // no change
//                       return;
//                   }
//
//                   for (var t = 0; t < $scope.script.script.length; t++) {
//                       // reset editable status
//                       $scope.script.script[t].editable = false;
//
//                       if ($scope.script.script[t].topic == topic) {
//                           $scope.topic = $scope.script.script[t];
//                       }
//                   }
//
//
//                   $scope.$emit('scriptui-topicset', $scope.topic);
//                   $scope.processGroups();
//               };
//
//               $scope.toggleQuestion = function(line) {
//                   if (line.collect) {
//                       line.collect = null;
//                   } else {
//                       $scope.convertToQuestion(line);
//                   }
//
//                   $scope.processGroups();
//               };
//
//               $scope.listVariables = function() {
//
//                   return new Promise(function(resolve, reject) {
//
//                       var vars = {};
//
//                       for (var t = 0; t < $scope.script.script.length; t++) {
//
//                           var topic = $scope.script.script[t];
//                           for (var l = 0; l < topic.script.length; l++) {
//                               if (topic.script[l].collect) {
//                                   vars[topic.script[l].collect.key] = 1;
//                               }
//                           }
//                       }
//
//                       var list = [];
//                       for (var key in vars) {
//                           list.push(key);
//                       }
//                       resolve(list);
//
//                   });
//               };
//
//               $scope.convertToQuestion = function(line) {
//
//                   $scope.listVariables().then(function(keys) {
//
//                       var keyname = null;
//
//                       // if a list of predefined variables is NOT present, autogenerate
//                       if (!$scope.script.variables) {
//                           // generate a new key name
//                           keyname = 'question_' + (keys.length + 1);
//
//                           // ensure it is unique (maybe someone deleted another question)
//                           var cursor = keys.length;
//                           while (keys.filter(function(i) { return (i == keyname) }).length) {
//                               cursor++;
//                               keyname = 'question_' + (cursor + 1);
//                           }
//                       }
//
//                       line.collect = {
//                           key: keyname,
//                           options: [
//                               {
//                                   default: true,
//                                   pattern: 'default',
//                                   action: 'next'
//                               }
//                           ]
//                       };
//
//                       line.focused_user = true;
//                       $scope.$apply();
//                       //$scope.focusUser(line);
//                       $scope.processGroups();
//                   });
//
//               };
//
//               $scope.removeOption = function(line, index) {
//                   line.collect.options.splice(index,1);
//               };
//
//               $scope.addLine = function(new_line) {
//                   if (new_line) {
//                       // add the line of dialog
//
//                       var msg = {
//                           text: [new_line],
//                       };
//
//                       if (msg.text[0].match(/\?$/i)) {
//                           $scope.convertToQuestion(msg);
//                         //   msg.collect = {
//                         //       options: [{
//                         //          default: true,
//                         //          action: 'next',
//                         //      }]
//                         //  }
//                       }
//
//                       $scope.topic.script.splice(-1,0,msg);
//
//                       $scope.processGroups();
//
//                       // scroll this card into view
//                       $location.hash('card' + ($scope.topic.script.length - 1));
//                       $anchorScroll();
//
//                   }
//               };
//
//               $scope.removeLineAt = function(index) {
//                   if (confirm('Remove this line?')) {
//                       $scope.topic.script.splice(index,1);
//                       $scope.processGroups();
//                       //$scope.$apply();
//                   };
//               };
//
//               $scope.addLineAt = function(index, text) {
//                   if ($scope.unfocus()) {
//                       $scope.topic.script.splice(index,0,{
//                           text: [text || ''],
//                       });
//                       $scope.processGroups();
//
//                       $scope.focus($scope.topic.script[index]);
//                   }
//               };
//
//             //   $scope.triggerKeypress = function(e) {
//             //       if (e.keyCode == 13) {
//             //           $scope.addTrigger();
//             //           e.preventDefault();
//             //           return false;
//             //       }
//             //   };
//
//             //   $scope.addTrigger = function() {
//               //
//             //       if ($scope.new_trigger_pattern && $scope.new_trigger_type) {
//               //
//             //           if (!$scope.script.triggers) {
//             //               $scope.script.triggers = [];
//             //           }
//               //
//             //           $scope.script.triggers.push({
//             //               pattern: $scope.new_trigger_pattern,
//             //               type: $scope.new_trigger_type,
//             //           });
//               //
//             //           $scope.save();
//               //
//             //           $scope.new_trigger_pattern = '';
//             //       } else {
//             //           alert('Please specify a trigger pattern');
//             //       }
//               //
//             //   };
//               //
//             //   $scope.deleteTrigger = function(index) {
//             //       if (confirm('Remove this trigger?')) {
//             //           $scope.script.triggers.splice(index,1);
//             //           $scope.save();
//             //       }
//             //   }
//
//               $scope.rendered = function(txt) {
//                   var rendered = txt.replace(/\{\{([\w\.\_\d]+)\}\}/igm, '<span class=\"variable\">$1</span>');
//                   rendered = rendered.replace(/\{(.*?)\}/igm,function(matches) {
//
//                       var options = matches.replace(/^\{/,'').replace(/\}$/,'').split('|');
//                       return '<span class="list">' + options[0] + '</span>';
//
//                   }); // "<span class=\"list\">One of: ($1)</span>");
//
//                   return $sce.trustAsHtml(rendered);
//               };
//
//               $scope.navigate = function(branch, $event) {
//                   $event.stopPropagation();
//                   if (branch == 'stop' || branch == 'next' || branch == 'repeat' || branch == 'complete') {
//                       return;
//                   } else {
//                       $scope.setTopic(branch);
//                   }
//               }
//
//               $scope.renderOption = function(option,count) {
//
//                   var rendered = '';
//
//                   if (option.default) {
//                       if (count==1) {
//                           rendered = '...and then ';
//                       } else {
//                           rendered = '...otherwise, ';
//                       }
//                   } else {
//                       rendered = '...and if bot hears "' + option.pattern + '," ';
//                   }
//
//                   switch (option.action) {
//
//                       case 'next':
//                           rendered = rendered + ' <span class="bold">continue to next message</span>';
//                           break;
//                       case 'stop':
//                           rendered = rendered + ' <span class="bold">stop: mark failed</span>';
//                           break;
//                       case 'timeout':
//                           rendered = rendered + ' <span class="bold">stop: mark timed out</span>';
//                           break;
//                       case 'repeat':
//                           rendered = rendered + ' <span class="bold">repeat this line</span>';
//                           break;
//                       case 'complete':
//                           rendered = rendered + ' <span class="bold">stop: mark successful</span>';
//                           break;
//                       default:
//                           rendered = rendered + ' <span class="bold">jump to thread </span><span class="branch-title">' + option.action +'</span>';
//                   }
//
//
//
//                   return $sce.trustAsHtml(rendered);
//               }
//
//               $scope.renderLastAction = function(action) {
//
//                   var rendered = 'And then, ';
//                   switch (action) {
//
//                       case 'next':
//                           rendered = rendered + ' <span class="bold">continue to next message</span>';
//                           break;
//                       case 'stop':
//                           rendered = rendered + ' <span class="bold">stop: mark failed</span>';
//                           break;
//                       case 'timeout':
//                           rendered = rendered + ' <span class="bold">stop: mark timed out</span>';
//                           break;
//                       case 'repeat':
//                           rendered = rendered + ' <span class="bold">repeat this line</span>';
//                           break;
//                       case 'complete':
//                           rendered = rendered + ' <span class="bold">stop: mark successful</span>';
//                           break;
//                       default:
//                           rendered = rendered + ' <span class="bold">jump to thread <span class="branch-title">' + action +'</span></span>';
//                   }
//                   return $sce.trustAsHtml(rendered);
//               }
//
//               $scope.removeAction = function(line) {
//                   delete(line.action);
//               };
//
//               $scope.isUniqueBranch = function(name) {
//
//                   for (var t = 0; t < $scope.script.script.length; t++) {
//                       if ($scope.script.script[t].topic == name) {
//                           return false;
//                       }
//                   }
//
//                   return true;
//               };
//
//               $scope.addBranchAsAction = function(newbranch, line) {
//
//                   if ($scope.isUniqueBranch(newbranch)) {
//                       $scope.script.script.push({
//                           topic: newbranch,
//                           script: [
//                               {
//                                   text: ['This is ' + newbranch],
//                               },
//                               {
//                                   action: 'complete',
//                               }
//                           ]
//                       });
//
//                       line.action = newbranch;
//                   } else {
//                       alert('That thread name is already in use');
//                   }
//               };
//
//
//               $scope.unfocus = function() {
//                   for (var l = 0; l < $scope.topic.script.length; l++) {
//                       // WAIT!!! Does this script have text?
//                       // if not, do not allow it to be collapsed.
//                       if ($scope.topic.script[l].focused && $scope.topic.script[l].text && !$scope.topic.script[l].text[0]) {
//                           $scope.topic.script[l].invalid = true;
//                           return false;
//                       }
//                       $scope.topic.script[l].invalid = false;
//
//                       // does it have a proper variable name?
//                       if ($scope.topic.script[l].focused_user && $scope.topic.script[l].collect && !$scope.topic.script[l].collect.key) {
//                           $scope.topic.script[l].invalid_key = true;
//                           return false;
//                       }
//                       $scope.topic.script[l].invalid_key = false;
//
//                       // are all options proper?
//                       //
//                       if ($scope.topic.script[l].focused_user && $scope.topic.script[l].collect && $scope.topic.script[l].collect.options && $scope.topic.script[l].collect.options.length) {
//                         var options_valid = true;
//                         for (var o = 0; o < $scope.topic.script[l].collect.options.length; o++) {
//                               if (
//                                   !$scope.topic.script[l].collect.options[o].default &&
//                                   (!$scope.topic.script[l].collect.options[o].pattern || !$scope.topic.script[l].collect.options[o].action)
//                               ) {
//                                   $scope.topic.script[l].collect.options[o].invalid = true;
//                                   options_valid = false;
//                               } else {
//                                   delete($scope.topic.script[l].collect.options[o].invalid);
//                               }
//                           }
//
//                           if (!options_valid) {
//                               return false;
//                           }
//                       }
//
//
//                       $scope.topic.script[l].focused = false;
//                       $scope.topic.script[l].focused_user = false;
//                   }
//                 //   getVariableList($scope.script.script).then(function(tokens) {
//                 //       $scope.variable_tokens = tokens;
//                 //       $scope.$apply();
//                 //   });
//
//                   return true;
//
//               }
//
//               $scope.focus = function(line) {
//                   if (!line.focused) {
//                       if ($scope.unfocus()) {
//                           line.focused = true;
//                       }
//                   }
//               };
//
//               $scope.focusUser = function(line) {
//                   if (!line.focused_user) {
//                       if ($scope.unfocus()) {
//                           line.focused_user = true;
//                       }
//                   }
//               };
//
//
//               $scope.blur = function(line) {
//                   line.focused = false;
//               };
//
//               $scope.setHelp = function(help_topic) {
//                   $scope.$emit('scriptui-help',help_topic);
//               }
//
//               $scope.processGroups = function() {
//
//                   var in_group = false;
//
//                 // add classes to groupings of messages so they can be presented slightly differently
//                 // basically we want to hide the bot icon til the last message if he is sending more than one
//                 //
//                 for (var m = 0; m < $scope.topic.script.length; m++) {
//                     $scope.topic.script[m].first_in_group = false;
//                     $scope.topic.script[m].last_in_group = false;
//                     $scope.topic.script[m].middle_of_group = false;
//
//                     if (!in_group) {
//                         $scope.topic.script[m].first_in_group = true;
//                         in_group = true;
//                     }
//
//                     if ($scope.topic.script[m].collect ||
//                     (m == $scope.topic.script.length - 2)) { // why -2? final action counts
//                         $scope.topic.script[m].last_in_group = true;
//                         in_group = false;
//
//                     }
//
//                     if (in_group && !$scope.topic.script[m].first_in_group && !$scope.topic.script[m].last_in_group) {
//                         $scope.topic.script[m].middle_of_group = true;
//                     }
//
//                 }
//
//             }
//
//               $scope.$on('scriptui-blur',function() {
//                   $scope.unfocus();
//               });
//
//               $scope.$on('scriptui-addline',function($event,new_line) {
//
//                   console.log('ADDING A NEW LINE');
//                   $scope.addLine(new_line);
//
//               });
//
//               $scope.$on('scriptui-settopic',function($event,topic) {
//                   $scope.setTopic(topic);
//               });
//
//               $scope.setTopic('default');
//
//
//           }],
//       }
//   }]);
