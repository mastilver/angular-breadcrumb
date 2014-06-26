/*! angular-breadcrumb - v0.2.2-dev-2014-06-26
* https://github.com/ncuillery/angular-breadcrumb
* Copyright (c) 2014 Nicolas Cuillery; Licensed MIT */

(function (window, angular, undefined) {
function isAOlderThanB(scopeA, scopeB) {
    if(angular.equals(scopeA.length, scopeB.length)) {
        return scopeA > scopeB;
    } else {
        return scopeA.length > scopeB.length;
    }
}

function $Breadcrumb() {

    var $$options = {
        prefixStateName: null,
        template: 'bootstrap3',
        templateUrl: null
    };

    this.setOptions = function(options) {
        angular.extend($$options, options);
    };

    this.$get = ['$state', '$rootScope', '$interpolate', function($state, $rootScope, $interpolate) {

        var $lastViewScope = $rootScope,
            $statesChain = [];


        // Early catch of $viewContentLoaded event
        $rootScope.$on('$viewContentLoaded', function (event) {
            // With nested views, the event occur several times, in "wrong" order
            if(isAOlderThanB(event.targetScope.$id, $lastViewScope.$id)) {
                $lastViewScope = event.targetScope;
            }


            var currentParentStates = [],
                previousParentStates = angular.copy($statesChain).reverse();

            // Fill the two arrays with parents state (from current state to root)
            for(var state = $state.$current.self; state && state.name !== ''; state=$$breadcrumbParentState(state)) {
                currentParentStates.push(angular.copy(state));
            }

            // There is no need to find the root state if one of the array is empty
            if(currentParentStates.length !== 0 && previousParentStates.length !== 0)
            {
                var iC = 0,
                    iP = 0;

                // TODO: clean/reduce the while loop
                // TODO: a for loop might be better
                // Find the index of the root state in the two arrays
                while(currentParentStates[iC].name !== previousParentStates[iP].name)
                {
                    iP += 1;

                    if(iP === previousParentStates.length)
                    {
                        // the root state haven't been found
                        if(++iC === currentParentStates.length) {
                            break;
                        }

                        iP = 0;
                    }
                }

                // If a root state have been found
                if(iC !== currentParentStates.length)
                {
                    // states to be deleted
                    currentParentStates = currentParentStates.slice(0, iC);

                    // states to be added
                    previousParentStates = previousParentStates.slice(0, iP);
                }
            }

            var i;
            for(i = 0; i < previousParentStates.length; i++)
            {
                $$deleteStateInChain($statesChain, previousParentStates[i]);
            }

            for(i = currentParentStates.length - 1; i >= 0; i--)
            {
                $$addStateInChain($statesChain, currentParentStates[i]);
            }
        });

        // Check if a property in state's data is its own
        var $$isStateDataProperty = function(state, property) {
            if(!state.data || !state.data[property]) {
                return false;
            }

            var parentState = $$parentState(state);
            return !(parentState && parentState.data && parentState.data[property] && state.data[property] === parentState.data[property]);
        };

        // Get the parent state
        var $$parentState = function(state) {
            var name = state.parent || (/^(.+)\.[^.]+$/.exec(state.name) || [])[1];
            return name && $state.get(name);
        };

        // Add the state in the chain if not already in and if not abstract
        var $$addStateInChain = function(chain, state) {
            state.ncyBreadcrumbLink = $state.href(state.name);

            if (state.data && state.data.ncyBreadcrumbLabel) {
                var interpolationFunction = $interpolate(state.data.ncyBreadcrumbLabel);
                $lastViewScope.$watch(interpolationFunction, function(label) {
                    state.ncyBreadcrumbLabel= label;
                });
            } else {
                state.ncyBreadcrumbLabel = state.name;
            }

            for(var i=0, l=chain.length; i<l; i+=1) {
              if (chain[i].name === state.name) {
                return;
              }
            }

            if(!state.abstract && !$$isStateDataProperty(state, 'ncyBreadcrumbSkip')) {
                chain.push(state);
            }
        };

        var $$deleteStateInChain = function(chain, state) {
            for(var i = 0, l = chain.length; i < l; i++) {
                if(state.name === chain[i].name && state.name !== $$options.prefixStateName) {
                    chain.splice(i, 1);
                    break;
                }
            }
        };

        // Get the state for the parent step in the breadcrumb
        var $$breadcrumbParentState = function(state) {
            if($$isStateDataProperty(state, 'ncyBreadcrumbParent')) {
                return $state.get(state.data.ncyBreadcrumbParent);
            }

            return $$parentState(state);
        };

        // Adding the root state
        if($$options.prefixStateName) {
            var prefixState = $state.get($$options.prefixStateName);
            if(!prefixState) {
                throw 'Bad configuration : prefixState "' + $$options.prefixStateName + '" unknown';
            }

            $$addStateInChain($statesChain, prefixState);
        }

        return {

            getTemplate: function(templates) {
                if($$options.templateUrl) {
                    // templateUrl takes precedence over template
                    return null;
                } else if(templates[$$options.template]) {
                    // Predefined templates (bootstrap, ...)
                    return templates[$$options.template];
                } else {
                    return $$options.template;
                }
            },

            getTemplateUrl: function() {
                return $$options.templateUrl;
            },

            getStatesChain: function() {
                return $statesChain;
            },
        };
    }];
}

function BreadcrumbDirective($breadcrumb) {
    this.$$templates = {
        bootstrap2: '<ul class="breadcrumb">' +
            '<li ng-repeat="step in steps | limitTo:(steps.length-1)">' +
            '<a href="{{step.ncyBreadcrumbLink}}">{{step.ncyBreadcrumbLabel}}</a> ' +
            '<span class="divider">/</span>' +
            '</li>' +
            '<li ng-repeat="step in steps | limitTo:-1" class="active">' +
            '<span>{{step.ncyBreadcrumbLabel}}</span>' +
            '</li>' +
            '</ul>',
        bootstrap3: '<ol class="breadcrumb">' +
            '<li ng-repeat="step in steps" ng-class="{active: $last}" ng-switch="$last">' +
            '<a ng-switch-when="false" href="{{step.ncyBreadcrumbLink}}">{{step.ncyBreadcrumbLabel}}</a> ' +
            '<span ng-switch-when="true">{{step.ncyBreadcrumbLabel}}</span>' +
            '</li>' +
            '</ol>'
    };

    return {
        restrict: 'AE',
        replace: true,
        scope: {},
        template: $breadcrumb.getTemplate(this.$$templates),
        templateUrl: $breadcrumb.getTemplateUrl(),
        link: {
            post: function postLink(scope) {
                scope.steps = $breadcrumb.getStatesChain();
            }
        }
    };
}
BreadcrumbDirective.$inject = ['$breadcrumb'];

angular.module('ncy-angular-breadcrumb', ['ui.router.state'])
    .provider('$breadcrumb', $Breadcrumb)
    .directive('ncyBreadcrumb', BreadcrumbDirective);
})(window, window.angular);
