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
