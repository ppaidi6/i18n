(function () {
  'use strict';

  /**
   * @ngdoc directive
   * @name vManage.directive:policyRule
   * @requires notification
   * @requires $compile
   * @requires $templateCache
   * @requires $timeout
   * @requires appUtil
   * @requires AppAppFamilyListManager
   * @requires ColorListManager
   * @requires DataPrefixListManager
   * @requires MirrorListManager
   * @requires PolicerListManager
   * @requires TLOCListManager
   * @requires VPNListManager
   * @requires SLAClassListManager
   * @requires SiteListManager
   * @requires PrefixListManager
   * @requires ASPathListManager
   * @requires CommunityListManager
   * @requires ExtCommunityListManager
   * @requires VedgeRoutePolicyRule
   * @requires policyConstants
   * @requires colors
   * @requires setServiceTypes
   * @requires policyRuleCarrier
   * @requires policyRuleOrigin
   * @requires policyRuleOriginVedge
   * @requires PLP
   * @requires DNS
   * @requires tlocEncap
   * @requires tlocActions
   * @description directive for policy rule actions - present in custom control, app route and data policies
   *
   * Copyright (c) 2017 Viptela Inc.
   * All rights reserved.
   */
  angular.module('vManage').directive('policyRule', policyRule);
  policyRule.$inject = ['notification', '$compile', '$templateCache', '$timeout', 'appUtil', 'AppAppFamilyListManager', 'ColorListManager', 'DataPrefixListManager', 'PolicerListManager', 'TLOCListManager', 'VPNListManager', 'SLAClassListManager', 'SiteListManager', 'RegionListManager', 'PrefixListManager', 'ASPathListManager', 'CommunityListManager', 'ExtCommunityListManager', 'VedgeRoutePolicyRule', 'policyConstants', 'MirrorListManager', 'colors', 'setServiceTypes', 'policyRuleCarrier', 'policyRuleOrigin', 'policyRuleOriginVedge', 'PLP', 'DNS', 'destinationRegions', 'tlocEncap', 'tlocActions', 'ClassMapListManager', 'AppProtocolListManager', 'FirewallApplicationListManager', 'ApplicationFirewallPolicyRule', 'ServiceChainingPolicyRule', 'ACLv4PolicyRule', 'ACLv6PolicyRule', 'DeviceACLv4PolicyRule', 'DeviceACLv6PolicyRule', '$q', 'AppRoutePolicyRule', 'icmpMessages', 'ServiceAreas', 'PolicyPathTypes', 'PolicyTrafficTo', 'PolicyRegionRoles', 'TrafficCategories', 'policyService', 'PreferredColorListManager', '$translate'];

  function policyRule(notification, $compile, $templateCache, $timeout, appUtil, AppAppFamilyListManager, ColorListManager, DataPrefixListManager, PolicerListManager, TLOCListManager, VPNListManager, SLAClassListManager, SiteListManager, RegionListManager, PrefixListManager, ASPathListManager, CommunityListManager, ExtCommunityListManager, VedgeRoutePolicyRule, policyConstants, MirrorListManager, colors, setServiceTypes, policyRuleCarrier, policyRuleOrigin, policyRuleOriginVedge, PLP, DNS, destinationRegions ,tlocEncap, tlocActions, ClassMapListManager, AppProtocolListManager, FirewallApplicationListManager, ApplicationFirewallPolicyRule, ServiceChainingPolicyRule, ACLv4PolicyRule, ACLv6PolicyRule, DeviceACLv4PolicyRule, DeviceACLv6PolicyRule, $q, AppRoutePolicyRule, icmpMessages, ServiceAreas, PolicyPathTypes, PolicyTrafficTo, PolicyRegionRoles, TrafficCategories, policyService, PreferredColorListManager, $translate) {

    var elem = {}, initialCollapseHeight, mainRuleTableHeight = 105;
    const LOAD_BALANCE = 'loadBalance';
    let serviceChainTypes = policyConstants.supportedSCNumbers;
    policyService.getAllServiceChains().then((response)=>{
      response?.forEach(service_=>{
          let serviceChainNumber = service_.serviceChainNumber,
          serviceChainName = service_.serviceChainName || "";
          serviceChainTypes.forEach((scObject,index,scList)=>{
            if(scObject.key === serviceChainNumber && !!serviceChainName){
              scList[index].name = scList[index].name +` (${serviceChainName})`;
            }
          });
      });
      window.sessionStorage.setItem('available_sc_types', JSON.stringify(serviceChainTypes));
    }, function (errMsg) {
        if (angular.isObject(errMsg) && appUtil.checkNestedProperty(errMsg, 'error', 'details')) {
          $log.error(errMsg.error.message + ':' + errMsg.error.details);
          notification.error(errMsg.error.message + ': ' + errMsg.error.details);
        } else {
          $log.info('API error : unable to fetch service chain details');
        }
    });

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#checkAndUpdateHeight
     * @params{Element} $element
     * @params{Scope} $scope
     * @protected
     * @returns {Void}
     * @description method to update height. Called upon drag and drop
     */
    function checkAndUpdateHeight($element, $scope) {
      var matchHeightPromise = $q(function (resolve) {
        var ruleMatchElement = $element.find('.policy-rule-match').not('.readonly');

        ruleMatchElement.ready(function () {
          var matchHeight = ruleMatchElement.height();
          resolve(matchHeight);
        });
      });

      var actionHeightPromise = $q(function (resolve) {
        var ruleActionElement = $element.find('.policy-rule-action').not('.readonly');

        ruleActionElement.ready(function () {
          var actionHeight = ruleActionElement.height();
          resolve(actionHeight);
        });
      });
      $q.all([matchHeightPromise, actionHeightPromise]).then(function (results) {
        var maxHeight = Math.max(results[0], results[1]);
        $element.find('.policy-rule-main').height(maxHeight + 30);
        if ($scope.rule.showM365Edit) {
          $element.find('.policy-rule-main').height(230);
        }
        $scope.rule.size = maxHeight + 115;
        $scope.$emit('vsRepeatTrigger');
      });
    }

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#checkAndUpdateReadonlyHeight
     * @params{Element} $element
     * @params{Scope} $scope
     * @protected
     * @returns {Void}
     * @description method to update height when in readonly mode.
     */
    function checkAndUpdateReadonlyHeight($element, isCollapse, $scope) {
      $timeout(function () {
        // --------- empty state when user creates a local object then saves to sequence rules list ----------
        if (!$scope.rule) {
          return false;
        }
        if (($element.find('.policy-rule-row.readonly').height() + 10) > mainRuleTableHeight) {
          $scope.collapseDiv.show = true;
        }
        if (isCollapse) {
          $element.find('.policy-rule-row.readonly').height(mainRuleTableHeight);
          $scope.rule.size = mainRuleTableHeight + 5;
        }
        else {
          $element.find('.policy-rule-row.readonly').height('auto');
          var collapseHeight = Math.max($element.find('.policy-rule-match.readonly').height(), $element.find('.policy-rule-action.readonly').height());
          $element.find('.policy-rule-row.readonly').height(collapseHeight + 28);
          $scope.rule.size = collapseHeight + 35;
        }
        $scope.$emit('vsRepeatTrigger');
      });
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#addModelController
     * @params{Element} $element
     * @params{Scope} $scope
     * @params{Element} ruleElement
     * @protected
     * @returns {Void}
     * @description method to add model controller for form validation purposes
     */
    function addModelController($element, $scope, ruleElement) {
      if (angular.isDefined(ruleElement) && !appUtil.isUndefinedOrEmpty($scope.policyRuleForm)) {
        var modelCtrl = undefined;
        angular.forEach($(ruleElement.lastChild).find('input'), function (inputField) {
          modelCtrl = $(inputField).controller('ngModel');
          if (angular.isUndefined($scope.policyRuleForm[modelCtrl['$name']])) {
            $scope.policyRuleForm.$addControl($(inputField).controller('ngModel'));
          }
        })
      }
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#removeModelController
     * @params{Element} $element
     * @params{Scope} $scope
     * @params{Element} ruleElement
     * @protected
     * @returns {Void}
     * @description method to remove model controller for avoiding form validation
     */
    function removeModelController($element, $scope, ruleElement) {
      var ngModelName;
      var formCtrlModels = Object.keys($scope.policyRuleForm).filter(function (key) {
        return key.indexOf('$') !== 0;
      });

      if (angular.isDefined(ruleElement)) {
        angular.forEach($element.find(ruleElement).find('input'), function (inputField) {
          ngModelName = inputField.name;
          $scope.policyRuleForm.$removeControl($(inputField).controller('ngModel'));
          if (angular.isDefined($(inputField).controller('ngModel')) && formCtrlModels.indexOf(ngModelName) > -1) {
            delete $scope.policyRuleForm[ngModelName];
          }
        })
      }
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#compileTemplate
     * @params{String} labelKey
     * @params{String} matchOrAction
     * @params{Element} $element
     * @params{Scope} $scope
     * @protected
     * @returns {Void}
     * @description method to compile a template and append to the element
     */
    function compileTemplate(labelKey, matchOrAction, $element, $scope) {
      var suffix = policyConstants.POLICY_RULES_TEMPLATE_LABEL[labelKey];
      if (angular.equals(matchOrAction.toLowerCase(), 'match')) {

        $element.find('.policy-rule-match').not('.readonly').append($compile($templateCache.get('policyMatch' + suffix))($scope));
        addModelController($element, $scope, $element.find('.policy-rule-match').not('.readonly')[0]);
        checkAndUpdateHeight($element, $scope);
      } else {
        $element.find('.policy-rule-action').not('.readonly').append($compile($templateCache.get('policyAction' + suffix))($scope));
        addModelController($element, $scope, $element.find('.policy-rule-action').not('.readonly')[0]);
        checkAndUpdateHeight($element, $scope);
      }
      //  Class can be match or action. To differentiate, adding keyword match or action for search
      if(labelKey === 'class'){
        labelKey = labelKey + '_' + matchOrAction.toLowerCase();
      }
      if (!($($element).find('.policy-tag.' + labelKey).hasClass("active"))) {
        $($element).find('.policy-tag.' + labelKey).addClass('active');
      }
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#compileTemplate
     * @params{String} labelKey
     * @params{String} matchOrAction
     * @params{Element} $element
     * @params{Scope} $scope
     * @params{number} count
     * @protected
     * @returns {Void}
     * @description method to compile a read only template and append to the element
     */
    function compileReadOnlyTemplate(labelKey, matchOrAction, $element, $scope, count) {
      var suffix = policyConstants.POLICY_RULES_TEMPLATE_LABEL[labelKey];
      initialCollapseHeight = undefined;
      if (angular.equals(matchOrAction.toLowerCase(), 'match')) {
        $element.find('.policy-rule-match.readonly').children('[collapsible]').before($compile($templateCache.get('policyMatch' + suffix + 'Readonly'))($scope));
      } else {
        $element.find('.policy-rule-action.readonly').children('[collapsible]').before($compile($templateCache.get('policyAction' + suffix + 'Readonly'))($scope));
      }
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#compileRulesTemplate
     * @params{String[]} rules
     * @params{String} matchOrAction
     * @params{Element} $element
     * @params{Scope} $scope
     * @params{number} count
     * @protected
     * @returns {Void}
     * @description method to compile a rule template
     */
    function compileRulesTemplate(rules, matchOrAction, $element, $scope, count) {
      angular.forEach(rules, function (matchRule, index) {
        compileTemplate(matchRule, matchOrAction, $element, $scope)
      })
    };

    /**
     * @ngdoc method
     * @name vManage.directive:policyRule#compileReadOnlyRulesTemplate
     * @params{String[]} rules
     * @params{String} matchOrAction
     * @params{Element} $element
     * @params{Scope} $scope
     * @params{number} count
     * @protected
     * @returns {Void}
     * @description method to compile a read only rule template
     */
    function compileReadOnlyRulesTemplate(rules, matchOrAction, $element, $scope, count) {
      angular.forEach(rules, function (matchRule, index) {
        compileReadOnlyTemplate(matchRule, matchOrAction, $element, $scope, angular.isDefined(count) ? count : index)
      });
    };


    function getTransformFqdnListNames(list){
      return _.map(list, function(list){
        if(list.type === "dataPrefix"){
          list.name = list.name.contains("IPv4:")? list.name : ('IPv4:' + list.name);
        } else {
          list.name = list.name.contains("FQDN:")? list.name : ('FQDN:' + list.name);
        }
        return list;
      });
    }


    //--------- MATCH Templates ---------------
    $templateCache.put('policyMatchApp', '<div id="select-rule_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Application/Application Family List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'appList\', \'appList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an application list\'" model-Obj="rule.match.appList" list-items="applicationList.listItems" list-instance = "applicationList" copy-list="true" heading="App List" chip-removable="true" required></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchDnsAppList', '<div id="select-rule_dns_app_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>DNS Application/Application Family List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'dnsAppList\', \'dnsAppList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an application list\'" model-Obj="rule.match.dnsAppList" list-items="dnsApplicationList.listItems" list-instance = "dnsApplicationList" copy-list="true" heading="DNS App List" chip-removable="true" required></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchSaasAppList', '<div id="select-rule_cloud_saas_app_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Cloud Saas Application/Application Family List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'saasAppList\', \'saasAppList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an application list\'" model-Obj="rule.match.saasAppList" list-items="applicationList.saasListItems" list-instance = "applicationList" copy-list="true" heading="Cloud Saas App List" chip-removable="true" add-option="false" required></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchFirewallApplicationList', '<div id="select-rule_firewall_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Application/Application Family List to Drop</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'firewallApplicationList\', \'firewallApplicationList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an application list\'" model-Obj="rule.match.firewallApplicationList" list-items="firewallApplicationList.listItems" list-instance = "firewallApplicationList" copy-list="true" heading="App List" chip-removable="true" required></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchAppProtocol', '<div id="select-rule_app_protocol" class="select-rule"><div class="rule-entry" style="display:flex"><div class="entry-label" style="width:20%;flex:1"><label>Protocol</label></div><div class="entry-input entry-input-height app-protocol" style="padding-right: 10px;width:80%;display:flex"><multi-select-create-chips-drop-down style="display:inline-block;width:45%;margin-right:20px;flex:1" place-holder="\'Select one or more protocol\'" model-Obj="rule.match.appProtocol" list-items="appProtocolListItems" match-property="name" chip-removable="true" copy-list="true" optional="rule.match.appProtocolRange" disabled="rule.match.appProtocolRange || rule.match.destinationPort"></multi-select-create-chips-drop-down><label>OR</label><span style="display:inline-block;width:45%;flex:1"><input style="display:block" placeholder="0-255(Separate by space)" type="text" min="0" max="255" class="form-control inlineBlock" id="protocol_input_range" ng-model="rule.match.appProtocolRange" name="protocolRange" vip-number-list-validation ng-required="rule.match.appProtocol.length < 1 && !rule.match.appProtocol[0].hasOwnProperty(\'name\')" ng-disabled="rule.match.appProtocol.length > 0"><vip-messages element-name="protocolRange" style="display:table"></vip-messages></span></div><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'appProtocol\', \'appProtocol\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div>');
    $templateCache.put('policyMatchDNS', '<div id="select-rule_dns" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label style="margin-right:4px">DNS</label><md-icon style="margin-top:6px; cursor:pointer" md-font-set="material-icons" class="material-icons md-16">info<md-tooltip md-delay="500" md-direction="right">Matching all DNS requests for DNS redirection is not supported on Viptela OS Device models</md-tooltip></md-icon><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'dns\', \'dns\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a DNS\'" model-Obj="rule.match.dns" list-items="dnsList" chip-removable="true" copy-list="true"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchServiceArea', '<div id="select-rule_service_area" class="select-rule"> <div class="rule-entry" ng-if="!rule.showM365Edit"> <div class="entry-label"><label>Service Area: </label></div> <div class="entry-input" style="width: 50%"><label style="font-size: 12px;font-weight: normal;"><span ng-repeat="serviceArea in rule.match.serviceArea">{{serviceArea.name}}<span ng-if="!$last">, </span></span></label></div> </div> <div class="rule-entry" ng-if="rule.showM365Edit"> <div class="entry-label long-name"><label>Service Area: </label></div> <div class="entry-input" style="width: 90%"> <multi-select-create-chips-drop-down place-holder="\'Select a Service Area\'" model-Obj="rule.match.serviceArea" create-option="false" list-items="serviceAreaList" match-property="name" chip-removable="true" copy-list="true" preview="true"></multi-select-create-chips-drop-down> </div> </div> <div class="divider"></div></div>');
    $templateCache.put('policyMatchDSCP', '<div id="select-rule_dscp" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>DSCP</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'dscp\', \'dscp\')"><span class="inlineBlock  material-icons md-16 icon-grey">close</span></a></div><div class="entry-input entry-input-height long-name"><input type="text" placeholder="0-63" class="form-control inlineBlock wid-100" id="dscp_input" ng-model="rule.match.dscp" name="dscp" vip-number-list-range-validation no-range="true" delimiter="space" data-range="0-63" ng-required="true"><vip-messages element-name="dscp"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchSource', '<div id="select-rule_source" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Source: Port</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'source\', \'source\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input entry-input-height long-name"><input type="text" placeholder="0-65535 (Range or separate by space)" class="form-control inlineBlock wid-100" id="source_port_input" ng-model="rule.match.sourcePort" name="source_port" vip-number-list-range-by-space-validation data-range="0-65535" ng-required="true" ng-if="rule.match.sourcePortDisableRanges !== true"> <input type="text" placeholder="0-65535 (separated by space)" class="form-control inlineBlock" id="source_port_input" ng-model="rule.match.sourcePort" name="source_port" vip-number-list-validation max="65535" ng-required="true" ng-if="rule.match.sourcePortDisableRanges === true"> <vip-messages element-name="source_port"></vip-messages> </div> </div> </div>');
    $templateCache.put('policyMatchDestination', '<div id="select-rule_destination" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Destination: Port</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'destination\', \'destination\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div> <div class="entry-input entry-input-height long-name"><input placeholder="0-65535(Range or separate by space)" type="text" class="form-control inlineBlock wid-100" id="destination_port_input" ng-model="rule.match.destinationPort" name="destination_port" vip-number-list-range-by-space-validation data-range="0-65535" ng-required="true"><vip-messages element-name="destination_port"></vip-messages></div> </div> </div>');
    $templateCache.put('policyMatchDeviceAccessProtocol', '<div id="select-rule_device-access-protocol" class="select-rule"> <div class="rule-entry" style="display: flex;"> <div class="entry-label"><label>Device Access Protocol (required) <md-icon style="margin-top:6px; cursor:pointer" md-font-set="material-icons" class="material-icons md-16">info<md-tooltip md-delay="500" md-direction="right">If only Device Access Protocol is configured in this sequence rule, then the Action(Accept or Drop) should not be same as Default Action for this Policy because it will lead to misconfiguration</md-tooltip></md-icon></label></div> <select style="width: 400px;" ng-model="rule.match.deviceAccessProtocol" ng-options="protocol.value as protocol.key for protocol in rule.match.deviceAccessProtocolOptions" ng-required="true"> </select> </div> </div>');
    $templateCache.put('policyMatchProtocol', '<div id="select-rule_protocol" class="select-rule icmp-content"><div class="rule-entry"><div class="entry-label long-name"><label>Protocol</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'protocol\', \'protocol\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><input placeholder="single value(0-255) or multiple values(separate by space)" type="text" class="form-control inlineBlock wid-100" id="protocol_input" ng-keyup="updateICMP()" ng-model="rule.match.protocol" name="protocol" vip-number-list-range-validation data-range="0-255" no-range="true" delimiter="space" ng-required="true"><vip-messages element-name="protocol"></vip-messages></div></div><div class="rule-entry icmp-content-rule" ng-if="getICMPCriteria()"><div class="entry-label long-name"><label>{{ getICMPTitle() }}</label></div><div class="entry-input long-name multiple-community" ng-init="initICMPMessage()"><div id="icmp_multi_select_component"><multi-select-create-chips-drop-down place-holder="Search" create-option="false" disabled="rule.match.sourcePort || rule.match.destinationPort" model-Obj="rule.match.icmpMessage.lists" list-items="icmpMessageList" match-property="name" copy-list="true" chip-removable="true" heading="ICMP Message"></multi-select-create-chips-drop-down></div></div></div></div>');
    $templateCache.put('policyMatchSourceDataPrefixList', '<div id="select-rule_source_data_prefix" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Source Data Prefix List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'sourceDataPrefixList\', \'sourceDataPrefixList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><div ng-if="rule.sequenceIpType==\'ipv4\'"><select-create-chips-drop-down place-holder="\'Select a data prefix list\'" model-Obj="rule.match.sourceDataPrefixList" list-items="dataPrefixList.prefixListItems" list-instance="dataPrefixList" copy-list="true" chip-removable="true" heading="Prefix List" disabled="rule.match.sourceIp.length > 0" on-select="clearSourceIp"></select-create-chips-drop-down></div><div ng-if="rule.sequenceIpType==\'ipv6\'"><select-create-chips-drop-down place-holder="\'Select a data prefix list\'" model-Obj="rule.match.sourceDataPrefixList" list-items="dataPrefixList.prefixListItems" list-instance="dataPrefixList" copy-list="true" chip-removable="true" heading="Prefix List" disabled="rule.match.sourceIp.length > 0" on-select="clearSourceIp"></select-create-chips-drop-down></div></div></div><div class="rule-entry" ng-init="initSourceIpProtocol()"><div class="entry-label long-name"><label>Source: IP Prefix</label></div><div ng-if="rule.sequenceIpType == \'ipv4\'" class="entry-input long-name"><input ng-if="rule.sourceIpField.setVariable === \'Disabled\' || !rule.sourceIpField.showVariableOption" placeholder="Example: 10.0.0.0/12" type="text" class="form-control inlineBlock wid-100" id="source_ip_input" ng-model="rule.match.sourceIp" name="source_ip" vip-ip-v4-prefix-list-validation ng-disabled="rule.match.sourceDataPrefixList.listId"><input ng-if="rule.sourceIpField.setVariable === \'Enabled\'" placeholder="Variable Name" type="text" class="form-control inlineBlock" id="source_ip_input" ng-model="rule.match.sourceIp" name="source_ip" ng-disabled="rule.match.sourceDataPrefixList.listId"><vip-messages element-name="source_ip"></vip-messages><md-switch ng-show="rule.sourceIpField.showVariableOption" ng-model="rule.sourceIpField.setVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch">Variables: {{ rule.sourceIpField.setVariable }}</md-switch></div><div ng-if="rule.sequenceIpType == \'ipv6\'" class="entry-input long-name"><input ng-if="rule.sourceIpField.setVariable === \'Disabled\' || !rule.sourceIpField.showVariableOption" placeholder="Example: 2001:db8:85a3:8d3:1319:8a2e:370:7348/8" type="text" class="wid-100 form-control inlineBlock" id="source_ip_input" ng-model="rule.match.sourceIp" name="source_ip" vip-ip-v6-prefix-list-validation ng-disabled="rule.match.sourceDataPrefixList.listId"><input ng-if="rule.sourceIpField.setVariable === \'Enabled\'" placeholder="Variable Name" type="text" class="form-control inlineBlock" id="source_ip_input" ng-model="rule.match.sourceIp" name="source_ip" ng-disabled="rule.match.sourceDataPrefixList.listId"><vip-messages element-name="source_ip"></vip-messages><md-switch ng-show="rule.sourceIpField.showVariableOption" ng-model="rule.sourceIpField.setVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch">Variables: {{ rule.sourceIpField.setVariable }}</md-switch></div></div></div></div>');
    $templateCache.put('policyMatchDestinationDataPrefixList', '<div id="select-rule_destination_data_prefix" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Destination Data Prefix List</label ><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'destinationDataPrefixList\', \'destinationDataPrefixList\')" ><span class="inlineBlock material-icons md-16 icon-grey" >close</span ></a ></div><div ng-if="rule.sequenceIpType==\'ipv4\'" class="entry-input long-name"><select-create-chips-drop-down id="destination_data_prefix_dropdown" place-holder="\'Select a data prefix list\'" model-Obj="rule.match.destinationDataPrefixList" list-items="dataPrefixList.prefixListItems" list-instance="dataPrefixList" copy-list="true" chip-removable="true" heading="Prefix List" disabled="rule.match.destinationIp.length > 0" on-select="clearDestinationIp" ></select-create-chips-drop-down></div><div ng-if="rule.sequenceIpType==\'ipv6\'" class="entry-input long-name"><select-create-chips-drop-down id="destination_data_prefix_dropdown" place-holder="\'Select a data prefix list\'" model-Obj="rule.match.destinationDataPrefixList" list-items="dataPrefixList.prefixListItems" list-instance="dataPrefixList" copy-list="true" chip-removable="true" heading="Prefix List" disabled="rule.match.destinationIp.length > 0" on-select="clearDestinationIp" ></select-create-chips-drop-down></div></div><div class="rule-entry" ng-init="initDestIpProtocol()"><div class="entry-label long-name"><label>Destination: IP Prefix</label></div><div ng-if="rule.sequenceIpType == \'ipv4\'" class="entry-input long-name" ><input ng-if="rule.destIpField.setVariable === \'Disabled\'  || !rule.destIpField.showVariableOption" placeholder="Example: 10.0.0.0/12" type="text" class="form-control inlineBlock wid-100" id="destination_ip_input" ng-model="rule.match.destinationIp" name="destination_ip" vip-ip-v4-prefix-list-validation ng-disabled="rule.match.destinationDataPrefixList.listId" /><input ng-if="rule.destIpField.setVariable === \'Enabled\'" placeholder="Variable Name" type="text" class="form-control inlineBlock" id="destination_ip_input" ng-model="rule.match.destinationIp" name="destination_ip" ng-disabled="rule.match.destinationDataPrefixList.listId" /><vip-messages element-name="destination_ip"></vip-messages ><md-switch ng-show="rule.destIpField.showVariableOption" ng-model="rule.destIpField.setVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch" >Variables: {{ rule.destIpField.setVariable }}</md-switch ></div><div ng-if="rule.sequenceIpType == \'ipv6\'" class="entry-input long-name"><input ng-if="rule.destIpField.setVariable === \'Disabled\'  || !rule.destIpField.showVariableOption" placeholder="Example: 2001:db8:85a3:8d3:1319:8a2e:370:7348/8" type="text" class="wid-100 form-control inlineBlock" id="destination_ip_input" ng-model="rule.match.destinationIp" name="destination_ip" vip-ip-v6-prefix-list-validation ng-disabled="rule.match.destinationDataPrefixList.listId" /><input ng-if="rule.destIpField.setVariable === \'Enabled\'" placeholder="Variable Name" type="text" class="form-control inlineBlock" id="destination_ip_input" ng-model="rule.match.destinationIp" name="destination_ip" ng-disabled="rule.match.destinationDataPrefixList.listId" /><vip-messages element-name="destination_ip"></vip-messages ><md-switch ng-show="rule.destIpField.showVariableOption" ng-model="rule.destIpField.setVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch" >Variables: {{ rule.destIpField.setVariable }}</md-switch ></div></div></div>');
    $templateCache.put('policyMatchSourceFqdnListReadonly','<div id="select-rule_source_fqdn" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Source Data Prefix List</label></div> <div class="entry-input long-name" style="width:55%"><span><label>{{getFqdnListNames(rule.match.sourceFqdnList)}}</label></span></div> </div> <div class="rule-entry" ng-if="rule.match.sourceIp && !hasListEnteries(\'sourceFqdnList\', \'dataPrefix\', \'sourceIp\')"> <div class="entry-label"><label flex layout-align="center center" layout="column"> IPv4</label></div> <div class="entry-input" style="width:50%">{{rule.match.sourceIp}}</div> </div> <div class="rule-entry" ng-if="rule.match.sourceFqdn && !hasListEnteries(\'sourceFqdnList\', \'fqdn\', \'sourceFqdn\')"> <div class="entry-label"><label flex layout-align="center center" layout="column"> FQDN</label></div> <div class="entry-input" style="width:50%">{{rule.match.sourceFqdn}}</div> </div> </div>');
    $templateCache.put('policyMatchDestinationFqdnListReadonly','<div id="select-rule_destination_fqdn" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Destination Data Prefix List</label></div> <div class="entry-input long-name" style="width:55%"><span><label>{{getFqdnListNames(rule.match.destinationFqdnList)}}</label></span></div> </div> <div class="rule-entry" ng-if="rule.match.destinationIp && !hasListEnteries(\'destinationFqdnList\', \'dataPrefix\', \'destinationIp\')"> <div class="entry-label"><label flex layout-align="center center" layout="column"> IPv4</label></div> <div class="entry-input" style="width:50%"><label>{{rule.match.destinationIp}}</label></div> </div> <div class="rule-entry" ng-if="rule.match.destinationFqdn && !hasListEnteries(\'destinationFqdnList\', \'fqdn\', \'destinationFqdn\')"> <div class="entry-label"><label flex layout-align="center center" layout="column"> FQDN</label></div> <div class="entry-input" style="width:50%"><label>{{rule.match.destinationFqdn}}</label></div> </div> </div>');
    $templateCache.put('policyMatchPacketLength', '<div id="select-rule_packet_length" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Packet Length</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'packetLength\', \'packetLength\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-65535" type="text" class="form-control inlineBlock" id="packet_length_input" ng-model="rule.match.packetLength" name="packet_length" vip-number-list-range-validation data-range="0-65535" ng-required="true"><vip-messages element-name="packet_length"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchPLP', '<div id="select-rule_plp" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>PLP</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'plp\', \'plp\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a PLP\'" model-Obj="rule.match.plp" list-items="plpList" chip-removable="true" copy-list="true"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchTCP', '<div id="select-rule_tcp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>TCP</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'tcp\', \'tcp\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input type="text" class="form-control inlineBlock" id="tcp_input" ng-model="rule.match.tcp" ng-init="rule.match.tcp = \'syn\'" name="tcp" required disabled><vip-messages element-name="tcp"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchOrigin', '<div id="select-rule_origin" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Origin</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'origin\', \'origin\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select an origin\'" model-Obj="rule.match.origin" list-items="originList" chip-removable="true" copy-list="true" heading="type" create-option="false"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchOriginator', '<div id="select-rule_originator" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Originator</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'originator\', \'originator\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="originator_input" ng-model="rule.match.originator" name="originator" vip-ip-v4-validation required><vip-messages element-name="originator"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchOMPTag', '<div id="select-rule_omp_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OMP Tag</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'ompTag\', \'ompTag\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="omp_tag_input" ng-model="rule.match.ompTag" name="omp_tag" ng-min="0" ng-max="4294967295" required><vip-messages element-name="omp_tag"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchPreference', '<div id="select-rule_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preference</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'preference\', \'preference\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="preference_input" ng-model="rule.match.preference" name="preference" ng-min="0" ng-max="4294967295" required><vip-messages element-name="preference"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchColorList', '<div id="select-rule_color_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Color List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'colorList\', \'colorList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a color list\'" model-Obj="rule.match.colorList" list-items="colorList.listItems" list-instance="colorList" copy-list="true" chip-removable="true" heading="Color List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchSiteList', '<div id="select-rule_site_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label style="margin-right:2px">Site List</label><md-icon style="margin-top:6px; cursor:pointer" md-font-set="material-icons" class="material-icons md-16">info<md-tooltip md-delay="500" md-direction="right">Site and Region are mutually exclusive</md-tooltip></md-icon><a href="" class="close_button inlineBlock pull-right" data-ng-click="rule.siteOrRegionSelected = \'\'; removeElement($event, \'siteList\', \'siteList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a site list\'" model-Obj="rule.match.siteList" list-items="siteList.listItems" list-instance="siteList" copy-list="true" chip-removable="true" heading="Site List" disabled="rule.match.siteId"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Site ID</label></div><div class="entry-input"><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="site_id_input" ng-model="rule.match.siteId" name="site_id" ng-min="0" ng-max="4294967295" ng-disabled="rule.match.siteList.listId"><vip-messages element-name="site_id"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchRegionList', '<div id="select-rule_region_list" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label style="margin-right:2px">Region List</label><md-icon style="margin-top:6px; cursor:pointer" md-font-set="material-icons" class="material-icons md-16">info<md-tooltip md-delay="500" md-direction="right">Site and Region are mutually exclusive</md-tooltip></md-icon><a href="" class="close_button inlineBlock pull-right" data-ng-click="rule.siteOrRegionSelected = \'\'; removeElement($event, \'regionList\', \'regionList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a> </div> <div class="entry-input long-name"> <select-create-chips-drop-down place-holder="\'Select a region list\'" model-Obj="rule.match.regionList" list-items="regionList.listItems" list-instance="regionList" copy-list="true" chip-removable="true" heading="Region List" disabled="rule.match.regionId" on-select="regionList.onRegionSelect"></select-create-chips-drop-down> </div> </div> <div class="rule-entry"> <div style="display: inline-block;width:40%"> <div class="entry-label"><label>Region ID</label></div> <div class="entry-input"> <input placeholder="0-63" type="number" class="form-control inlineBlock" id="region_id_input" ng-model="rule.match.regionId" name="region_id" ng-min="0" ng-max="63" ng-disabled="rule.match.regionList.listId"> <vip-messages element-name="region_id"></vip-messages> </div> </div> <div style="display: inline-block;"> <div class="entry-label" style="width:50%"><label>Role (optional)</label></div> <div class="entry-input"><single-select-chips-drop-down place-holder="\'Select a role\'" list-items="roleList" model-obj="rule.match.role" optional="true"> </single-select-chips-drop-down></vip-messages> </div> </div> </div></div>');
    $templateCache.put('policyMatchPathType', '<div id="select-rule_path_type" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Path Type</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'pathType\', \'pathType\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div> <div class="entry-input long-name"> <single-select-chips-drop-down place-holder="\'Select path type\'" list-items="pathTypeList" model-obj="rule.match.pathType" optional="true"> </single-select-chips-drop-down> </select-create-chips-drop-down> </div> </div></div>');
    $templateCache.put('policyMatchTrafficTo', '<div id="select-rule_traffic_to" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Traffic To</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'trafficTo\', \'trafficTo\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div> <div class="entry-input long-name"> <single-select-chips-drop-down place-holder="\'Select tunnel to\'" list-items="trafficToList" model-obj="rule.match.trafficTo" optional="true"> </single-select-chips-drop-down> </select-create-chips-drop-down> </div> </div></div>');
    $templateCache.put('policyMatchVPNList', '<div id="select-rule_vpn_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>VPN List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'vpnList\', \'vpnList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a vpn list\'" model-Obj="rule.match.vpnList" list-items="vpnList.listItems" list-instance="vpnList" copy-list="true" chip-removable="true" heading="VPN List" disabled="rule.match.vpn"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>VPN ID</label></div><div class="entry-input"><input placeholder="0-65536" type="number" class="form-control inlineBlock" id="vpn_id_input" ng-model="rule.match.vpn" name="vpn_id" ng-min="0" ng-max="65530" ng-disabled="rule.match.vpnList.listId"><vip-messages element-name="vpn_id"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchVPN', '<div id="select-rule_vpn" class="select-rule"> <div class="rule-entry" style="display: flex"> <div class="entry-label"><label>VPN ID</label></div> <div class="entry-input entry-input-height"> <a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'vpn\', \'vpn\')"> <span class="inlineBlock material-icons md-16 icon-grey">close</span> </a> <input required placeholder="0-65536" type="number" class="form-control inlineBlock" ng-model="rule.match.vpn" name="vpn_id" ng-min="0" ng-max="65530" ng-disabled="rule.match.vpnList.listId"> <vip-messages element-name="vpn_id"></vip-messages> </div> </div> </div>');
    $templateCache.put('policyMatchCarrier', '<div id="select-rule_carrier" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Carrier</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'carrier\', \'carrier\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a carrier\'" model-Obj="rule.match.carrier" list-items="carriers" chip-removable="true" copy-list="true" heading="type" create-option="false"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchDomainId', '<div id="select-rule_domain_id" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Domain Id</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'domainId\', \'domainId\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="1-4294967295" type="number" class="form-control inlineBlock" id="domain_id_input" ng-model="rule.match.domainId" name="domain_id" ng-min="0" ng-max="4294967295" required><vip-messages element-name="domain_id"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchGroupId', '<div id="select-rule_group_id" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Group Id</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'groupId\', \'groupId\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="group_id_input" ng-model="rule.match.groupId" name="group_id" ng-min="0" ng-max="4294967295" required><vip-messages element-name="group_id"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchTLOCList', '<div id="select-rule_tloc_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>TLOC List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'tlocList\', \'tlocList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a TLOC list\'" model-Obj="rule.match.tlocList" list-items="tlocList.listItems" list-instance="tlocList" copy-list="true" chip-removable="true" heading="TLOC List" disabled="(rule.match.tloc.ip.length > 0 || rule.match.tloc.color.name || rule.match.tloc.encap.name)"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>TLOC IP</label></div><div class="entry-input"><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="match_tloc_input" ng-model="rule.match.tloc.ip" name="match_tloc_ip" vip-ip-v4-optional-validation is-required="rule.match.tloc.ip.length > 0" ng-disabled="rule.match.tlocList.listId"><vip-messages element-name="match_tloc_ip"></vip-messages></div></div><div class="rule-entry"><div class="entry-label"><label>Color</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select a color list\'"  model-Obj="rule.match.tloc.color" list-items="colors" chip-removable="true" copy-list="true" disabled="rule.match.tlocList.listId"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Encapsulation</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select an encap\'"  model-Obj="rule.match.tloc.encap" list-items="tlocEncapList" chip-removable="true" copy-list="true" disabled="rule.match.tlocList.listId"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchPrefixList', '<div id="select-rule_prefix_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Prefix List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'prefixList\', \'prefixList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div ng-if="rule.sequenceIpType==\'ipv4\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.prefixList" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Prefix List"></select-create-chips-drop-down></div><div ng-if="rule.sequenceIpType==\'ipv6\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.prefixList" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Prefix List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchAddress', '<div id="select-rule_address" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Address</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'address\', \'address\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div ng-if="rule.sequenceIpType==\'ipv4\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.address" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Address"></select-create-chips-drop-down></div><div ng-if="rule.sequenceIpType==\'ipv6\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.address" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Address"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchAsPath', '<div id="select-rule_as_path" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AS Path</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'asPath\', \'asPath\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an AS Path\'" model-Obj="rule.match.asPath" list-items="asPathList.listItems" list-instance="asPathList" copy-list="true" chip-removable="true" heading="AS Path"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchCommunity', '<div id="select-rule_community" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Community</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'community\', \'community\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="divider"></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.type === \'route\'" ng-init="defineCommunityRoute()"><div class="entry-label"><label>Community List</label></div><div class="entry-input multiple-community"><multi-select-create-chips-drop-down place-holder="\'Select a community list\'" model-Obj="rule.match.community.lists" list-items="communityList.listItems" match-property="name"  copy-list="true" chip-removable="true" list-instance="communityList" heading="Community List"></multi-select-create-chips-drop-down></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.type !== \'route\'"><div class="entry-label inlineBlock"><label>Types</label></div><div class="entry-input" ng-init="\'community\'"><md-radio-group ng-model="rule.communityType" layout="row" class="fullWidth" ng-change="changeCommunityType()"><md-radio-button value="community" class="md-primary radio-label" id="community">Standard</md-radio-button><md-radio-button value="expandedCommunity" class="md-primary radio-label" id="expandedCommunity">Expanded</md-radio-button></md-radio-group></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityType === \'community\' && rule.type !== \'route\'"><div class="entry-label inlineBlock"><label>Criteria<md-icon style="margin-left: 3px; padding-top: 3px; color: #00a0d1; cursor: pointer;" md-font-set="material-icons" class="material-icons md-16 cohesion-info-icon"><md-tooltip md-delay="500">The OR condition is applicable across multiple Community Lists and is valid for all device platforms. The AND and EXACT conditions are applicable to only one Community List at a time and is not valid for vEdge device platforms</md-tooltip></md-icon></label></div><div class="entry-input" ng-init="initCommunityObj()" style="width: 55%;" ng-if="rule.type !== \'route\' && rule.communityType === \'community\'""><md-radio-group class=" flexDisplay" ng-model="rule.match.community.matchFlag"><md-radio-button class="md-primary" value="or" style="margin-right: 30px;"> OR </md-radio-button><md-radio-button class="md-primary" value="and" style="margin-right: 30px;"> AND </md-radio-button><md-radio-button class="md-primary" value="exact"> EXACT </md-radio-button></md-radio-group></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityType === \'community\'"><div class="entry-label inlineBlock"><label>Community List</label></div><div class="entry-input multiple-community"><multi-select-create-chips-drop-down place-holder="\'Select a community list\'" model-Obj="rule.match.community.lists" list-items="communityList.listItems" match-property="name" copy-list="true" chip-removable="true" list-instance="communityList" heading="Community List"></multi-select-create-chips-drop-down></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityType === \'expandedCommunity\'"><div class="entry-label inlineBlock"><label>Expanded Community List</label></div><div class="entry-input multiple-community"><multi-select-create-chips-drop-down disabled="rule.communityVariableField.expandedCommunityInline || rule.communityVariableField.matchCommunityVariable == \'Enabled\'" place-holder="\'Select an Expanded Community List\'" model-Obj="rule.match.community.lists" list-items="expandedCommunityList.listItems" match-property="name" copy-list="true" chip-removable="true" list-instance="expandedCommunityList" heading="Expanded Community List"></multi-select-create-chips-drop-down></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityType === \'expandedCommunity\'"><div class="entry-label inlineBlock"><label>Community String: &nbsp;&nbsp;&nbsp;&nbsp;</label></div><div class="entry-input"><input placeholder="Variable Name" type="text" class="form-control inlineBlock" id="community_string_variable" ng-disabled="rule.communityVariableField.matchCommunityVariable == \'Disabled\' || (rule.communityType === \'expandedCommunity\' && rule.match.community.lists.length)" ng-model="rule.communityVariableField.expandedCommunityInline" ng-change="defineCommunityRoute()" name="community_string"><vip-messages element-name="community_string"></vip-messages><md-switch ng-model="rule.communityVariableField.matchCommunityVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch" ng-disabled="rule.match.community.lists && rule.match.community.lists.length">Variables:{{ rule.communityVariableField.matchCommunityVariable }}</md-switch></div></div></div>');
    $templateCache.put('policyMatchExpandedCommunity','<div id="select-rule_expandedCommunity" class="select-rule"><div class="rule-entry"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'expandedCommunity\', \'expandedCommunity\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="rule-entry inline-flex-imp" ng-init="defineExpandedRoute()"><div class="entry-label inlineBlock"><label>Expanded Community List</label></div><div class="entry-input multiple-community"><multi-select-create-chips-drop-down place-holder="\'Select an Expanded community list\'" model-Obj="rule.match.expandedCommunity.lists" list-items="expandedCommunityList.listItems" match-property="name" copy-list="true" chip-removable="true" list-instance="expandedCommunityList" heading="Expanded Community List"></multi-select-create-chips-drop-down></div></div></div>');

    $templateCache.put('policyMatchExtCommunity', '<div id="select-rule_ext_community" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Extended Community List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'extCommunity\', \'extCommunity\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select an extended community list\'" model-Obj="rule.match.extCommunity" list-items="extCommunityList.listItems" list-instance="extCommunityList" copy-list="true" chip-removable="true" heading="Extended Community List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchLocalPreference', '<div id="select-rule_local_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>BGP Local Preference</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'localPreference\', \'localPreference\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="local_preference_input" ng-model="rule.match.localPreference" name="local_preference" ng-min="0" ng-max="4294967295" required><vip-messages element-name="local_preference"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchMetric', '<div id="select-rule_metric" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Metric</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'metric\', \'metric\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="metric_input" ng-model="rule.match.metric" name="metric" ng-min="0" ng-max="4294967295" required><vip-messages element-name="metric"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchNextHop', '<div id="select-rule_next_hop" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Next Hop</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'nextHop\', \'nextHop\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div ng-if="rule.sequenceIpType==\'ipv4\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.nextHop" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Next Hop"></select-create-chips-drop-down></div><div ng-if="rule.sequenceIpType==\'ipv6\'" class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a prefix list\'" model-Obj="rule.match.nextHop" list-items="prefixList.prefixListItems" list-instance="prefixList" copy-list="true" chip-removable="true" heading="Next Hop"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchOspfTag', '<div id="select-rule_ospf_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OSPF Tag</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'ospfTag\', \'ospfTag\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="ospf_tag_input" ng-model="rule.match.ospfTag" name="omp_tag" ng-min="0" ng-max="4294967295" required><vip-messages element-name="ospf_tag"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchPeer', '<div id="select-rule_peer" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Peer</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'peer\', \'peer\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="peer_input" ng-model="rule.match.peer" name="peer" required><vip-messages element-name="peer"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchClass', '<div id="select-rule_class_match" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Class</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'class_match\', \'class\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a Class\'" model-Obj="rule.match.class" list-instance="class" list-items="class.listItems" copy-list="true" chip-removable="true" heading="Class"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchTrafficClass', '<div id="select-rule_traffic_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Traffic Class</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'trafficClass\', \'trafficClass\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-63" type="text" class="form-control inlineBlock" id="class_input" ng-model="rule.match.trafficClass" name="trafficClass" vip-number-list-range-validation no-range="true" delimiter="space" data-range="0-63" ng-required="true"><vip-messages element-name="trafficClass"></vip-messages></div></div></div>');
    $templateCache.put('policyMatchNextHeader', '<div id="select-rule_next_header" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Next Header</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'nextHeader\', \'nextHeader\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-255" type="number" class="form-control inlineBlock" id="class_input" ng-model="rule.match.nextHeader" name="next_header" ng-min="0" ng-max="255" required><vip-messages element-name="next_header"></vip-messages></div></div><div class="rule-entry" ng-if="getICMPCriteria()"><div class="entry-label long-name"><label>{{ getICMPTitle() }}</label></div><div class="entry-input long-name multiple-community" ng-init="initICMPMessage()"><multi-select-create-chips-drop-down place-holder="Search" create-option="false" model-Obj="rule.match.icmpMessage.lists" list-items="icmpMessageList" match-property="name" copy-list="true" chip-removable="true" heading="ICMP Message"></multi-select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyMatchTrafficCategory', '<div id="select-rule_traffic_category" class="select-rule"> <div class="rule-entry" ng-if="!rule.showM365Edit"> <div class="entry-label"><label>Traffic Category</label></div> <div class="entry-input" style="width: 50%">{{rule.match.trafficCategory}}</div></div> <div class="rule-entry" ng-if="rule.showM365Edit"> <div class="entry-label long-name"><label>Traffic Category</label></div> <div class="entry-input entry-flag"> <select ng-model="rule.match.trafficCategory" name="categories"> <option ng-repeat="option in trafficCategoryList" ng-value="option.key">{{option.name}}</option> </select> </div> </div></div>');

    $templateCache.put('policyMatchDestinationRegion', 
    `<div id="select-rule_destination_region" class="select-rule"> 
        <div class="rule-entry"> 
        <div class="entry-label long-name">
            <label>Destination Region</label> 
            <a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'destinationRegion\', \'destinationRegion\')"> 
                <span class="inlineBlock material-icons md-16 icon-grey">close</span> </a> 
        </div>
        <div class="entry-input long-name">
          <single-select-chips-drop-down 
              place-holder="'Select one destination region'" 
              model-Obj="rule.match.destinationRegion" 
              list-items="destRegionList" 
              chip-removable="true" 
              copy-list="true" 
              class="ng-isolate-scope"
              heading="Destination Region List"
              > 
          </single-select-chips-drop-down> 
        </div>  
        </div></div>`);


    //--------- MATCH Read Only Templates ---------------
    $templateCache.put('policyMatchAddressReadonly', '<div id="select-rule_address" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Address</label></div><div class="entry-input long-name"><span><label>{{rule.match.address.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchAppReadonly', '<div id="select-rule_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Application/Application Family List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.appList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchFirewallApplicationListReadonly', '<div id="select-rule_firewall_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Application/Application Family List to Drop:</label></div><div class="entry-input long-name"><span><label>{{rule.match.firewallApplicationList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchAppProtocolReadonly', '<div id="select-rule_app_protocol" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Protocol:</label></div><div ng-if="rule.match.appProtocol.length > 0" class="entry-input long-name"><span><label ng-repeat="protocol in rule.match.appProtocol">{{protocol.name}}{{$last ? \'\' : \', \'}}&nbsp;</label></span></div><div ng-if="rule.match.appProtocolRange" class="entry-input long-name"><span><label>{{rule.match.appProtocolRange}}</label></span></div></div><div ng-if="rule.match.appProtocol.protocol" class="rule-entry"><div class="entry-label long-name"><label>Protocol:</label></div><div class="entry-input long-name"><span><label>{{rule.match.appProtocol.protocol}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchAsPathReadonly', '<div id="select-rule_as_path" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AS Path</label></div><div class="entry-input long-name"><span><label>{{rule.match.asPath.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchCommunityReadonly', '<div id="select-rule_community" class="select-rule"><div ng-if="rule.type !== \'route\'"><div class="rule-entry inline-flex-imp"><div class="entry-label inlineBlock"><label>Community List</label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.match.community.lists">{{value.name}}&nbsp;</label></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.match.community && rule.match.community.matchFlag"><div class="entry-label"><label>Criteria</label></div><div class="entry-input"><label>{{rule.match.community.matchFlag.toUpperCase()}}</label></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.match.expandedCommunity && rule.match.expandedCommunity.lists"><div class="entry-label inlineBlock"><label>Expanded Community List:</label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.match.expandedCommunity.lists">{{value.name}}&nbsp;</label></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityVariableField && rule.communityVariableField.expandedCommunityInline"><div class="entry-label inlineBlock"><label>Community Variable:</label></div><span class="entry-input"><label>{{rule.communityVariableField.expandedCommunityInline }}&nbsp;</label></span></div></div><div ng-if="rule.type === \'route\'"><div class="rule-entry inline-flex-imp"><div class="entry-label inlineBlock"><label>Community List:</label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.match.community.lists">{{value.name}}&nbsp;</label></div></div></div></div>');
    $templateCache.put('policyMatchExpandedCommunityReadonly', '<div id="select-rule_expandedCommunity" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Expanded Community List</label></div><span class="entry-input"><label ng-repeat="(property, value) in rule.match.expandedCommunity.lists">{{value.name}}&nbsp;</label></span></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDnsAppListReadonly', '<div id="select-rule_dns_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>DNS Application/Application Family List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.dnsAppList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchSaasAppListReadonly', '<div id="select-rule_cloud_saas_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Cloud Saas Application/Application Family List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.saasAppList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchExcludeDPAppListReadonly', '<div id="select-rule_cloud_saas_application" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>App List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.saasAppList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDNSReadonly', '<div id="select-rule_plp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>DNS: </label></div><div class="entry-input"><label>{{rule.match.dns.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchServiceAreaReadonly', '<div id="select-rule_plp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Service Area: </label></div><div class="entry-input"><label><span ng-repeat="serviceArea in rule.match.serviceArea">{{serviceArea.name}}<span ng-if="!$last">, </span></span></label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDSCPReadonly', '<div id="select-rule_dscp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>DSCP: </label></div><div class="entry-input"><label>{{rule.match.dscp}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchExtCommunityReadonly', '<div id="select-rule_ext_community" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Extended Community List</label></div><div class="entry-input long-name"><span><label>{{rule.match.extCommunity.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchLocalPreferenceReadonly', '<div id="select-rule_local_preference" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>BGP Local Preference</label></div><div class="entry-input long-name"><span><label>{{rule.match.localPreference}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchMetricReadonly', '<div id="select-rule_metric" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Metric</label></div><div class="entry-input long-name"><span><label>{{rule.match.metric}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchNextHopReadonly', '<div id="select-rule_next_hop" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Next Hop</label></div><div class="entry-input long-name"><span><label>{{rule.match.nextHop.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchSourceReadonly', '<div id="select-rule_source" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Source:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Port</label></div><div class="entry-input"><label>{{rule.match.sourcePort}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDestinationReadonly', '<div id="select-rule_destination" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Destination:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Port</label></div><div class="entry-input"><label>{{rule.match.destinationPort}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDeviceAccessProtocolReadonly', '<div id="select-rule_device-access-protocol" class="select-rule"> <div class="rule-entry" style="display: flex;"> <div class="entry-label"><label>Device Access Protocol</label><label> &nbsp;&nbsp;&nbsp;&nbsp;</label></div> <div class="entry-input"><label>{{getProtocolName(rule.match.deviceAccessProtocol, rule.match.deviceAccessProtocolOptions)}}</label></div> </div> <div class="divider"></div> </div>');
    $templateCache.put('policyMatchProtocolReadonly', '<div id="select-rule_protocol" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Protocol: </label></div><div class="entry-input"><label>{{rule.match.protocol}}</label></div><div class="rule-entry" ng-if="getICMPCriteria()"><div class="entry-label long-name"><label>ICMP Message</label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.match.icmpMessage.lists">{{value.name}}&nbsp;</label> <br></div></div><div class="divider"></div></div>');

    $templateCache.put('policyMatchSourceDataPrefixListReadonly', '<div id="select-rule_source_data_prefix" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Source Data Prefix List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.sourceDataPrefixList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>Source:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; IP </label></div><div class="entry-input"><label>{{rule.match.sourceIp}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDestinationDataPrefixListReadonly', '<div id="select-rule_destination_data_prefix" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Destination Data Prefix List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.destinationDataPrefixList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>Destination: </label><label>&nbsp;&nbsp;&nbsp;&nbsp; IP </label></div><div class="entry-input"><label>{{rule.match.destinationIp}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchPacketLengthReadonly', '<div id="select-rule_packet_length" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Packet Length: </label></div><div class="entry-input"><label>{{rule.match.packetLength}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchPLPReadonly', '<div id="select-rule_plp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>PLP: </label></div><div class="entry-input"><label>{{rule.match.plp.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchTCPReadonly', '<div id="select-rule_tcp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>TCP: </label></div><div class="entry-input"><label>{{rule.match.tcp}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchOriginReadonly', '<div id="select-rule_origin" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Origin: </label></div><div class="entry-input"><label>{{rule.match.origin.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchOMPTagReadonly', '<div id="select-rule_omp_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OMP Tag: </label></div><div class="entry-input"><label>{{rule.match.ompTag}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchOspfTagReadonly', '<div id="select-rule_ospf_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OSPF Tag: </label></div><div class="entry-input"><label>{{rule.match.ospfTag}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchOriginatorReadonly', '<div id="select-rule_originator" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Originator: </label></div><div class="entry-input"><label>{{rule.match.originator}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchPeerReadonly', '<div id="select-rule_peer" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Peer</label></div><div class="entry-input long-name"><span><label>{{rule.match.peer}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchPreferenceReadonly', '<div id="select-rule_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preference: </label></div><div class="entry-input"><label>{{rule.match.preference}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchColorListReadonly', '<div id="select-rule_color_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Color List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.colorList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchSiteListReadonly', '<div id="select-rule_site_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Site List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.siteList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>Site ID: </label></div><div class="entry-input"><label>{{rule.match.siteId}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchRegionListReadonly', '<div id="select-rule_region_list" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name" style="width:39%"><label>Region List:</label></div> <div class="entry-input long-name"><span><label>{{rule.match.regionList.name}}</label></span></div> </div> <div class="rule-entry"> <div class="entry-label" style="width:39%"><label>Region ID: </label></div> <div class="entry-input"><label>{{rule.match.regionId}}</label></div> </div> <div class="rule-entry"> <div class="entry-label" style="width:39%"><label>Role </label></div> <div class="entry-input"><label>{{rule.match.role.name}}</label></div> </div> <div class="divider"></div></div>');
    $templateCache.put('policyMatchPathTypeReadonly', '<div id="select-rule_path_type" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"><label>Path Type:</label></div> <div class="entry-input" style="width:39%"><span><label>{{rule.match.pathType.name}}</label></span></div> </div> <div class="divider"></div></div>');
    $templateCache.put('policyMatchTrafficToReadonly', '<div id="select-rule_traffic_to" class="select-rule"> <div class="rule-entry"> <div class="entry-label" style="width:39%"><label>Traffic To:</label></div> <div class="entry-input long-name"><span><label>{{rule.match.trafficTo.name}}</label></span></div> </div> <div class="divider"></div></div>');
    $templateCache.put('policyMatchVPNListReadonly', '<div id="select-rule_vpn_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>VPN List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.vpnList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>VPN Id </label></div><div class="entry-input"><label>{{rule.match.vpn}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchVPNReadonly', '<div id="select-rule_vpn_list" class="select-rule"> <div class="rule-entry" style="display: flex;"> <div class="entry-label"><label>VPN ID</label></div> <div class="entry-input"><label>{{rule.match.vpn}}</label></div> </div> <div class="divider"></div> </div>');
    $templateCache.put('policyMatchCarrierReadonly', '<div id="select-rule_carrier" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Carrier: </label></div><div class="entry-input"><label>{{rule.match.carrier.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchDomainIdReadonly', '<div id="select-rule_domain_id" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Domain Id: </label></div><div class="entry-input"><label>{{rule.match.domainId}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchGroupIdReadonly', '<div id="select-rule_group_id" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Group Id: </label></div><div class="entry-input"><label>{{rule.match.groupId}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchTLOCListReadonly', '<div id="select-rule_tl' +
      'oc_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>TLOC List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.tlocList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>TLOC IP: </label></div><div class="entry-input"><label>{{rule.match.tloc.ip}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>Color: </label></div><div class="entry-input"><label>{{rule.match.tloc.color.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>Encapsulation: </label></div><div class="entry-input"><label>{{rule.match.tloc.encap.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchPrefixListReadonly', '<div id="select-rule_prefix_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Prefix List:</label></div><div class="entry-input long-name"><span><label>{{rule.match.prefixList.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchClassReadonly', '<div id="select-rule_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Class: </label></div><div class="entry-input"><label>{{rule.match.class.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchTrafficClassReadonly', '<div id="select-rule_traffic_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Traffic Class: </label></div><div class="entry-input"><label>{{rule.match.trafficClass}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchNextHeaderReadonly', '<div id="select-rule_next_header" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Next Header: </label></div><div class="entry-input"><label>{{rule.match.nextHeader}}</label></div><div class="rule-entry" ng-if="getICMPCriteria() && rule.match.icmpMessage.lists.length"><div class="entry-label long-name"><label>{{ getICMPTitle() }}</label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.match.icmpMessage.lists">{{value.name}}&nbsp;</label> <br></div></div><div class="divider"></div></div>');
    $templateCache.put('policyMatchTrafficCategoryReadonly', '<div id="select-rule_traffic_category" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Traffic Category:</label></div><div class="entry-input"><span><label>{{rule.match.trafficCategory}}</label></span></div></div><div class="divider"></div></div>');
    //? Destination Region in Match cond.
    $templateCache.put('policyMatchDestinationRegionReadonly', 
    `<div id="select-rule_destination_region" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Destination Region :</label></div><div class="entry-input"><span><label>&nbsp;{{rule.match.destinationRegion.name}}</label></span></div></div><div class="divider"></div></div>`);

    //--------- ACTION Templates ---------------
    $templateCache.put('policyActionSLA', `<div id="select-rule_sla_class" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>SLA Class</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'slaClass\',  \'slaClass\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a SLA class list\'" model-Obj="rule.action.slaClass.name" list-items="slaClassList.listItems" list-instance="slaClassList" copy-list="true" chip-removable="true" heading="SLA Class List" on-select="slaClassList.onSlaSelect"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label long-name"><label>Preferred Color </label></div><div class="entry-input long-name"><chips-drop-down place-holder="\'Select one or more color lists\'" disabled="!!rule.action.slaClass.preferredColorGroup.name" optional= "true" model-Obj="rule.action.slaClass.preferredColor" list-items="colors" copy-list="true" heading="colors" match-property="name"></chips-drop-down></div></div><div class="rule-entry"><div class="entry-label long-name"><label>Preferred Color Group</label></div><div class="entry-input long-name"><select-create-chips-drop-down on-remove="rule.action.set.preferredColorGroup.colorRestrict = false" place-holder="'Select one preferred color group'" model-Obj="rule.action.slaClass.preferredColorGroup" disabled="!!rule.action.slaClass.preferredColor.length" list-items="preferredColorGrp.listItems" chip-removable="true" copy-list="true" class="ng-isolate-scope inline-create-cgroup" optional= "true" preview="false" list-instance="preferredColorGrp"></select-create-chips-drop-down></div><br/><md-checkbox ng-disabled="!rule.action.slaClass.preferredColorGroup.name" ng-model="rule.action.slaClass.preferredColorGroup.colorRestrict" aria-label="Restrict to PCG" ng-true-value=true ng-false-value=false>${$translate.instant('configuration.policy.restrictPCG')}</md-checkbox></div><div class="rule-entry"><div class="entry-label long-name"><label>When SLA not met</label></div><div class="entry-input long-name" ng-init="initSLAClassListObj()"><md-radio-group ng-model="rule.action.slaClass.fallbackToBestPath" layout="row" class="fullWidth" ng-change="onSlaNotMetChange()"><md-radio-button value="strict" class="md-primary radio-label" id="strict-or-drop" ng-disabled="rule.action.backupSlaPreferredColor && rule.action.backupSlaPreferredColor.length">Strict/Drop</md-radio-button><md-radio-button value="fallbackToBestPath" class="md-primary radio-label" id="fallback-to-best-path" ng-disabled="rule.action.backupSlaPreferredColor && rule.action.backupSlaPreferredColor.length">Fallback to best path</md-radio-button><md-radio-button value="loadBalance" class="md-primary radio-label" id="load-balance" ng-disabled="rule.action.backupSlaPreferredColor && rule.action.backupSlaPreferredColor.length">Load Balance</md-radio-button></md-radio-group></div></div></div>`);
    $templateCache.put('policyActionCloudSaas', '<div id="select-rule_cloud_sla" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Cloud SLA</label></div><div class="entry-input entry-flag">Enabled<a ng-if="!rule.showM365Edit" href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'cloudSaas\',  \'cloudSaas\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div></div>');
    $templateCache.put('policyActionLog', '<div id="select-rule_log" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Log</label></div><div class="entry-input entry-flag">Enabled<a id="log_close_button" href="" class="inlineBlock pull-right" data-ng-click="removeElement($event, \'log\', \'log\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div></div>');
    $templateCache.put('policyActionCounter', '<div id="select-rule_counter" class="select-rule"> <div class="rule-entry" ng-if="!rule.showM365Edit"> <div class="entry-label long-name"><label>Counter Name</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'count\', \'count\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div> <div class="entry-input entry-input-height long-name"><input placeholder="maximum of 20 characters" policy-name-validation type="text" class="wid-100 form-control inlineBlock" id="counter_input" ng-model="rule.action.count" name="counter" ng-minlength="1" ng-maxlength="20" required> <vip-messages element-name="counter"></vip-messages> </div> </div><div class="rule-entry" ng-if="rule.showM365Edit"> <div class="rule-entry"> <div class="entry-label"><label>Counter</label></div> <div class="entry-input" style="width:50%"><label>{{rule.action.count}}</label></div> </div> </div></div>');
    $templateCache.put('policyActionCFlowd', '<div id="select-rule_cflowd" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>CFlowd</label></div><div class="entry-input entry-flag">Enabled<a id="cflowd_close_button" href="" class="inlineBlock pull-right" data-ng-click="removeElement($event, \'cflowd\', \'cflowd\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div></div>');
    $templateCache.put('policyActionAccept', '<div id="select-rule_accept" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Accept</label></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionNATPool', '<div id="select-rule_nat_pool" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>NAT Pool</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'natPool\', \'pool\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="1-31" type="number" class="form-control inlineBlock" id="nat_pool_input" ng-model="rule.action.nat.pool" name="nat_pool" ng-min="1" ng-max="31" required><vip-messages element-name="nat_pool"></vip-messages></div></div></div>');
    $templateCache.put('policyActionNATVPN', '<div id="select-rule_nat_vpn" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>NAT VPN: &nbsp;&nbsp;&nbsp;&nbsp; VPN ID: </label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'natVPN\', \'useVpn\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input type="number" class="form-control inlineBlock" id="nat_vpn_input" ng-model="rule.action.nat.useVpn" name="nat_vpn" ng-init="rule.action.nat.useVpn = 0" disabled><vip-messages element-name="nat_vpn"></vip-messages></div></div><div><vip-check-box-ext check-box-name="set_nat_vpn_fallback" id="set_nat_fallback_checkbox" value="rule.action.nat.fallback" is-checked-initially="rule.action.nat.fallback" ng-click="!rule.action.nat.fallback? rule.action.nat.fallback = true : rule.action.nat.fallback = \'\'" check-box-label="Fallback"></vip-check-box-ext></div></div>');
    $templateCache.put('policyActionRedirectDNS', '<div id="select-rule_redirectDns" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Redirect DNS</label></div><div class="entry-input inlineDisplay"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'redirectDns\', \'redirectDns\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a> <md-radio-group data-ng-model="rule.action.redirectDns.redirectDNSOption" ng-init="initRedirectDns()"> <md-radio-button value="dnsType" class="md-primary inlineDisplay">Host</md-radio-button> <md-radio-button class="inlineDisplay" style="margin-left: 3%;" value="umbrella"> Umbrella </md-radio-button> <md-radio-button class="inlineDisplay" style="margin-left: 3%;" value="ipAddress"> IP Addresss </md-radio-button></md-radio-group></div></div><div class="rule-entry"><div class="entry-label" ng-if="rule.action.redirectDns.redirectDNSOption === \'ipAddress\'"><label>Ip Address</label></div><div class="entry-input" ng-if="rule.action.redirectDns.redirectDNSOption === \'ipAddress\'"><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="set_redirect_dns_ipaddress_input" ng-model="rule.action.redirectDns.ipAddress" name="set_redirect_dns_ipaddress" vip-ip-v4-validation required><vip-messages element-name="set_redirect_dns_ipaddress"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetDSCP', '<div id="select-rule_set_dscp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>DSCP</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setDSCP\', \'dscp\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-63" type="text" class="form-control inlineBlock" id="set_dscp_input" ng-model="rule.action.set.dscp" name="set_dscp" vip-number-list-range-validation data-range="0-63" ng-required="true"><vip-messages element-name="set_dscp"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetForwardingClass', '<div id="select-rule_set_fwd_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Forwarding Class</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setFwdClass\', \'forwardingClass\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="maximum of 32 characters" type="text" class="form-control inlineBlock" id="set_fwd_class_input" ng-model="rule.action.set.forwardingClass" name="set_fwd_class" ng-minlength="1" ng-maxlength="32" required><vip-messages element-name="set_fwd_class"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetLocalTLOC', '<div id="select-rule_set_local_tloc" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Local TLOC: &nbsp;&nbsp;&nbsp;&nbsp; Color </label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setLocalTLOC\', \'localTloc\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a color list\'" model-Obj="rule.action.set.localTloc.color" list-items="colors" chip-removable="true" copy-list="true"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Local TLOC: &nbsp;&nbsp;&nbsp;&nbsp; Encapsulation</label></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select an encap\'" model-Obj="rule.action.set.localTloc.encap" list-items="tlocEncapList" chip-removable="true" copy-list="true"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionSetLocalTLOCList', '<div id="select-rule_set_local_tloc_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Local TLOC List: &nbsp;&nbsp;&nbsp;&nbsp; Color</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setLocalTLOCList\', \'localTlocList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><chips-drop-down place-holder="\'Select one or more color lists\'" model-Obj="rule.action.set.localTlocList.color" list-items="colors" copy-list="true" heading="Colors" match-property="name"></chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Local TLOC List: &nbsp;&nbsp;&nbsp;&nbsp; Encapsulation</label></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a TLOC list\'" model-Obj="rule.action.set.localTlocList.encap" list-items="tlocEncapList" copy-list="true" match-property="key"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-input"><vip-check-box check-box-name="set_local_tloc_list_restrict" id="set_localtloclist_checkbox" value="rule.action.set.localTlocList.restrict" is-checked-initially="rule.action.set.localTlocList.restrict" ng-click="rule.action.set.localTlocList.restrict = !rule.action.set.localTlocList.restrict" check-box-label="Restrict"></vip-check-box></div></div></div>');
    $templateCache.put('policyActionSetNexthop', '<div id="select-rule_set_next_hop" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"> <label>Next Hop</label> <a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setNexthop\',\'nexthop\')"> <span class="inlineBlock material-icons md-16 icon-grey">close</span> </a> </div> <div class="entry-input entry-input-height"> <input ng-if="rule.sequenceIpType==\'ipv4\'" placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="set_nexthop_input" ng-model="rule.action.set.nextHop" name="set_nexthop" vip-ip-v4-validation required> <input ng-if="rule.sequenceIpType==\'ipv6\'" placeholder="Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334" type="text" class="form-control inlineBlock" id="set_nexthop_input" ng-model="rule.action.set.nextHop" name="set_nexthop" vip-ip-v6-validation required> <vip-messages element-name="set_nexthop"></vip-messages> </div> </div> <div class="rule-entry" ng-if="isNexthopLooseAllowed"> <vip-check-box  check-box-name="nextHopLoose" value="rule.action.set.nextHopLoose" id="set_nexthopLoose_input" is-checked-initially="rule.action.set.nextHopLoose" check-box-label="Use routing table entry to forward the packet in case Next-hop is not available." ng-click="rule.action.set.nextHopLoose = !rule.action.set.nextHopLoose"> </vip-check-box> </div> </div>');
    $templateCache.put('policyActionPreferredColorGroup', `<div id="select-rule_preferred_color_group" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preferred Color Group</label></div><div class="entry-input-height inlineDisplay"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, 'preferredColorGroup', 'preferredColorGroup')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><select-create-chips-drop-down place-holder="'Select one preferred color group'" model-Obj="rule.action.preferredColorGroup" on-remove="rule.action.set.preferredColorGroup.colorRestrict = false; rule.action.set.preferredColorGroup.ref=''" disabled="!!rule.action.slaClass.preferredColor.length" list-items="preferredColorGrp.listItems" chip-removable="true" copy-list="true" class="ng-isolate-scope inline-create-cgroup" optional= "true" preview="false" list-instance="preferredColorGrp"></select-create-chips-drop-down></div><br/><md-checkbox ng-disabled="!rule.action.preferredColorGroup.name" ng-model="rule.action.set.preferredColorGroup.colorRestrict" aria-label="Restrict to PCG" ng-true-value=true ng-false-value=false>${$translate.instant('configuration.policy.restrictPCG')}</md-checkbox></div>`);
    $templateCache.put('policyActionSetPolicer', '<div id="select-rule_set_policer" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Policer List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setPolicer\', \'policer\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a policer list\'" model-Obj="rule.action.set.policer" list-instance="policerList" list-items="policerList.listItems" copy-list="true" chip-removable="true" heading="Policer List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionSetService', '<div id="select-rule_set_service" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Service: &nbsp;&nbsp;&nbsp;&nbsp; Type </label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setService\', \'service\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a service type\'" model-Obj="rule.action.set.service.type" list-items="serviceTypes" copy-list="true" chip-removable="true" heading="type" create-option="false"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Service: &nbsp;&nbsp;&nbsp;&nbsp; VPN</label></div><div class="entry-input"><input placeholder="0-65530" type="number" class="form-control inlineBlock" id="set_service_vpn_input" ng-model="rule.action.set.service.vpn" name="set_service_vpn" ng-min="0" ng-max="65530" ng-disabled="rule.action.set.service.local" ng-required="!rule.action.set.service.local && (rule.action.set.service.tloc || (rule.action.set.service.tlocList && rule.action.set.service.tlocList.listId))"><vip-messages element-name="set_service_vpn"></vip-messages></div></div><div class="rule-entry ng-if="rule.action.set.service.hasOwnProperty(\'tloc\')""><div class="rule-entry"><div class="entry-label"><label>Service: TLOC IP</label></div><div class="entry-input"><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="action_set_service_tloc_ip_input" ng-model="rule.action.set.service.tloc.ip" name="set_service_tloc_ip" vip-ip-v4-optional-validation is-required="rule.action.set.service.tloc.ip.length > 0" ng-disabled="rule.action.set.service.tlocList.listId"><vip-messages element-name="set_service_tloc_ip"></vip-messages></div></div><div class="rule-entry"><div class="entry-label"><label>Color</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select a color list\'" model-Obj="rule.action.set.service.tloc.color" list-items="colors" chip-removable="true" copy-list="true" disabled="rule.action.set.service.tlocList.listId"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Encapsulation</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select an encap\'" model-Obj="rule.action.set.service.tloc.encap" list-items="tlocEncapList" chip-removable="true" copy-list="true" disabled="rule.action.set.service.tlocList.listId"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Service: &nbsp;&nbsp;&nbsp;&nbsp; TLOC List</label></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a TLOC list\'" model-Obj="rule.action.set.service.tlocList" list-items="tlocList.listItems" chip-removable="true" list-instance="tlocList" copy-list="true" disabled="(rule.action.set.service.tloc.ip.length > 0 || rule.action.set.service.tloc.color.name || rule.action.set.service.tloc.encap.name)"></select-create-chips-drop-down></div></div><div class="rule-entry" ng-if="rule.action.set.service.hasOwnProperty(\'local\')"><div class="entry-input halfWidth"><vip-check-box-ext check-box-name="set_service_local" id="set_service_local_checkbox" value="rule.action.set.service.local" is-checked-initially="rule.action.set.service.local" ng-click="(rule.action.set.service.vpn == null || rule.action.set.service.vpn < 0) && (rule.action.set.service.local = !rule.action.set.service.local)" check-box-label="Local" check-box-disabled="rule.action.set.service.vpn !== null && rule.action.set.service.vpn > -1"></vip-check-box-ext></div><div class="entry-input halfWidth" ng-if="rule.action.set.service.hasOwnProperty(\'restrict\')" ><vip-check-box-ext check-box-name="set_service_restrict" id="set_service_restrict_checkbox" value="rule.action.set.service.restrict" is-checked-initially="rule.action.set.service.restrict" ng-click="rule.action.set.service.local && (rule.action.set.service.restrict = !rule.action.set.service.restrict)" check-box-label="Restrict" check-box-disabled="!rule.action.set.service.local"></vip-check-box-ext></div></div></div>');
    $templateCache.put('policyActionSetServiceChain', '<div id="select-rule_set_service_chain" class="select-rule"> <div class="rule-entry"> <div class="entry-label long-name"> <label>Service Chain Type: </label> <a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setServiceChain\', \'setServiceChain\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a> </div> <div class="entry-input long-name"> <single-select-chips-drop-down place-holder="\'Select a service chain type\'" model-Obj="rule.action.set.serviceChain.type" list-items="servicechainList" copy-list="true" chip-removable="true" create-option="false"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>VPN:</label></div><div class="entry-input"><input placeholder="0-65530" type="number" class="form-control inlineBlock" id="set_serviceChain_vpn_input" ng-model="rule.action.set.serviceChain.vpn" ng-min="0" ng-max="65530" ng-required="!rule.action.set.serviceChain.local"></div></div><div class="rule-entry" ng-if="rule.action.set.serviceChain.hasOwnProperty(\'tloc\')"><fieldset style="padding-bottom: 11px;border:1px solid #C0C0C0"><legend class="entry-label" style="border: none;margin:0; text-align: start;width: auto;text-indent: 3px;"><label>TLOC:</label></legend><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;IP</label></div><div class="entry-input"><input ng-if="rule.sequenceIpType==\'ipv4\'" placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="action_set_serviceChain_tloc_ip_input" ng-model="rule.action.set.serviceChain.tloc.ip" name="set_service_tloc_ip" vip-ip-v4-optional-validation is-required="rule.action.set.serviceChain.tloc.ip.length > 0" ng-disabled="rule.action.set.serviceChain.tlocList.listId || rule.action.set.serviceChain.local"><input ng-if="rule.sequenceIpType==\'ipv6\'" placeholder="Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334" type="text" class="form-control inlineBlock" id="action_set_serviceChain_tloc_ip_input" ng-model="rule.action.set.serviceChain.tloc.ip" name="set_service_tloc_ip" vip-ip-v6-validation is-required="rule.action.set.serviceChain.tloc.ip.length > 0" ng-disabled="rule.action.set.serviceChain.tlocList.listId || rule.action.set.serviceChain.local"/><input ng-if="rule.sequenceIpType==\'all\'" placeholder="IPv4 or IPv6" type="text" class="form-control inlineBlock" id="action_set_serviceChain_tloc_ip_input" ng-model="rule.action.set.serviceChain.tloc.ip" name="set_service_tloc_ip" vip-ip-v4-v6-validation is-required="rule.action.set.serviceChain.tloc.ip.length > 0" ng-disabled="rule.action.set.serviceChain.tlocList.listId || rule.action.set.serviceChain.local"><vip-messages element-name="set_serviceChain_tloc_ip"></vip-messages></div></div><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;Color</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select a color list\'" id="schain_color_list" model-Obj="rule.action.set.serviceChain.tloc.color" list-items="colors" chip-removable="true" copy-list="true" disabled="rule.action.set.serviceChain.tlocList.listId || rule.action.set.serviceChain.local"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;Encapsulation</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select an encap\'" model-Obj="rule.action.set.serviceChain.tloc.encap" id="schain_color_encap" list-items="tlocEncapList" chip-removable="true" copy-list="true" disabled="rule.action.set.serviceChain.tlocList.listId || rule.action.set.serviceChain.local"></single-select-chips-drop-down></div></div><br></fieldset></div><div class="rule-entry"><div class="entry-label"><label>TLOC List:</label></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a TLOC list\'" id="schain_color_tlocList" model-Obj="rule.action.set.serviceChain.tlocList" list-items="tlocList.listItems" chip-removable="true" list-instance="tlocList" copy-list="true" disabled="(rule.action.set.serviceChain.tloc.ip.length > 0 || rule.action.set.serviceChain.tloc.color.name || rule.action.set.serviceChain.tloc.encap.name) || rule.action.set.serviceChain.local"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-input halfWidth"><md-radio-group data-ng-model="rule.action.set.serviceChain.local" style="display:block"> <md-radio-button ng-value="true" name="service-chain-type" aria-lable="local" ng-click="clearTlocAndTlocList()" class="md-primary inlineDisplay">Local</md-radio-button><md-radio-button aria-label="remote" ng-checked="true" ng-class="[\'inlineDisplay\', {\'md-checked\': !rule.action.set.serviceChain.local}]" style="margin-left: 3%;" ng-value="false" name="service-chain-type">Remote</md-radio-button></md-radio-group><vip-check-box-ext check-box-name="set_serviceChain_restrict" id="set_serviceChain_restrict_checkbox" is-checked-initially="rule.action.set.serviceChain.restrict" value="rule.action.set.serviceChain.restrict" ng-click="(rule.action.set.serviceChain.restrict = !rule.action.set.serviceChain.restrict)" check-box-label="Restrict"></vip-check-box-ext></div></div>');
    $templateCache.put('policyActionSetTLOCAction', '<div id="select-rule_set_tloc_action" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>TLOC Action</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setTLOCAction\', \'tlocAction\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><single-select-chips-drop-down place-holder="\'Select a TLOC action\'" model-Obj="rule.action.set.tlocAction" list-items="tlocActionList" chip-removable="true" copy-list="true"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionSetTLOC', '<div id="select-rule_set_tloc" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>TLOC</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setTLOC\', \'tloc\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input type="text" class="form-control inlineBlock" id="set_tloc_input" ng-model="rule.action.set.tloc" name="set_tloc" required><vip-messages element-name="set_tloc"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetTLOCList', '<div id="select-rule_set_tloc_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>TLOC List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setTLOCList\', \'tlocList\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a TLOC list\'" model-Obj="rule.action.set.tlocList" list-items="tlocList.listItems" list-instance="tlocList" copy-list="true" chip-removable="true" heading="TLOC List" disabled="(rule.action.set.tloc.ip.length > 0 || rule.action.set.tloc.color.name || rule.action.set.tloc.encap.name)"></select-create-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>TLOC IP</label></div><div class="entry-input"><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="action_set_tloc_ip_input" ng-model="rule.action.set.tloc.ip" name="set_tloc_ip" vip-ip-v4-optional-validation is-required="rule.action.set.tloc.ip.length > 0" ng-disabled="rule.action.set.tlocList.listId"><vip-messages element-name="set_tloc_ip"></vip-messages></div></div><div class="rule-entry"><div class="entry-label"><label>Color</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select a color list\'" model-Obj="rule.action.set.tloc.color" list-items="colors" chip-removable="true" copy-list="true" disabled="rule.action.set.tlocList.listId"></single-select-chips-drop-down></div></div><div class="rule-entry"><div class="entry-label"><label>Encapsulation</label></div><div class="entry-input" style="padding-right: 10px;"><single-select-chips-drop-down place-holder="\'Select an encapsulation\'" model-Obj="rule.action.set.tloc.encap" list-items="tlocEncapList" chip-removable="true" copy-list="true" disabled="rule.action.set.tlocList.listId"></single-select-chips-drop-down></div></div></div>');
    $templateCache.put("policyActionSetAffinity",'<div id="select-rule_set_affinity" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Affinity</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setAffinity\', \'affinity\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input type="number" placeholder="0-63" class="form-control inlineBlock" id="set_affinity_input" ng-model="rule.action.set.affinity" name="set_affinity" ng-min="0" ng-max="63" required><vip-messages element-name="set_affinity"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetVPN', '<div id="select-rule_set_vpn" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>VPN</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setVPN\', \'vpn\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-65530" type="number" class="form-control inlineBlock" id="set_vpn_input" ng-model="rule.action.set.vpn" name="set_vpn" ng-min="0" ng-max="65530" required><vip-messages element-name="set_vpn"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetPreference', '<div id="select-rule_set_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preference</label></div><div class="entry-input"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setPreference\', \'preference\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_preference_input" ng-model="rule.action.set.preference" name="set_preference" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_preference"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetOMPTag', '<div id="select-rule_set_omp_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OMP Tag</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setOMPTag\', \'ompTag\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_omp_tag_input" ng-model="rule.action.set.ompTag" name="set_omp_tag" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_omp_tag"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetTrafficClass', '<div id="select-rule_set_traffic_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Traffic Class</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setTrafficClass\', \'trafficClass\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-63" type="number" class="form-control inlineBlock" id="class_input" ng-model="rule.action.set.trafficClass" name="set_traffic_class" ng-min="0" ng-max="63" required><vip-messages element-name="set_traffic_class"></vip-messages></div></div></div>');
    $templateCache.put('policyActionDrop', '<div id="select-rule_drop" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Drop</label><i class="material-icons cohesion-info-icon" ng-if="showDropInfoMsg"><md-tooltip md-delay="1000">{{showDropInfoMsg}}</md-tooltip></i></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionInspect', '<div id="select-rule_inspect" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Inspect</label></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionPass', '<div id="select-rule_pass" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Pass</label></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionNone', '<div id="select-rule_none" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>None</label></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionReject', '<div id="select-rule_reject" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Reject</label></div><div class="entry-input entry-flag">Enabled</div></div></div>');
    $templateCache.put('policyActionBackupSLAPreferredColor', '<div id="select-rule_backup_sla_preferred_color" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Backup SLA Preferred Color</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'backupSlaPreferredColor\', \'backupSlaPreferredColor\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><chips-drop-down place-holder="\'Select one or more color lists\'" model-Obj="rule.action.backupSlaPreferredColor" list-items="colors" copy-list="true" heading="Colors" match-property="name"></chips-drop-down></div></div></div>');
    $templateCache.put('policyActionAppQoEOptimization', '<div id="select-rule_appqoe_optimization" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AppQoE Optimization</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'appqoeOptimization\', \'appqoeOptimization\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div><div class="rule-entry"><span> TCP Optimization </span><vip-check-box  check-box-name="tcpOptimization" value="rule.action.appqoeOptimization.tcpOptimization" id="tcpOptimization_input" is-checked-initially="rule.action.appqoeOptimization.tcpOptimization" ng-click="rule.action.appqoeOptimization.tcpOptimization = !rule.action.appqoeOptimization.tcpOptimization"> </vip-check-box></div><div class="rule-entry"><span> DRE Optimization </span><vip-check-box  check-box-name="dreOptimization" value="rule.action.appqoeOptimization.dreOptimization" id="dreOptimization_input" is-checked-initially="rule.action.appqoeOptimization.dreOptimization" ng-click="rule.action.appqoeOptimization.dreOptimization = !rule.action.appqoeOptimization.dreOptimization"> </vip-check-box></div><div class="entry-label"><label> Service Node Group </label></div><div class="entry-input entry-input-height"><input placeholder="Example: SNG-APPQOE<1-31>" type="text" class="form-control" id="sng_name_input" ng-model="rule.action.appqoeOptimization.sngName" name="sng_name"></div></div>');
    $templateCache.put('policyActionExportTo', '<div id="select-rule_export_to" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Export To</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'exportTo\', \'exportTo\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a VPN list\'" model-Obj="rule.action.exportTo" list-items="vpnList.listItems" list-instance="vpnList" copy-list="true" chip-removable="true"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionSetAggregator', '<div id="select-rule_set_aggregator" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Aggregator</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setAggregator\', \'aggregator\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div><div class="rule-entry"><div class="entry-label"><label>Value</label></div><div class="entry-input" style="padding-right: 10px;"><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="action_set_aggregator_value_input" ng-model="rule.action.set.aggregator.aggregator" name="set_aggregator_value" required><vip-messages element-name="set_aggregator_value"></vip-messages></div></div><div class="rule-entry"><div class="entry-label"><label>IP Address</label></div><div class="entry-input"><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="action_set_aggregator_input" ng-model="rule.action.set.aggregator.ipAddress" name="set_aggregator_ip" vip-ip-v4-optional-validation required><vip-messages element-name="set_tloc_ip"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetAsPath', '<div id="select-rule_set_as_path" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AS Path</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setAsPath\', \'asPath\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div><div class="rule-entry"><div class="entry-label"><label>Prepend</label></div><div class="entry-input" style="height: 48px;"><input placeholder="Example: 65521 65521" ng-maxlength="128" type="text" class="form-control inlineBlock" id="action_set_as_path_prepend_input" ng-model="rule.action.set.asPath.prepend"  name="set_as_path_prepend"></div></div><div class="rule-entry"><div class="entry-label"><label>Exclude</label></div><div class="entry-input" style="height: 48px;"><input placeholder="Example: 120 130" ng-maxlength="128"  type="text" class="form-control inlineBlock" id="action_set_as_path_exclude_input" ng-model="rule.action.set.asPath.exclude" name="set_as_path_exclude"></div></div></div>');
    $templateCache.put('policyActionSetAtomicAggregate', '<div id="select-rule_set_atomic_aggregate" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Atomic Aggregate</label></div><div class="entry-input entry-flag">Enabled<a id="log_close_button" href="" class="inlineBlock pull-right" data-ng-click="removeElement($event, \'setAtomicAggregate\', \'atomicAggregate\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div></div>');
    $templateCache.put('policyActionSetCommunity', '<div id="select-rule_set_community" class="select-rule"><div class="entry-label long-name"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setCommunity\', \'community\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="rule-entry inline-flex-imp"><div class="entry-label inlineBlock"><label>Community</label></div><div class="entry-input entry-input-height"><input placeholder="1000:10000 or internet or local-AS" type="text" class="form-control inlineBlock" id="set_community" ng-model="rule.action.set.community" name="set_community"  ng-disabled="rule.communityVariableField.actionCommunityVariable && rule.communityVariableField.setCommunityVariable == \'Enabled\'"><vip-messages element-name="class"></vip-messages></div></div><div class="rule-entry" ng-if="rule.action.set.communityAdditive !== null"><div class="entry-label inlineBlock"><label></label></div><md-checkbox ng-model="rule.action.set.communityAdditive" aria-label="Additive" ng-true-value="\'true\'" ng-false-value="\'false\'">Additive</md-checkbox></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityVariableField !== null"><div class="entry-label inlineBlock"><label>Community Variable: &nbsp;&nbsp;&nbsp;&nbsp;</label></div><div class="entry-input"><input placeholder="Variable Name" type="text" class="form-control" id="community_string_variable" ng-model="rule.communityVariableField.actionCommunityVariable" ng-disabled="rule.communityVariableField.setCommunityVariable == \'Disabled\' || rule.action.set.community" name="community_string"><vip-messages element-name="community_string"></vip-messages><md-switch ng-model="rule.communityVariableField.setCommunityVariable" ng-true-value="\'Enabled\'" ng-false-value="\'Disabled\'" aria-label="variableSwitch" ng-disabled="rule.action.set.community">Variables:{{ rule.communityVariableField.setCommunityVariable }}</md-switch></div></div></div></div>');

    $templateCache.put('policyActionSetLocalPreference', '<div id="select-rule_set_local_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Local Preference</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setLocalPreference\', \'localPreference\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_local_preference" ng-model="rule.action.set.localPreference" name="set_local_preference" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_local_preference"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetMetric', '<div id="select-rule_set_metric" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Metric</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setMetric\', \'metric\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_metric" ng-model="rule.action.set.metric" name="set_metric" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_metric"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetMetricType', '<div id="select-rule_set_metric_type" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Metric Type</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setMetricType\', \'metricType\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="type1 or type2" type="text" class="form-control inlineBlock" id="set_metric_type" ng-model="rule.action.set.metricType" name="set_metric_type" required><vip-messages element-name="class"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetOrigin', '<div id="select-rule_set_origin" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Origin</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setOrigin\', \'origin\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="igp or egp or incomplete" type="text" class="form-control inlineBlock" id="set_origin_input" ng-model="rule.action.set.origin" name="origin" required><vip-messages element-name="class"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetOriginator', '<div id="select-rule_set_originator" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Originator</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setOriginator\',\'originator\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="Example: 10.0.0.1" type="text" class="form-control inlineBlock" id="set_originator" ng-model="rule.action.set.originator" name="set_originator" vip-ip-v4-validation required><vip-messages element-name="set_originator"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetOspfTag', '<div id="select-rule_set_ospf_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OSPF Tag</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setOspfTag\', \'ospfTag\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_ospf_tag" ng-model="rule.action.set.ospfTag" name="set_ospf_tag" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_ospf_tag"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSetWeight', '<div id="select-rule_set_weight" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Weight</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'setWeight\', \'weight\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a><input placeholder="0-4294967295" type="number" class="form-control inlineBlock" id="set_weight" ng-model="rule.action.set.weight" name="set_weight" ng-min="0" ng-max="4294967295" required><vip-messages element-name="set_weight"></vip-messages></div></div></div>');
    $templateCache.put('policyActionPolicer', '<div id="select-rule_policer" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Policer</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'policer\', \'policer\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a policer list\'" model-Obj="rule.action.policer" list-instance="policerList" list-items="policerList.listItems" copy-list="true" chip-removable="true" heading="Policer List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionMirror', '<div id="select-rule_mirror_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Mirror List</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'mirror\', \'mirror\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a mirror list\'" model-Obj="rule.action.mirror" list-instance="mirror" list-items="mirror.listItems" copy-list="true" chip-removable="true" heading="Mirror List"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionClass', '<div id="select-rule_class_action" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Class</label></div><div class="entry-input entry-input-height"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'class_action\', \'class\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div><div class="entry-input long-name"><select-create-chips-drop-down place-holder="\'Select a Class\'" model-Obj="rule.action.class" list-instance="class" list-items="class.listItems" copy-list="true" chip-removable="true" heading="Class"></select-create-chips-drop-down></div></div></div>');
    $templateCache.put('policyActionLossProtect', '<div id="select-rule_lossProtect" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Loss Correction</label></div><div class="entry-input inlineDisplay"><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'lossProtect\', \'lossProtect\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a> <md-radio-group class="inlineBlock" ng-model="rule.action.lossProtect.lossProtectOption"> <md-radio-button value="fecAdaptive" class="md-primary">FEC Adaptive</md-radio-button> <md-radio-button class="md-primary" value="fecAlways"> FEC Always </md-radio-button><md-radio-button class="md-primary" value="packetDuplication"> Packet Duplication </md-radio-button></md-radio-group></div></div><div ng-show="rule.action.lossProtect.lossProtectOption===\'fecAdaptive\'" class="rule-entry"><div class="entry-label"><label>Loss Threshold % (BETA)</label></div><div class="entry-input inlineDisplay"><input type="text" placeholder="1-5" class="form-control inlineBlock" id="loss_percentage_input" ng-model="rule.action.lossProtect.lossPercentage" name="loss_percentage" vip-number-list-range-validation no-range="true" data-range="1-5"><vip-messages element-name="loss_percentage"></vip-messages></div></div></div>');
    $templateCache.put('policyActionSig', '<div id="select-rule_sig" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Secure Internet Gateway</label></div><div class="entry-input entry-flag">Enabled<a id="log_close_button" href="" class="inlineBlock pull-right" data-ng-click="removeElement($event, \'sig\', \'sig\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a></div></div><div><vip-check-box-ext check-box-name="set_sig_fallback" id="set_sig_fallback_checkbox" value="rule.action.sig.fallback" is-checked-initially="rule.action.sig.fallback" ng-click="!rule.action.sig.fallback ? rule.action.sig.fallback = true : rule.action.sig.fallback = \'\'" check-box-label="Fallback to Routing"></vip-check-box-ext></div></div>');
    $templateCache.put('policyActionServiceChain', `<div id="select-rule_serviceChain" class="select-rule">
    <div class="rule-entry">
      <div class="entry-label long-name">
        <label>Service Chain Type</label><a href="" class="close_button inlineBlock pull-right" data-ng-click="removeElement($event, \'serviceChain\', \'serviceChain\')"><span class="inlineBlock material-icons md-16 icon-grey">close</span></a>
      </div>
      <div class="entry-input long-name">
        <single-select-chips-drop-down place-holder="\'Select a Service chain type\'" 
         model-Obj="rule.action.serviceChain.type" list-items="servicechainList" chip-removable="true" copy-list="true" placeholder="Select a service chain type">
        </single-select-chips-drop-down><br/>
        <div class="rule-entry"><div class="entry-label"><label>VPN:</label></div><div class="entry-input"><input placeholder="0-65530" type="number" class="form-control inlineBlock" id="serviceChain_vpn_input" ng-model="rule.action.serviceChain.vpn" name="servicechain_vpn" ng-min="0" ng-max="65530"><vip-messages element-name="set_serviceChain_vpn"></vip-messages></div></div>
        <vip-check-box-ext check-box-name="serviceChain_restrict" id="serviceChain_restrict_checkbox" value="rule.action.serviceChain.restrict" is-checked-initially="rule.action.serviceChain.restrict" ng-click="rule.action.serviceChain.restrict = !rule.action.serviceChain.restrict" check-box-label="Restrict"><vip-check-box-ext>
    </div></div></div>`);
    

    //--------- ACTION Read Only Templates ---------------
    $templateCache.put('policyActionSetAggregatorReadonly', '<div id="select-rule_set_aggregator" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Aggregator:</label></div></div><div class="rule-entry"><div class="entry-label"><label>Value: </label></div><div class="entry-input"><label>{{rule.action.set.aggregator.aggregator}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>IP Address: </label></div><div class="entry-input"><label>{{rule.action.set.aggregator.ipAddress}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetAsPathReadonly', '<div id="select-rule_set_as_path" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AS Path:</label></div></div><div class="rule-entry"><div class="entry-label"><label>Prepend: </label></div><div class="entry-input"><label>{{rule.action.set.asPath.prepend}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>Exclude: </label></div><div class="entry-input"><label>{{rule.action.set.asPath.exclude}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetAtomicAggregateReadonly', '<div id="select-rule_set_atomic_aggregate" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Atomic Aggregate </label></div><div class="entry-input"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetCommunityReadonly','<div id="select-rule_set_community" class="select-rule"><div class="rule-entry inline-flex-imp ng-show="rule.action.set.community !== null"><div class="entry-label"><label>Community: </label></div><div class="entry-input"><label>{{rule.action.set.community}}</label></div></div><div class="rule-entry inline-flex-imp"><div class="entry-label inlineBlock"><label>Additive: </label></div><div class="entry-input"><label>{{rule.action.set.communityAdditive}}</label></div></div><div class="rule-entry inline-flex-imp" ng-if="rule.communityVariableField && rule.communityVariableField.actionCommunityVariable"><div class="entry-label"><label>Community Variable: </label></div><div class="entry-input"><label>{{rule.communityVariableField.actionCommunityVariable}}</label></div></div></div></div>');
    $templateCache.put('policyActionSetLocalPreferenceReadonly', '<div id="select-rule_set_local_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Local Preference: </label></div><div class="entry-input"><label>{{rule.action.set.localPreference}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetMetricReadonly', '<div id="select-rule_set_metric" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Metric: </label></div><div class="entry-input"><label>{{rule.action.set.metric}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetMetricTypeReadonly', '<div id="select-rule_set_metric_type" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Metric Type: </label></div><div class="entry-input"><label>{{rule.action.set.metricType}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSLAReadonly', `<div id="select-rule_sla_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>SLA Class:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; List </label></div><div class="entry-input"><span><label>{{rule.action.slaClass.name.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">SLA Class:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; Preferred Color </label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.action.slaClass.preferredColor">{{value.name}}&nbsp;</label></div><div class="rule-entry"><div class="entry-label" style="padding-left:79px;width:39%"><label>Preferred Color Group</label></div><div class="entry-input"><label class="pcgn">{{rule.action.slaClass.preferredColorGroup.name}}</label></div><div class="entry-label" style="padding-left:79px;width: 39%;"><label>${$translate.instant('configuration.policy.restrictPCG')}</label></div><div class="entry-input">&nbsp;<label>{{rule.action.slaClass.preferredColorGroup.colorRestrict? 'Enabled' : 'Disabled'}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">SLA Class:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SLA Not Met</label></div><div class="entry-input"><label>{{rule.action.slaClass.fallbackToBestPath === \'fallbackToBestPath\' ? \'Fallback to best path\' : (rule.action.slaClass.fallbackToBestPath === \'strict\' ? \'Strict/Drop\' : \'Load Balance\')}}</label></div></div><div class="divider"></div></div>`);
    $templateCache.put('policyActionCloudSaasReadonly', '<div id="select-rule_cloud_sla" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Cloud SLA</label></div><div class="entry-input"><span><label>Enabled</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionLogReadonly', '<div id="select-rule_log" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Log</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionCounterReadonly', '<div id="select-rule_counter" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Counter</label></div><div class="entry-input"><label>{{rule.action.count}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionCFlowdReadonly', '<div id="select-rule_cflowd" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>CFlowd</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionAcceptReadonly', '<div id="select-rule_accept" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Accept</label></div><div class="entry-input"></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionNATPoolReadonly', '<div id="select-rule_nat_pool" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>NAT Pool: </label></div><div class="entry-input"><label>{{rule.action.nat.pool}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionNATVPNReadonly', '<div id="select-rule_nat_vpn" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>NAT VPN: </label></div><div class="entry-input"><label>{{rule.action.nat.useVpn}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">NAT VPN:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Fallback</label></div><div class="entry-input"><label>{{rule.action.nat.fallback}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionRedirectDNSReadonly', '<div id="select-rule_redirectDNS" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Redirect DNS: </label></div><div class="entry-input"><label>{{rule.action.redirectDns.redirectDNSOption === \'ipAddress\' ? \'Ip Address\' : (rule.action.redirectDns.redirectDNSOption === \'dnsType\' ? \'Host\' : \'Umbrella\')}}</label></div></div><div class="rule-entry"><div class="entry-label"><label  class="visibilityHidden">Redirect DNS: </label><label ng-if="rule.action.redirectDns.redirectDNSOption === \'ipAddress\'"> &nbsp;&nbsp;&nbsp;&nbsp;Ip Address</label></div><div class="entry-input" ng-if="rule.action.redirectDns.redirectDNSOption === \'ipAddress\'"><label>{{rule.action.redirectDns.ipAddress}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetDSCPReadonly', '<div id="select-rule_set_dscp" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>DSCP: </label></div><div class="entry-input"><label>{{rule.action.set.dscp}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetTrafficClassReadonly', '<div id="select-rule_set_traffic_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Traffic Class: </label></div><div class="entry-input"><label>{{rule.action.set.trafficClass}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetForwardingClassReadonly', '<div id="select-rule_set_fwd_class" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Forwarding Class: </label></div><div class="entry-input"><label>{{rule.action.set.forwardingClass}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetLocalTLOCReadonly', '<div id="select-rule_set_local_tloc" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Local TLOC:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; color </label></div><div class="entry-input"><label>{{rule.action.set.localTloc.color.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Local TLOC:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Encapsulation</label></div><div class="entry-input"><label>{{rule.action.set.localTloc.encap.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetLocalTLOCListReadonly', '<div id="select-rule_set_local_tloc_list" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Local TLOC List: </label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.action.set.localTlocList.color">{{value.name}}&nbsp;</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Local TLOC List:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Encapsulation</label></div><div class="entry-input"><label style="text-transform:uppercase">{{rule.action.set.localTlocList.encap.name || rule.action.set.localTlocList.encap}}&nbsp;</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Local TLOC List:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Restrict</label></div><div class="entry-input"><label>{{rule.action.set.localTlocList.restrict}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetNexthopReadonly', '<div id="select-rule_set_nexthop" class="select-rule"> <div class="rule-entry"> <div class="entry-label"><label>Next Hop: </label></div> <div class="entry-input"><label>{{rule.action.set.nextHop}}</label></div> </div> <div class="rule-entry"> <div class="entry-label"><label>Use Default Route:</label></div> <div class="entry-input"><label>{{rule.action.set.nextHopLoose}}</label></div> </div> <div class="divider"></div> </div>');
    $templateCache.put('policyActionSetPolicerReadonly', '<div id="select-rule_set_policer" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Policer List:</label></div><div class="entry-input long-name"><span><label>{{rule.action.set.policer.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetServiceReadonly', '<div id="select-rule_set_service" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Service:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; Type </label></div><div class="entry-input"><label>{{rule.action.set.service.type.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Service:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;VPN</label></div><div class="entry-input"><label>{{rule.action.set.service.vpn}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Service:</label><label>&nbsp;&nbsp;&nbsp;&nbsp;TLOC IP: </label></div><div class="entry-input"><label>{{rule.action.set.service.tloc.ip}}</label></div></div><div class="rule-entry"><label class="visibilityHidden">Service:</label><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;&nbsp;Color: </label></div><div class="entry-input"><label>{{rule.action.set.service.tloc.color.name}}</label></div></div><div class="rule-entry"><label class="visibilityHidden">Service:</label><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;&nbsp;Encapsulation: </label></div><div class="entry-input"><label>{{rule.action.set.service.tloc.encap.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Service:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;TLOC List</label></div><div class="entry-input"><label>{{rule.action.set.service.tlocList.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Service:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Local</label></div><div class="entry-input"><label>{{rule.action.set.service.local}}</label></div></div><div class="rule-entry"><div class="entry-label"><label class="visibilityHidden">Service:</label><label> &nbsp;&nbsp;&nbsp;&nbsp;Restrict</label></div><div class="entry-input"><label>{{rule.action.set.service.restrict}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetServiceChainReadonly', '<div id="select-rule_set_serviceChain" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Service Chain:</label><label>&nbsp;&nbsp;&nbsp;&nbsp; Type </label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.type.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label> &nbsp;&nbsp;&nbsp;&nbsp;VPN</label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.vpn}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;&nbsp;TLOC IP: </label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.tloc.ip}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;&nbsp;Color: </label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.tloc.color.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>&nbsp;&nbsp;&nbsp;&nbsp;Encapsulation: </label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.tloc.encap.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label> &nbsp;&nbsp;&nbsp;&nbsp;TLOC List</label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.tlocList.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label> &nbsp;&nbsp;&nbsp;&nbsp;Local</label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.local?"Enabled":""}}</label></div></div><div class="entry-label"><label> &nbsp;&nbsp;&nbsp;&nbsp;Remote</label></div><div class="entry-input"><label>{{!rule.action.set.serviceChain.local?"Enabled":""}}</label></div><div class="rule-entry"><div class="entry-label"><label> &nbsp;&nbsp;&nbsp;&nbsp;Restrict</label></div><div class="entry-input"><label>{{rule.action.set.serviceChain.restrict}}</label></div></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetTLOCActionReadonly', '<div id="select-rule_set_tloc_action" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>TLOC Action: </label></div><div class="entry-input"><label>{{rule.action.set.tlocAction.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetTLOCReadonly', '<div id="select-rule_set_tloc" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>TLOC: </label></div><div class="entry-input"><label>{{rule.action.set.tloc}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetTLOCListReadonly', '<div id="select-rule_set_tloc_list" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>TLOC List:</label></div><div class="entry-input long-name"><span><label>{{rule.action.set.tlocList.name}}</label></span></div></div><div class="rule-entry"><div class="entry-label"><label>TLOC IP: </label></div><div class="entry-input"><label>{{rule.action.set.tloc.ip}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>Color: </label></div><div class="entry-input"><label>{{rule.action.set.tloc.color.name}}</label></div></div><div class="rule-entry"><div class="entry-label"><label>Encapsulation: </label></div><div class="entry-input"><label>{{rule.action.set.tloc.encap.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetAffinityReadonly', '<div id="select-rule_set_affinity_action" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Affinity: </label></div><div class="entry-input"><label>{{rule.action.set.affinity}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetVPNReadonly', '<div id="select-rule_set_vpn" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>VPN: </label></div><div class="entry-input"><label>{{rule.action.set.vpn}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetPreferenceReadonly', '<div id="select-rule_set_preference" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preference: </label></div><div class="entry-input"><label>{{rule.action.set.preference}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetOMPTagReadonly', '<div id="select-rule_set_omp_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OMP Tag: </label></div><div class="entry-input"><label>{{rule.action.set.ompTag}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetOriginReadonly', '<div id="select-rule_set_origin" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Origin: </label></div><div class="entry-input"><label>{{rule.action.set.origin}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetOriginatorReadonly', '<div id="select-rule_set_originator" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Originator: </label></div><div class="entry-input"><label>{{rule.action.set.originator}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetOspfTagReadonly', '<div id="select-rule_set_ospf_tag" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>OSPF Tag: </label></div><div class="entry-input"><label>{{rule.action.set.ospfTag}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSetWeightReadonly', '<div id="select-rule_set_weight" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Weight: </label></div><div class="entry-input"><label>{{rule.action.set.weight}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionDropReadonly', '<div id="select-rule_drop" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Drop</label><i class="material-icons" ng-if="showDropInfoMsg"><img src="/images/cohesion/info/info_16.svg" alt="information"><md-tooltip md-delay="1000">{{showDropInfoMsg}}</md-tooltip></i></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionInspectReadonly', '<div id="select-rule_inspect" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Inspect</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionPassReadonly', '<div id="select-rule_pass" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Pass</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionNoneReadonly', '<div id="select-rule_none" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>None</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionRejectReadonly', '<div id="select-rule_reject" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Reject</label></div><div class="entry-input entry-flag"><label>Enabled</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionBackupSLAPreferredColorReadonly', '<div id="select-rule_backup_sla_preferred_color" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Backup SLA Preferred Color: </label></div><div class="entry-input"><label ng-repeat="(property, value) in rule.action.backupSlaPreferredColor">{{value.name}}&nbsp;</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionAppQoEOptimizationReadonly','<div id="select-rule_appqoe_optimization" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>AppQoE Optimization</label></div></div><div class="rule-entry"><span> TCP Optimization :</span><span id="tcpOptimization_enabled" ng-if="rule.action.appqoeOptimization.tcpOptimization" style="padding-left: 90px"> Enabled </span><span id="tcpOptimization_disabled" ng-if="!rule.action.appqoeOptimization.tcpOptimization" style="padding-left: 90px"> Disabled </span></div><div class="rule-entry"><span> DRE Optimization :</span><span id="dreOptimization_enabled" ng-if="rule.action.appqoeOptimization.dreOptimization" style="padding-left: 90px"> Enabled </span><span id="dreOptimization_disabled" ng-if="!rule.action.appqoeOptimization.dreOptimization" style="padding-left: 90px"> Disabled </span></div><div ng-if="rule.action.appqoeOptimization.sngName" style="margin-top: 10px"><div class="entry-label"><label> Service Node Group :</label></div>{{rule.action.appqoeOptimization.sngName}}</div><div class="divider"></div></div>');
    $templateCache.put('policyActionExportToReadonly', '<div id="select-rule_export_to" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Export To:</label></div><div class="entry-input long-name"><span><label>{{rule.action.exportTo.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionPolicerReadonly', '<div id="select-rule_policer" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Policer:</label></div><div class="entry-input long-name"><span><label>{{rule.action.policer.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionMirrorReadonly', '<div id="select-rule_mirror" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Mirror List:</label></div><div class="entry-input long-name"><span><label>{{rule.action.mirror.name}}</label></span></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionClassReadonly', '<div id="select-rule_class_action" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Class: </label></div><div class="entry-input"><label>{{rule.action.class.name}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionLossProtectReadonly', '<div id="select-rule_lossProtect" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Loss Correction: </label></div><div class="entry-input"><label>{{rule.action.lossProtect.lossProtectOption  === \'fecAdaptive\' ? \'FEC Adaptive \' : (rule.action.lossProtect.lossProtectOption  === \'fecAlways\' ? \'FEC Always \' : \'Packet Duplication \' )}}</label></div></div><div class="rule-entry" ng-if="rule.action.lossProtect.lossPercentage"><div class="entry-label"><label>Loss Threshold % (BETA): </label></div><div class="entry-input"><label>{{rule.action.lossProtect.lossPercentage}}</label></div></div><div class="divider"></div></div>');
    $templateCache.put('policyActionSigReadonly', '<div id="select-rule_sig" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Secure Internet Gateway</label></div><div class="entry-input entry-flag"><label>Enabled</label></div><div class="entry-label"><label>Fallback to Routing</label></div><div class="entry-input"><label>{{rule.action.sig.fallback}}</label></div><div class="divider"></div></div>');
    $templateCache.put('policyActionPreferredColorGroupReadonly', `<div id="select-rule_preferred_color_group_readonly" class="select-rule"><div class="rule-entry"><div class="entry-label"><label>Preferred Color Group</label></div><div class="entry-input" ng-if="rule.action">{{(rule.action.preferredColorGroup && rule.action.preferredColorGroup.name) || (rule.action.set.preferredColorGroup.ref? (preferredColorGrp.listItems | filter : {'listId': rule.action.set.preferredColorGroup.ref})[0].name : '')}}</div><div class="entry-label"><label>Restrict to PCG:</label></div><div class="entry-input">{{rule.action.set.preferredColorGroup.colorRestrict? 'Enabled' : 'Disabled'}}</div></div></div>`);
    $templateCache.put('policyActionServiceChainReadonly', `<div id="select-rule_servicechain" class="select-rule"><div class="rule-entry"><div class="entry-label long-name"><label>Service Chain:</label></div><div class="entry-input long-name"><span><label>{{rule.action.serviceChain.type.name}}</label></span></div><div class="entry-label long-name"><label>Restrict:</label></div><div class="entry-input long-name"><span><label>{{rule.action.serviceChain.restrict}}</label></span></div><div class="entry-label long-name"><label>VPN:</label></div><div class="entry-input long-name"><span><label>{{rule.action.serviceChain.vpn}}</label></span></div></div><div class="divider"></div></div>`);
    return {
      priority: 10, //after dragndrop and before ng-repeat
      restrict: 'EA',
      templateUrl: 'app/configuration/policy/components/templates/policyRule.html',
      scope: {
        rule: '=',
        order: '@',
        saveFn: '&?', //if not set then undefined
        cancelFn: '&?',
        viewMode: '=?',
        showRuleName: '=?'
      },

      /**
       * @ngdoc service
       * @name vManage.directive:policyRule#compile
       * @returns {Function}
       * @description compile method of directive
       */
      compile: function () {
        return {

          /**
           * @ngdoc method
           * @name vManage.directive:policyRule#pre
           * @params{Scope} $scope
           * @params{Element} $element
           * @params{Attributes} $attrs
           * @returns {Void}
           * @description pre method of directive - executed before child directives
           */
          pre: function ($scope, $element, $attrs) {
            $scope.collapseDiv = {
              show: false
            };
            $scope.actionTagMenu = {
              isOpen: false,
              open: function () {
                $scope.actionTagMenu.isOpen = !$scope.actionTagMenu.isOpen;
              }
            };
            $scope.policyRuleForm = {};
            $scope.applicationList = AppAppFamilyListManager.getInstance();
            $scope.dnsApplicationList =  AppAppFamilyListManager.getInstance();
            $scope.firewallApplicationList = FirewallApplicationListManager.getInstance();
            $scope.dnsList = DNS.options;
            $scope.destRegionList = destinationRegions.options;
            $scope.serviceAreaList = ServiceAreas.options;
            $scope.trafficCategoryList = TrafficCategories.options;
            $scope.colorList = ColorListManager.getInstance();
            $scope.dataPrefixList = DataPrefixListManager.getInstance();

            // Check for NextHop Loose
            $scope.isNexthopLooseAllowed = true;
            if($scope.rule instanceof ACLv4PolicyRule || $scope.rule instanceof ACLv6PolicyRule || $scope.rule instanceof VedgeRoutePolicyRule) {
              $scope.isNexthopLooseAllowed = false;
            }

            if($scope.rule instanceof ApplicationFirewallPolicyRule || $scope.rule instanceof ServiceChainingPolicyRule || $scope.rule instanceof ACLv4PolicyRule) {
              $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                return item.type.toLowerCase() === 'dataprefix' && item.infoTag !== 'Webex';
              });
              $scope.rule.sourceIpType = 'sourceIp';
              $scope.rule.destinationIpType = 'destinationIp';
            } else if ($scope.rule instanceof ACLv6PolicyRule) {
              $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                return item.type.toLowerCase() === 'dataipv6prefix' && item.infoTag !== 'Webex';
              });
              $scope.rule.sourceIpType = 'sourceIpv6';
              $scope.rule.destinationIpType = 'destinationIpv6';
            } else {
              if ($scope.rule.sequenceIpType === 'ipv4') {
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'dataprefix' && item.infoTag !== 'Webex';
                });
                $scope.rule.sourceIpType = 'sourceIp';
                $scope.rule.destinationIpType = 'destinationIp';
              } else if($scope.rule.sequenceIpType === 'fqdn'){
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  if(item.type.toLowerCase() === 'dataprefix'){
                    if(!item.name.contains("IPv4:")){
                      item.name =  "IPv4:" + item.name;
                    }
                    return true;
                  } else if(item.type.toLowerCase() === 'fqdn'){
                    if(!item.name.contains("FQDN:")) {
                      item.name = "FQDN:" + item.name;
                    }
                    return true;
                  } else {
                    return false;
                  }
                });

                $scope.dataPrefixList.sourcePrefixListItems = angular.copy($scope.dataPrefixList.prefixListItems );
                $scope.dataPrefixList.destinationPrefixListItems = angular.copy($scope.dataPrefixList.prefixListItems );

                if($scope.rule.match.sourceFqdnList){
                  $scope.rule.match.sourceFqdnList = getTransformFqdnListNames($scope.rule.match.sourceFqdnList);
                }

                if($scope.rule.match.destinationFqdnList){
                  $scope.rule.match.destinationFqdnList = getTransformFqdnListNames($scope.rule.match.destinationFqdnList);
                }

                $scope.rule.sourceIpType = 'sourceFqdn';
                $scope.rule.destinationIpType = 'destinationFqdn';
              } else if ($scope.rule.sequenceIpType === 'ipv6') {
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'dataipv6prefix';
                });
                $scope.rule.sourceIpType = 'sourceIpv6';
                $scope.rule.destinationIpType = 'destinationIpv6';
              }  else {
                $scope.dataPrefixList.prefixListItems = $scope.dataPrefixList.listItems;
              }
            }

            $scope.policerList = PolicerListManager.getInstance();
            $scope.tlocList = TLOCListManager.getInstance();
            $scope.vpnList = VPNListManager.getInstance();
            $scope.slaClassList = SLAClassListManager.getInstance();
            $scope.preferredColorGrp = PreferredColorListManager.getInstance();

            if ($scope.rule.action.slaClass && !$scope.rule.action.slaClass.fallbackToBestPath) {
              $scope.rule.action.slaClass.fallbackToBestPath = LOAD_BALANCE;
            }
            $scope.slaClassList.onSlaSelect = function(item) {
              if(angular.isDefined($scope.rule.action.slaClass.fallbackToBestPath) && $scope.rule.action.slaClass.fallbackToBestPath !== null && $scope.rule.action.slaClass.fallbackToBestPath === 'fallbackToBestPath' && item && item.entries && item.entries[0] && !item.entries[0].hasOwnProperty('fallbackBestTunnel')){
                notification.error($translate.instant('configuration.policy.sLAClassSelectedDoesNotHaveFallbackBestTunnelEnabled'));
              }
            };
            $scope.siteList = SiteListManager.getInstance();
            $scope.regionList = RegionListManager.getInstance();
            $scope.regionList.onRegionSelect = function() {
              //on selecting region, clear the regionId(if any ivalid regionId is present)
              $scope.rule.match.regionId = '';
            }

            $scope.pathTypeList = PolicyPathTypes.options;
            $scope.trafficToList = PolicyTrafficTo.options;
            $scope.roleList = PolicyRegionRoles.options;

            $scope.prefixList = PrefixListManager.getInstance();
            $scope.prefixList.type = ($scope.rule.sequenceIpType === 'ipv4') ? 'prefix' : 'ipv6prefix';
            $scope.prefixList.customFormatter = function(item) {
              // To format the prefix list name's preview data
              // to be shown as, 10.0.0.0/12 le 32
              for(let i = 0; i < item.entries.length; i++) {
                let keys = Object.keys(item.entries[i]);
                let previewValue = "";
                for( let j = 0; j < keys.length; j++){
                  if(['$$hashKey', 'name'].includes(keys[j])) {
                    continue;
                  }
                  if(j == 1) {
                    previewValue = previewValue + ' ' + keys[j] + ' ' + item.entries[i][keys[j]];
                  } else {
                    previewValue = previewValue + ' ' + item.entries[i][keys[j]];
                  }
                }
                item.entries[i].name = previewValue;
              }
            };
            if ($scope.rule.sequenceIpType === 'ipv4') {
              $scope.prefixList.prefixListItems = _.filter($scope.prefixList.listItems, function(item) {
                return item.type === 'prefix';
              });
            } else if ($scope.rule.sequenceIpType === 'fqdn') {
              $scope.prefixList.prefixListItems = _.filter($scope.prefixList.listItems, function(item) {
                return (item.type === 'fqdn' || item.type === 'prefix') ;
              });
            } else if ($scope.rule.sequenceIpType === 'ipv6') {
              $scope.prefixList.prefixListItems = _.filter($scope.prefixList.listItems, function(item) {
                return item.type === 'ipv6prefix';
              });
            } else {
              $scope.prefixList.prefixListItems = $scope.prefixList.listItems;
            }
            $scope.colors = TLOCListManager.getInstance().colors;
            $scope.serviceTypes = angular.copy(setServiceTypes.options);
            if($scope.rule.type === 'route') {
              $scope.serviceTypes = _.filter($scope.serviceTypes, function(service) {
                return service.key !== 'appqoe';
              });
            }
            $scope.carriers = policyRuleCarrier.options;
            if($scope.rule instanceof VedgeRoutePolicyRule) {
              $scope.originList = policyRuleOriginVedge.options;
            } else {
              $scope.originList = policyRuleOrigin.options;
            }
            $scope.plpList = PLP.options;
            $scope.servicechainList = serviceChainTypes;
            $scope.tlocEncapList = tlocEncap.options;
            $scope.tlocActionList = tlocActions.options;
            $scope.mirror = MirrorListManager.getInstance();
            $scope.class = ClassMapListManager.getInstance();
            $scope.asPathList = ASPathListManager.getInstance();
            $scope.communityList = CommunityListManager.getInstance();
            // Expanded community list
            $scope.expandedCommunityList = angular.copy($scope.communityList);
            $scope.communityList.listItems = $scope.communityList.listItems.filter(function(item) {
              return item.type === 'community';
            });
            $scope.expandedCommunityList.listItems = $scope.expandedCommunityList.listItems.filter(function(item) {
              return item.type === 'expandedCommunity';
            });
            $scope.expandedCommunityList.type = 'expandedCommunity';
            $scope.extCommunityList = ExtCommunityListManager.getInstance();
            $scope.appProtocolList = AppProtocolListManager.getInstance();
            $scope.appProtocolListItems = [];
            angular.forEach($scope.appProtocolList.listItems, function (item) {
              $scope.appProtocolListItems.push(Object.values(item)[0]);
            });
            $scope.appProtocolListItems.sort(function (a, b) {
              return a.name.localeCompare(b.name);
            });
            if ($scope.rule.match.matchOrder.includes('appProtocol') && !appUtil.isUndefinedOrEmpty($scope.rule.match.appProtocol)) {
              angular.forEach($scope.rule.match.appProtocol, function (protocol) {
                var foundObj = _.find($scope.appProtocolListItems, {name: protocol['name']});
                if (foundObj) {
                  for (var prop in foundObj) {
                    if (!angular.equals(prop, '$$hashKey')) {
                      protocol[prop] = foundObj[prop];
                    }
                  }
                }
              });
            }
            // Get all the matching ICMP entries from the list.
            // And populate in the Edit screen
            $scope.getEntriesByValue = function(obj, type) {
              var _icmpMessages = obj.split(' ');
              var icmpMessageLists = [];
              for(var i = 0; i < _icmpMessages.length; i++) {
                // Filterout the actual icmpMessage
                var icmpMessageObject = icmpMessages[type].find(function(o){
                  return o.entries[0].value === _icmpMessages[i];
                });
                icmpMessageLists.push(icmpMessageObject);
              }
              return icmpMessageLists;
            };

            if($scope.rule.match.icmpMessage && !$scope.rule.match.icmpMessage.lists && $scope.rule.sequenceIpType === 'ipv4') {
              $scope.rule.match.icmpMessage = {
                lists: $scope.getEntriesByValue($scope.rule.match.icmpMessage, 'icmpMessage')
              }
            }
            if($scope.rule.match.icmp6Message && !$scope.rule.match.icmp6Message.lists && $scope.rule.sequenceIpType === 'ipv6') {
              $scope.rule.match.icmpMessage = {
                lists: $scope.getEntriesByValue($scope.rule.match.icmp6Message, 'icmp6Message')
              }
            }
            if($scope.rule.match.icmp6Message && !$scope.rule.match.icmp6Message.lists && $scope.rule.sequenceIpType === 'all') {
              var icmpMessage = $scope.getEntriesByValue($scope.rule.match.icmpMessage, 'icmpMessage');
              var icmp6Message = $scope.getEntriesByValue($scope.rule.match.icmp6Message, 'icmp6Message')
              var icmpMessageList = icmpMessage.concat(icmp6Message)
              $scope.rule.match.icmpMessage = {
                lists:icmpMessageList
              }
            }
            // -------- on load, add match rules as needed ---------
            if ($scope.rule) {
              if ($scope.rule.readOnly) {
                compileReadOnlyRulesTemplate($scope.rule.match.matchOrder, 'match', $element, $scope);
                compileReadOnlyRulesTemplate($scope.rule.action.actionOrder, 'action', $element, $scope);
                checkAndUpdateReadonlyHeight($element, true, $scope); //true for readOnly
              } else {

                if($scope.rule instanceof DeviceACLv4PolicyRule || $scope.rule instanceof DeviceACLv6PolicyRule) {
                  // Device access protocol is a required field for all device ACLs
                  $scope.rule.match.matchOrder.push('deviceAccessProtocol');
                }

                compileRulesTemplate($scope.rule.match.matchOrder, 'match', $element, $scope);
                compileRulesTemplate($scope.rule.action.actionOrder, 'action', $element, $scope);
                //checkAndUpdateHeight($element, $scope); //true for readOnly
              }
            }
            $($element).find('.policy-rule-match').bind('click', function () {
              $scope.rule.match.enabled = true;
              $scope.rule.action.enabled = false;
            })
            $($element).find('.policy-rule-action').bind('click', function () {
              $scope.rule.match.enabled = false;
              $scope.rule.action.enabled = true;
            })
          },

          /**
           * @ngdoc method
           * @name vManage.directive:policyRule#post
           * @params{Scope} $scope
           * @params{Element} $element
           * @params{Attributes} $attrs
           * @returns {Void}
           * @description post method of directive - same as link function
           */
          post: function ($scope, $element, $attrs) {
            var setParameterIds = ['select-rule_set_dscp', 'select-rule_set_fwd_class', 'select-rule_set_local_tloc',
              'select-rule_set_local_tloc_list', 'select-rule_set_next_hop', 'select-rule_set_policer', 'select-rule_set_service',
              'select-rule_set_tloc_action', 'select-rule_set_tloc', 'select-rule_set_tloc_list', 'select-rule_set_vpn',
              'select-rule_set_preference', 'select-rule_set_omp_tag', 'select-rule_nat_pool', 'select-rule_nat_vpn', 'select-rule_redirectDns',
              'select-rule_set_ospf_tag', 'select-rule_set_origin', 'select-rule_lossProtect'];

            var excludedMatchFieldIdsIpv6 = ['select-rule_dns'];

            var excludedMatchFieldIdsBoth = ['select-rule_dns',
              'select-rule_source_data_prefix', 'select-rule_destination_data_prefix', 'select-rule_prefix_list', 'select-rule_address', 'select-rule_next_hop'];

            var excludedActionFieldIdsIpv6 = ['select-rule_lossProtect', 'select-rule_nat_pool', 'select-rule_nat_vpn', 'select-rule_redirectDns',
              'select-rule_set_service', 'select-rule_appqoe_optimization'];

            var excludedActionFieldIdsBoth = ['select-rule_lossProtect', 'select-rule_nat_pool', 'select-rule_nat_vpn', 'select-rule_redirectDns',
              'select-rule_set_service', 'select-rule_appqoe_optimization', 'select-rule_set_next_hop'];

            var excludedMatchesIpv6 = ['dns'];
            var excludedMatchesBoth = ['dns', 'sourceDataPrefixList', 'sourceIp', 'destinationDataPrefixList', 'destinationIp', 'prefixList', 'address', 'nextHop'];
            var excludedActionsIpv6 = ['lossProtect', 'natPool', 'natVPN', 'redirectDns', 'setService', 'appqoeOptimization'];
            var excludedActionsBoth = ['lossProtect', 'natPool', 'natVPN', 'redirectDns', 'setService', 'appqoeOptimization', 'setNexthop'];
            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#calcForwardToggle
             * @params{Element} spanEle
             * @returns {Boolean}
             * @description method to calculate whether the left and right scrolls needs to be visible
             */
            $scope.calcForwardToggle = function (spanEle) {
              return (($($element).find(spanEle).prop('scrollWidth') - 5) > $($element).find(spanEle).width());
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#tagScrollRight
             * @params{Element} spanEle
             * @returns {Void}
             * @description method to scroll the tags to right
             */
            $scope.tagScrollRight = function (spanEle) {
              var currentScrollPos = $($element).find(spanEle).scrollLeft();
              if (currentScrollPos == 0) {
                $($element).find(spanEle).scrollLeft(200);
              } else {
                $($element).find(spanEle).scrollLeft(currentScrollPos + 200);
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#tagScrollLeft
             * @params{Element} spanEle
             * @returns {Void}
             * @description method to scroll the tags to left
             */
            $scope.tagScrollLeft = function (spanEle) {
              var currentScrollPos = $($element).find(spanEle).scrollLeft();
              if (currentScrollPos != 0) {
                $($element).find(spanEle).scrollLeft(currentScrollPos - 200);
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addMatchField
             * @params{MouseEvent} event
             * @params{String} elemId
             * @params{Object} matchField
             * @params{Object} matchModelObj
             * @returns {Void}
             * @description method to add match field
             */
            $scope.addMatchField = function (event, elemId, matchField, matchModelObj) {
              if (matchField === 'regionList' && $scope.rule.match.matchOrder.includes('siteList')) {
                notification.error($translate.instant('configuration.policy.siteAndRegionAreMutuallyExclusivePleasedeleteSite'));
                return;
              }
              if (matchField === 'siteList' && $scope.rule.match.matchOrder.includes('regionList')) {
                notification.error($translate.instant('configuration.policy.siteAndRegionAreMutuallyExclusivePleaseDeleteRegion'));
                return;
              }

              // $(event.target).toggleClass('active');
              if (!$element.find('.policy-rule-match').not('.readonly').has('#select-rule_' + elemId).length) {
                if (angular.isArray($scope.rule.match[matchModelObj])) {
                  $scope.rule.match[matchModelObj].reset();
                }
                else if (angular.isObject($scope.rule.match[matchModelObj])) {
                  for (var propKey in $scope.rule.match[matchModelObj]) {
                    $scope.rule.match[matchModelObj][propKey] = null;
                  }
                }
                else {
                  if (matchModelObj === 'source') {
                    $scope.rule.match['sourcePort'] = null;
                  } else if (matchModelObj === 'destination') {
                    $scope.rule.match['destinationPort'] = null;
                  } else {
                    $scope.rule.match[matchModelObj] = null;
                  }
                }
                $scope.rule.match.matchOrder.push(matchField);
                compileRulesTemplate([matchField], 'match', $element, $scope, $scope.rule.match.matchOrder.length);
                //checkAndUpdateHeight($element, $scope);
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addActionField
             * @params{MouseEvent} event
             * @params{String} elemId
             * @params{Object} actionField
             * @params{Object} actionModelObj
             * @returns {Void}
             * @description method to add action field
             */
            $scope.addActionField = function (event, elemId, actionField, actionModelObj) {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_' + elemId).length) {
                //set ng-model to null
                if (actionField.startsWith('set') || actionField.startsWith('nat')) {
                  var paramKey = 'set';
                  (actionField.startsWith('nat')) ? paramKey = 'nat' : 0;
                  var setKey = policyConstants.SET_ACTION_KEYS[actionField];
                  if (angular.isObject($scope.rule.action[paramKey][setKey])) {
                    for (var entityKey in  $scope.rule.action[paramKey][setKey]) {
                      if (angular.isArray($scope.rule.action[paramKey][setKey][entityKey])) {
                        $scope.rule.action[paramKey][setKey][entityKey].reset();
                      } else {
                        $scope.rule.action[paramKey][setKey][entityKey] = null;
                      }
                    }
                    if('serviceChain' === setKey){
                      $scope.rule.action[paramKey][setKey].restrict = true;
                      $scope.rule.action[paramKey][setKey].tloc = {
                        "ip": null,
                        "color": null,
                        "encap": null
                      };
                    }
                  } else {
                    $scope.rule.action[paramKey][setKey] = null;
                  }
                }
                else if (angular.isArray($scope.rule.action[actionModelObj])) {
                  $scope.rule.action[actionModelObj].reset();
                }
                else if (angular.isObject($scope.rule.action[actionModelObj])) {
                  for (var propKey in $scope.rule.action[actionModelObj]) {
                    if (angular.isArray($scope.rule.action[actionModelObj][propKey])) {
                      $scope.rule.action[actionModelObj][propKey].reset();
                    } else {
                      $scope.rule.action[actionModelObj][propKey] = null;
                    }
                  }
                  if('serviceChain' in $scope.rule.action){ //for local acl policy
                    $scope.rule.action.serviceChain.restrict = true;
                  }
                }
                else {
                  $scope.rule.action[actionModelObj] = null;
                }

                //Preferred color group and Local TLOC are mutually exclusive.
                if (actionField === 'preferredColorGroup' && $scope.rule.action.actionOrder.includes('setLocalTLOCList')) {
                  notification.error($translate.instant('configuration.policy.preferredColorGroupAndLocalTLOCAreMutuallyExclusive'));
                  return;
                }else if(actionField === 'setLocalTLOCList' && $scope.rule.action.actionOrder.includes('preferredColorGroup')) {
                  notification.error($translate.instant('configuration.policy.preferredColorGroupAndLocalTLOCAreMutuallyExclusiveDeleteColor'));
                  return;
                }else if(actionField === 'setServiceChain' && $scope.rule.action.actionOrder.includes('setNexthop') || 
                actionField === 'setNexthop' && $scope.rule.action.actionOrder.includes('setServiceChain')
                ) {
                  notification.error($translate.instant('configuration.policy.serviceChainAndNextHopAreMutuallyExclusive'));
                  return;
                }else if(actionField === 'setServiceChain' && $scope.rule.action.actionOrder.includes('setService') ||
                actionField === 'setService' && $scope.rule.action.actionOrder.includes('setServiceChain')) {
                  notification.error($translate.instant('configuration.policy.ServiceAndServiceChainAreMutuallyExclusive'));
                  return;
                }else if(actionField === 'serviceChain' && $scope.rule.action.actionOrder.includes('setNexthop') || 
                actionField === 'setNexthop' && $scope.rule.action.actionOrder.includes('serviceChain')) {
                  notification.error($translate.instant('configuration.policy.serviceChainAndNextHopAreMutuallyExclusive'));
                  return;
                }else if((actionField === 'setTLOCList' || actionField === 'setVPN') && $scope.rule.action.actionOrder.includes('setServiceChain') &&
                !$scope.rule.action.set.serviceChain.local) {
                  let field = actionField === 'setTLOCList'? 'TLOC ' : 'VPN ';
                  notification.error(`${field + $translate.instant('configuration.policy.TLOCOrVPNCannotBeConfiguredIfServiceChainRemoteIsEnabled')}`);
                  return;
                }else if(actionField === 'setServiceChain' && !$scope.rule.action.set.serviceChain.local && (['setTLOCList', 'setVPN'].some(actionName => $scope.rule.action.actionOrder.includes(actionName)))){
                  notification.error($translate.instant('configuration.policy.VPNorTLOCExistCannotConfigureServiceChain'));
                  return;
                }

                $scope.rule.action.actionOrder.push(actionField);
                compileRulesTemplate([actionField], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                //checkAndUpdateHeight($element, $scope);
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addActionField
             * @params{MouseEvent} event
             * @params{String} elemId
             * @params{Object} actionField
             * @params{Object} actionModelObj
             * @returns {Void}
             * @description method to add action field
             */
            $scope.addAccept = function () {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_accept').length) {
                $scope.rule.action.accept = true;
                $scope.rule.action.actionOrder.splice(0, 0, 'accept');
                compileRulesTemplate(['accept'], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                if ($scope.rule.action.hasOwnProperty('drop')) {
                  $scope.rule.action.drop = false;
                  $scope.removeActionElementById('drop', 'select-rule_drop');
                }
                if ($scope.rule.action.hasOwnProperty('reject')) {
                  $scope.rule.action.reject = false;
                  $scope.removeActionElementById('reject', 'select-rule_reject');
                }
                //checkAndUpdateHeight($element, $scope);
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addDrop
             * @returns {Void}
             * @description method to add drop
             */
            $scope.addDrop = function () {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_drop').length) {
                $scope.rule.action.drop = true;
                $scope.rule.action.actionOrder.splice(0, 0, 'drop');
                compileRulesTemplate(['drop'], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                if ($scope.rule.action.hasOwnProperty('pass')) {
                  $scope.rule.action.pass = false;
                  $scope.removeActionElementById('pass', 'select-rule_pass');
                }
                if ($scope.rule.action.hasOwnProperty('inspect')) {
                  $scope.rule.action.inspect = false;
                  $scope.removeActionElementById('inspect', 'select-rule_inspect');
                }
                if ($scope.rule.action.hasOwnProperty('accept')) {
                  $scope.rule.action.accept = false;
                  removeAccept();
                }
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addReject
             * @returns {Void}
             * @description method to add reject
             */
            $scope.addReject = function () {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_reject').length) {
                $scope.rule.action.accept = false;
                $scope.rule.action.reject = true;
                $scope.rule.action.actionOrder.splice(0, 0, 'reject');
                compileRulesTemplate(['reject'], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                removeAccept();
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addReject
             * @returns {Void}
             * @description method to add reject
             */
            $scope.addInspect = function () {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_inspect').length) {
                $scope.rule.action.inspect = true;
                $scope.rule.action.actionOrder.splice(0, 0, 'inspect');
                compileRulesTemplate(['inspect'], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                if ($scope.rule.action.hasOwnProperty('drop')) {
                  $scope.rule.action.drop = false;
                  $scope.removeActionElementById('drop', 'select-rule_drop');
                }
                if ($scope.rule.action.hasOwnProperty('pass')) {
                  $scope.rule.action.pass = false;
                  $scope.removeActionElementById('pass', 'select-rule_pass');
                }
                if ($scope.rule.action.hasOwnProperty('log')) {
                  $scope.removeActionElementById('log', 'select-rule_log');
                }
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#addReject
             * @returns {Void}
             * @description method to add reject
             */
            $scope.addPass = function () {
              if (!$element.find('.policy-rule-action').not('.readonly').has('#select-rule_pass').length) {
                $scope.rule.action.pass = true;
                $scope.rule.action.actionOrder.splice(0, 0, 'pass');
                compileRulesTemplate(['pass'], 'action', $element, $scope, $scope.rule.action.actionOrder.length);
                if ($scope.rule.action.hasOwnProperty('drop')) {
                  $scope.rule.action.drop = false;
                  $scope.removeActionElementById('drop', 'select-rule_drop');
                }
                if ($scope.rule.action.hasOwnProperty('inspect')) {
                  $scope.rule.action.inspect = false;
                  $scope.removeActionElementById('inspect', 'select-rule_inspect');
                }
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#onIpTypeChange
             * @returns {Void}
             * @description method to handle IP type change
             */
            $scope.onIpTypeChange = function () {
              removeFieldsByIpType($scope.rule.sequenceIpType);
              setPrefixListItems();
              if (!_.isUndefined($scope.rule.match.sourceDataPrefixList)) {
                $scope.rule.match.sourceDataPrefixList = null;
              }
              if (!_.isUndefined($scope.rule.match.destinationDataPrefixList)) {
                $scope.rule.match.destinationDataPrefixList = null;
              }
              if (!_.isUndefined($scope.rule.match.prefixList)) {
                $scope.rule.match.prefixList = null;
              }
              if (!_.isUndefined($scope.rule.match.address)) {
                $scope.rule.match.address = null;
              }
              if (!_.isUndefined($scope.rule.match.nextHop)) {
                $scope.rule.match.nextHop = null;
              }

              if($scope.getICMPCriteria()) {
                $scope.icmpMessageList = $scope.getICMPMessage();
                $scope.updateICMP();
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeFieldsByIpType
             * @global
             * @returns {Void}
             * @description method to remove fields which are not applicable for chosen ip type
             */
            var removeFieldsByIpType = function (type) {
              if (type === 'ipv6') {
                $scope.removeIpv6Fields();
              } else if (type === 'all') {
                $scope.removeBothFields();
              }
            };

            $scope.removeIpv6Fields = function () {
              $scope.removeIpv6MatchFields();
              $scope.removeIpv6ActionFields();
              checkAndUpdateHeight($element, $scope);
            };

            $scope.removeIpv6MatchFields = function () {
              angular.forEach(excludedMatchFieldIdsIpv6, function (matchFieldId) {
                $scope.removeMatchElementById(undefined, matchFieldId);
              });
              $scope.removeMatchElementsFromOrder(excludedMatchesIpv6);
            };

            $scope.removeIpv6ActionFields = function () {
              angular.forEach(excludedActionFieldIdsIpv6, function (actionFieldId) {
                $scope.removeActionElementById(undefined, actionFieldId);
              });
              $scope.removeActionElementsFromOrder(excludedActionsIpv6);
            };

            $scope.removeBothFields = function () {
              $scope.removeBothMatchFields();
              $scope.removeBothActionFields();
              checkAndUpdateHeight($element, $scope);
            };

            $scope.removeBothMatchFields = function () {
              angular.forEach(excludedMatchFieldIdsBoth, function (matchFieldId) {
                $scope.removeMatchElementById(undefined, matchFieldId);
              });
              $scope.removeMatchElementsFromOrder(excludedMatchesBoth);
            };

            $scope.removeBothActionFields = function () {
              angular.forEach(excludedActionFieldIdsBoth, function (actionFieldId) {
                $scope.removeActionElementById(undefined, actionFieldId);
              });
              $scope.removeActionElementsFromOrder(excludedActionsBoth);
            };

            var setPrefixListItems = function() {
              if ($scope.rule.sequenceIpType === 'ipv4') {
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'dataprefix';
                });
                $scope.prefixList.prefixListItems = _.filter($scope.prefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'prefix';
                });
                $scope.prefixList.type = 'prefix';
                $scope.rule.sourceIpType = 'sourceIp';
                $scope.rule.destinationIpType = 'destinationIp';
              }  else if ($scope.rule.sequenceIpType === 'fqdn') {
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'dataprefix' || item.type.toLowerCase() === 'fqdn';
                });
                $scope.rule.sourceIpType = 'sourceFqdn';
                $scope.rule.destinationIpType = 'destinationFqdn';
              } else if ($scope.rule.sequenceIpType === 'ipv6') {
                $scope.dataPrefixList.prefixListItems = _.filter($scope.dataPrefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'dataipv6prefix';
                });
                $scope.prefixList.prefixListItems = _.filter($scope.prefixList.listItems, function(item) {
                  return item.type.toLowerCase() === 'ipv6prefix';
                });
                $scope.prefixList.type = 'ipv6prefix';
                $scope.rule.sourceIpType = 'sourceIpv6';
                $scope.rule.destinationIpType = 'destinationIpv6';
              } else {
                $scope.dataPrefixList.prefixListItems = $scope.dataPrefixList.listItems;
                $scope.prefixList.prefixListItems = $scope.prefixList.listItems;
              }
            };
            $scope.removeMatchElementsFromOrder = function (matchElements) {
              angular.forEach($scope.rule.match.matchOrder, function (orderEntity, index) {
                if (_.indexOf(matchElements, orderEntity) > -1) {
                  $scope.rule.match[orderEntity] = null;
                  $scope.rule.match.matchOrder[index] = null;
                }
              });
              $scope.rule.match.matchOrder = _.values(_.chain($scope.rule.match.matchOrder).uniq().omit(_.isUndefined).omit(_.isNull).value());
            };

            $scope.removeActionElementsFromOrder = function (actionElements) {
              angular.forEach($scope.rule.action.actionOrder, function (orderEntity, index) {
                if (_.indexOf(actionElements, orderEntity) > -1) {
                  if (orderEntity.startsWith('set') || orderEntity.startsWith('nat')) {
                    var paramKey = 'set';
                    (orderEntity.startsWith('nat')) ? paramKey = 'nat' : 0;

                    var setKey = policyConstants.SET_ACTION_KEYS[orderEntity];

                    if (angular.isObject($scope.rule.action[paramKey][setKey])) {
                      for (var entityKey in  $scope.rule.action[paramKey][setKey]) {
                        $scope.rule.action[paramKey][setKey][entityKey] = null;
                      }
                    } else {
                      $scope.rule.action[paramKey][setKey] = null;
                    }
                  } else {
                    $scope.rule.action[orderEntity] = null;
                  }
                  // ---------- for deletion ----------
                  $scope.rule.action.actionOrder[index] = null;
                }
              });
              $scope.rule.action.actionOrder = _.values(_.chain($scope.rule.action.actionOrder).uniq().omit(_.isUndefined).omit(_.isNull).value());
            };

            $scope.getProtocolName = function(protocolId, protocolOptions)  {

              if (!protocolOptions || !protocolId) {
                return;
              }

              var protocol = protocolOptions.find(function(protocol) {
                return protocolId === protocol.value
              });

              return protocol.key;
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#collapse
             * @returns {Void}
             * @description method to collapse a rule
             */
            $scope.collapse = function () {
              if ($element.find('.policy-rule-match.readonly').children('[collapsible]').hasClass('ng-hide') ||
                $element.find('.policy-rule-action.readonly').children('[collapsible]').hasClass('ng-hide')) {
                $element.find('.policy-rule-match.readonly').children('[collapsible]').removeClass('ng-hide');
                $element.find('.policy-rule-action.readonly').children('[collapsible]').removeClass('ng-hide');
                $element.find('.fa-chevron-down').addClass('fa-chevron-up');
                $element.find('.fa-chevron-down').removeClass('fa-chevron-down');
                checkAndUpdateReadonlyHeight($element, false, $scope); //true for readOnly
              } else {
                $element.find('.policy-rule-match.readonly').children('[collapsible]').addClass('ng-hide');
                $element.find('.policy-rule-action.readonly').children('[collapsible]').addClass('ng-hide');
                $element.find('.fa-chevron-up').addClass('fa-chevron-down');
                $element.find('.fa-chevron-up').removeClass('fa-chevron-up');
                checkAndUpdateReadonlyHeight($element, true, $scope); //true for readOnly
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#collapseElements
             * @global
             * @returns {Void}
             * @description method to collpase rule elements
             */
            var collapseElements = function () {
              $element.find('.policy-rule-match.readonly').children('[collapsible]').addClass('ng-hide');
              $element.find('.policy-rule-action.readonly').children('[collapsible]').addClass('ng-hide');
              $element.find('.fa-chevron-up').addClass('fa-chevron-down');
              $element.find('.fa-chevron-up').removeClass('fa-chevron-up');
              checkAndUpdateReadonlyHeight($element, true, $scope); //true for readOnly
            }

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeActionElementById
             * @params{Object} orderEntity
             * @params{String} elemId
             * @returns {Void}
             * @description method to remove action elements by its ID
             */
            $scope.removeActionElementById = function (orderEntity, elemId) {
              var indexOfEntity = $scope.rule.action.actionOrder.indexOf(orderEntity);
              if (indexOfEntity > -1) {
                $scope.rule.action.actionOrder.splice(indexOfEntity, 1);
              }
              removeModelController($element, $scope, '#' + elemId);

              if ($element.find('.policy-rule-action').not('.readonly').find('#' + elemId).length) {
                $element.find('.policy-rule-action').not('.readonly').find('#' + elemId).remove();
              }
              if ($element.find('.policy-rule-action.readonly').find('#' + elemId).length) {
                $element.find('.policy-rule-action.readonly').find('#' + elemId).remove();
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeMatchElementById
             * @params{Object} orderEntity
             * @params{String} elemId
             * @returns {Void}
             * @description method to remove match elements by its ID
             */
            $scope.removeMatchElementById = function (orderEntity, elemId) {
              var indexOfEntity = $scope.rule.match.matchOrder.indexOf(orderEntity);
              if (indexOfEntity > -1) {
                $scope.rule.match.matchOrder.splice(indexOfEntity, 1);
              }
              removeModelController($element, $scope, '#' + elemId);

              if ($element.find('.policy-rule-match').not('.readonly').find('#' + elemId).length) {
                $element.find('.policy-rule-match').not('.readonly').find('#' + elemId).remove();
              }
              if ($element.find('.policy-rule-match.readonly').find('#' + elemId).length) {
                $element.find('.policy-rule-match.readonly').find('#' + elemId).remove();
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeElement
             * @params{MouseEvent} event
             * @params{Object} orderEntity
             * @params{String} entity
             * @returns {Void}
             * @description method to remove elements
             */
            $scope.removeElement = function (event, orderEntity, entity) {
              $('.policy-tag.' + orderEntity).toggleClass('active');
              var elemId = $(event.target).closest('.select-rule').attr('id');

              // ---------- remove ngmodel controller from form controller ----------
              removeModelController($element, $scope, $(event.target).closest('.select-rule'))

              // --------- remove rule match/action ----------
              $(event.target).closest('.select-rule').remove();
              if (entity === 'accept') {
                removeAccept();
                return;
              }
              var indexOfEntity = $scope.rule.match.matchOrder.indexOf(orderEntity === 'class_match' ? 'class' : orderEntity);
              if (indexOfEntity > -1) {
                // --------- set ng-model to null ----------
                if (angular.isObject($scope.rule.match[entity])) {
                  for (var entityKey in $scope.rule.match[entity]) {
                    $scope.rule.match[entity][entityKey] = null;
                  }
                  if (orderEntity == 'sourceDataPrefixList') {
                    $scope.rule.match['sourceIp'] = '';
                    $scope.rule.sourceIpType = 'sourceIp';
                  } else if (orderEntity == 'destinationDataPrefixList') {
                    $scope.rule.match['destinationIp'] = '';
                    $scope.rule.destinationIpType = 'destinationIp';
                  } else if(orderEntity === 'protocol') {
                    $scope.rule.match.icmpMessage.lists = [];
                  }
                } else {
                  if (orderEntity === 'source') {
                    $scope.rule.match['sourcePort'] = null;
                  } else if (orderEntity === 'destination') {
                    $scope.rule.match['destinationPort'] = null;
                  } else if (orderEntity === 'tlocList') {
                    $scope.rule.match[entity] = null;
                    if(angular.isDefined($scope.rule.match.tloc)){
                      $scope.rule.match.tloc.ip = null;
                      $scope.rule.match.tloc.color = null;
                      $scope.rule.match.tloc.encap = null;
                    }
                  } else if (orderEntity == 'sourceDataPrefixList') {
                    $scope.rule.match['sourceIp'] = '';
                    $scope.rule.sourceIpType = 'sourceIp';
                  } else if (orderEntity == 'destinationDataPrefixList') {
                    $scope.rule.match['destinationIp'] = '';
                    $scope.rule.destinationIpType = 'destinationIp';
                  } else {
                    $scope.rule.match[entity] = null;
                  }
                }
                $scope.rule.match.matchOrder.splice(indexOfEntity, 1);

                // --------- remove readOnly match if exists ---------
                if ($element.find('.policy-rule-match.readonly').find('#' + elemId).length) {
                  $element.find('.policy-rule-match.readonly').find('#' + elemId).remove();
                }
                // --------- check if element is in collapsible container ----------
                else if ($element.find('.policy-rule-match.readonly').children('[collapsible]').find('#' + elemId).length) {
                  $element.find('.policy-rule-match.readonly').children('[collapsible]').find('#' + elemId).remove();
                }
              }
              indexOfEntity = $scope.rule.action.actionOrder.indexOf(orderEntity === 'class_action' ? 'class' : orderEntity);
              if (indexOfEntity > -1) {
                // --------- set ng-model to null ----------
                if (orderEntity.startsWith('set') || orderEntity.startsWith('nat')) {
                  var paramKey = 'set';
                  (orderEntity.startsWith('nat')) ? paramKey = 'nat' : 0;

                  var setKey = policyConstants.SET_ACTION_KEYS[orderEntity];
                  if(setKey === 'localTlocList'){
                    $scope.rule.action[paramKey][setKey].restrict = false;
                    $scope.rule.action[paramKey][setKey].color = [];
                    $scope.rule.action[paramKey][setKey].encap = [];
                  }else if (angular.isObject($scope.rule.action[paramKey][setKey])) {
                    for (var entityKey in  $scope.rule.action[paramKey][entity]) {
                      $scope.rule.action[paramKey][entity][entityKey] = null;
                    }
                  } else {
                    $scope.rule.action[paramKey][entity] = null;
                    // ----------- quick fix for https://telsiz.atlassian.net/browse/VIP-25742 ---------
                    if (setKey === 'tlocList') {
                      $scope.rule.action[paramKey].tloc.ip = null;
                      $scope.rule.action[paramKey].tloc.color = null;
                      $scope.rule.action[paramKey].tloc.encap = null;
                    }
                  }
                }else if(entity === "preferredColorGroup"){
                  $scope.rule.action.preferredColorGroup = null;
                }
                else if (angular.isObject($scope.rule.action[entity])) {
                  for (var entityKey in  $scope.rule.action[entity]) {
                    $scope.rule.action[entity][entityKey] = null;
                  }
                  if (orderEntity === 'slaClass') {
                    $scope.rule.action.slaClass['preferredColor'] = [];
                    $scope.rule.action.slaClass['preferredColorGroup'] = [];
                    $scope.rule.action.slaClass['preferredColorGroup'].colorRestrict = false;
                    //click "SLA Class List" Action. on close of "SLA Class List" action rule.action.slaClass.fallbackToBestPath value is being set to empty which is disabling the Action "Backup SLA Preferred Color" button.
                    //Setting it to LOAD_BALANCE, so the Action "Backup SLA Preferred Color" button will be enabled.
                    $scope.rule.action.slaClass.fallbackToBestPath = LOAD_BALANCE;
                  }
                  //select both slaClass and backupSlaPrefferedColor Actions and select some value in backup sla which disables the sla not met radio buttons.
                  //Now close the Action backup sla, sla not met radio buttons are not enabled. so clearing the backup sla array on closing the Action.
                  if (orderEntity === 'backupSlaPreferredColor') {
                    $scope.rule.action['backupSlaPreferredColor'] = [];
                  }
                } else {
                  $scope.rule.action[entity] = null;
                }
                $scope.rule.action.actionOrder.splice(indexOfEntity, 1);

                // ---------- remove readOnly action if exists ----------
                if ($element.find('.policy-rule-action.readonly').find('#' + elemId).length) {
                  $element.find('.policy-rule-action.readonly').find('#' + elemId).remove();
                }
                // ---------- check if element is in collapsible container ----------
                else if ($element.find('.policy-rule-action.readonly').children('[collapsible]').find('#' + elemId).length) {
                  $element.find('.policy-rule-action.readonly').children('[collapsible]').find('#' + elemId).remove();
                }
              }
              checkAndUpdateHeight($element, $scope);
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeAccept
             * @global
             * @returns {Void}
             * @description method to remove accept
             */
            var removeAccept = function () {
              $scope.removeActionElementById('accept', 'select-rule_accept');
              angular.forEach($scope.rule.action.actionOrder, function (orderEntity, index) {
                if (orderEntity.startsWith('set') || orderEntity.startsWith('nat')) {
                  var paramKey = 'set';
                  (orderEntity.startsWith('nat')) ? paramKey = 'nat' : 0;

                  var setKey = policyConstants.SET_ACTION_KEYS[orderEntity];

                  if (angular.isObject($scope.rule.action[paramKey][setKey])) {
                    for (var entityKey in  $scope.rule.action[paramKey][setKey]) {
                      $scope.rule.action[paramKey][setKey][entityKey] = null;
                    }
                  } else {
                    $scope.rule.action[paramKey][setKey] = null;
                  }
                  // ---------- for deletion ----------
                  $scope.rule.action.actionOrder[index] = null;
                }
              });
              $scope.rule.action.actionOrder = _.values(_.chain($scope.rule.action.actionOrder).uniq().omit(_.isUndefined).omit(_.isNull).value());
              removeSetParameters();
              checkAndUpdateHeight($element, $scope);
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeSetParameters
             * @global
             * @returns {Void}
             * @description method to remove parameter which are already set
             */
            var removeSetParameters = function () {
              angular.forEach(setParameterIds, function (setParamId) {
                $scope.removeActionElementById(undefined, setParamId);
              })
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#clearElements
             * @global
             * @returns {Void}
             * @description method to remove all active (not readonly) elements
             */
            var clearElements = function () {
              // ---------- clear all ----------
              if ($element.find('.policy-rule-match').not('.readonly').find('.select-rule').length) {
                angular.forEach($element.find('.policy-rule-match').not('.readonly').find('.select-rule'), function (elem) {
                  elem.remove();
                });
              }

              if ($element.find('.policy-rule-action').not('.readonly').find('.select-rule').length) {
                angular.forEach($element.find('.policy-rule-action').not('.readonly').find('.select-rule'), function (elem) {
                  elem.remove();
                });
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#clearReadOnlyElements
             * @global
             * @returns {Void}
             * @description method to remove all readonly elements
             */
            var clearReadOnlyElements = function () {
              if ($element.find('.policy-rule-match.readonly').find('.select-rule').length) {
                angular.forEach($element.find('.policy-rule-match.readonly').find('.select-rule'), function (elem) {
                  elem.remove();
                });
              }
              if ($element.find('.policy-rule-action.readonly').find('.select-rule').length) {
                angular.forEach($element.find('.policy-rule-action.readonly').find('.select-rule'), function (elem) {
                  elem.remove();
                });
              }
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#restore
             * @global
             * @returns {Void}
             * @description method to restore object back to previous state saved as tempCopy when user cancels editing.
             */
            var restore = function () {
              $scope.rule.match = angular.copy($scope.rule.tempCopy.match);
              $scope.rule.action = angular.copy($scope.rule.tempCopy.action);
              $scope.rule.sequenceIpType = angular.copy($scope.rule.tempCopy.sequenceIpType);
              if (!_.isUndefined($scope.rule.tempCopy.sourceIpType)) {
                $scope.rule.sourceIpType = angular.copy($scope.rule.tempCopy.sourceIpType);
              }
              if (!_.isUndefined($scope.rule.tempCopy.destinationIpType)) {
                $scope.rule.destinationIpType = angular.copy($scope.rule.tempCopy.destinationIpType);
              }
              clearReadOnlyElements();
              $scope.collapseDiv.show = false;
              // ---------- recreate all ----------
              compileReadOnlyRulesTemplate($scope.rule.match.matchOrder, 'match', $element, $scope);
              compileReadOnlyRulesTemplate($scope.rule.action.actionOrder, 'action', $element, $scope);
              collapseElements();
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeNewElements
             * @global
             * @returns {Void}
             * @description method to remove newly added element but not saved on cancel.
             */
            var removeNewElements = function () {
              var matchElements = _.difference($scope.rule.match.matchOrder, $scope.rule.tempCopy.match.matchOrder);
              if(_.indexOf(matchElements, 'class') > -1){
                matchElements.splice(_.indexOf(matchElements, 'class'), 1, 'class_match');
              }
              var actionElements = _.difference($scope.rule.action.actionOrder, $scope.rule.tempCopy.action.actionOrder);
              if(_.indexOf(actionElements, 'class') > -1){
                actionElements.splice(_.indexOf(actionElements, 'class'), 1, 'class_action');
              }
              var addedElements = matchElements.concat(actionElements);
              var elemId = '';
              angular.forEach(addedElements, function (orderEntity, index) {
                $('.policy-tag.' + orderEntity).toggleClass('active');
                elemId = 'select-rule_' + ((policyConstants.RULE_ELEMENT_ID[orderEntity]) ? policyConstants.RULE_ELEMENT_ID[orderEntity] : orderEntity);

                // ---------- remove ngmodel controller from form controller ----------
                removeModelController($element, $scope, '#' + elemId);
              });
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#allowEdit
             * @global
             * @returns {Void}
             * @description method to pre process to allow editing
             */
            $scope.allowEdit = function () {
              // ---------- preserve current state in case user cancels ----------
              $scope.rule.tempCopy = {
                match: angular.copy($scope.rule.match),
                action: angular.copy($scope.rule.action),
                sequenceIpType: angular.copy($scope.rule.sequenceIpType)
              };
              if (!_.isUndefined($scope.rule.sourceIpType)) {
                $scope.rule.tempCopy.sourceIpType = angular.copy($scope.rule.sourceIpType);
              }
              if (!_.isUndefined($scope.rule.destinationIpType)) {
                $scope.rule.tempCopy.destinationIpType = angular.copy($scope.rule.destinationIpType);
              }
              if($scope.rule.action.actionOrder.indexOf('preferredColorGroup') !== -1){
                $scope.rule.action.preferredColorGroup = $scope.preferredColorGrp?.listItems.filter(pcg => 
                  pcg.listId === ($scope.rule.action.preferredColorGroup?.listId || $scope.rule.action.set.preferredColorGroup.ref))[0];
              }
              if(window.sessionStorage.getItem('available_sc_types') !== null){
                $scope.servicechainList = JSON.parse(window.sessionStorage.getItem('available_sc_types'));
              }
              setPrefixListItems();
              $scope.rule.setReadOnly(false);
              $scope.rule.valid = false;
              clearElements();
              compileRulesTemplate($scope.rule.match.matchOrder, 'match', $element, $scope);
              compileRulesTemplate($scope.rule.action.actionOrder, 'action', $element, $scope);
              //checkAndUpdateHeight($element, $scope);
              $scope.$emit('evaluate-rule', {
                index: $scope.rule.orderNo,
                event: {'editable': false},
                rule: $scope.rule
              });
              setTimeout(function() {
                $element.find('.action-btns').find('.button-blue').focus();
                checkAndUpdateHeight($element, $scope);
                if ($scope.rule.type === 'zoneBasedFW') {
                  $('policy-rule').find('v-drop-down-label').find('input').focus();
                }
              }, 50);
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#formatNotificationString
             * @params{String[]} strArray
             * @protected
             * @returns {Void}
             * @description method to stringify a String array
             */
            function formatNotificationString(strArray) {
              var formattedstrArray = [];
              angular.forEach(strArray, function (item, index) {
                policyConstants.RULES_TITLE[item] = $translate.instant(policyConstants.RULES_TITLE[item]);
                if (strArray.length == 1) {
                  formattedstrArray.push(policyConstants.RULES_TITLE[item]);
                }
                else if (index === (strArray.length - 1)) {
                  formattedstrArray.push($translate.instant('configuration.policy.andPolicyConstantsRulesTitle', { policyConstantsRulesTitle : policyConstants.RULES_TITLE[item] } ));
                }
                else {
                  formattedstrArray.push(' ' + policyConstants.RULES_TITLE[item]);
                }
              })
              return String(formattedstrArray);
            }

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#saveRule
             * @returns {Boolean}
             * @description method to save the rule
             */
            $scope.saveRule = function () {
              notification.clear();
              $scope.policyRuleForm.$submitted = true;
              $scope.rule.valid = true;

              // ---------- there is a bug when toggling between accept & drop/reject several times remove manually ----------
              var indexesToRemove = [];
              angular.forEach($scope.policyRuleForm.$error.required, function (ngModelCtrlName, index) {
                if (angular.isUndefined($scope.policyRuleForm[ngModelCtrlName.$name])) {
                  indexesToRemove.push(index);
                }
              });
              appUtil.removeFromArray($scope.policyRuleForm.$error.required, indexesToRemove);
              if (appUtil.checkNestedProperty($scope.policyRuleForm, '$error', 'required') && $scope.policyRuleForm.$error.required.length === 0) {
                delete $scope.policyRuleForm.$error.required;
              }
              // ---------- check if all fields are valid else reject and throw notification ----------
              if ($scope.policyRuleForm.$invalid ||
                (_.intersection(['address', 'appList', 'asPath', 'colorList', 'carrier', 'destinationDataPrefixList', 'destinationFqdnList', 'destinationRegion', 'dns', 'dnsAppList', 'plp', 'origin', 'prefixList', 'sourceDataPrefixList', 'sourceFqdnList', 'siteList', 'regionList', 'siteId', 'regionId', 'tlocList', 'vpnList', 'community', 'extCommunity', 'nextHop', 'class', 'appProtocol', 'saasAppList', 'deviceAccessProtocol'], $scope.rule.match.matchOrder).length > 0 ) ||
                (_.intersection(['backupSlaPreferredColor', 'exportTo', 'setLocalTLOCList', 'setPolicer', 'setService', 'setServiceChain','serviceChain', 'slaClass', 'setTLOCAction', 'setTLOCList', 'setAffinity', 'policer', 'mirror', 'class', 'preferredColorGroup'], $scope.rule.action.actionOrder).length > 0 )) {

                // ---------- Check and notify user of invalid fields ----------
                var invalidFields = [];
                for (var validationKey in $scope.policyRuleForm.$error) {
                  if (validationKey === 'required') {
                    continue;
                  }
                  invalidFields = invalidFields.concat(_.uniq(_.map($scope.policyRuleForm.$error[validationKey], '$name')));
                }
                if (invalidFields.length > 0) {
                  notification.error($translate.instant('configuration.policy.theFollowingFieldsAreInvalid', { formatNotificationString : formatNotificationString(invalidFields) } ));
                  $scope.rule.valid = false;
                }

                // ---------- Check and notify user of missing required fields ----------
                invalidFields.reset();

                // ---------- Input fields ---------- //
                invalidFields = _.uniq(_.map($scope.policyRuleForm.$error.required, '$name'));
                invalidFields = _.union(invalidFields, $scope.rule.validateSingleEntryOrListFields());
                if (invalidFields.length > 0) {
                  notification.error($translate.instant('configuration.policy.pleaseFillTheRequiredFields', { formatNotificationString : formatNotificationString(invalidFields) } ));
                  $scope.rule.valid = false;
                }
                if (!$scope.rule.valid) {
                  return false;
                }
              }
              if (($scope.rule.match.matchOrder.includes('protocol') || $scope.rule.match.matchOrder.includes('appProtocol')) && ($scope.rule.match.matchOrder.includes('source') || $scope.rule.match.matchOrder.includes('destination'))) {
                if((!_.isUndefined($scope.rule.match.protocol) && $scope.rule.match.protocol == '1') || (!_.isUndefined($scope.rule.match.appProtocolRange) && $scope.rule.match.appProtocolRange == '1')) {
                  notification.error($translate.instant('configuration.policy.sourceAndDestinationPortsNotApplicable'));
                  $scope.rule.valid = false;
                  return false;
                }

                if(((!appUtil.isUndefinedOrEmpty($scope.rule.match.appProtocol)) && $scope.rule.match.matchOrder.includes('destination'))) {
                  notification.error($translate.instant('configuration.policy.destinationPortIsNotApplicable'));
                  $scope.rule.valid = false;
                  return false;
                }
              }
              if ($scope.rule.match.matchOrder.includes('firewallApplicationList') && $scope.rule.match.matchOrder.length == 1) {
                notification.error($translate.instant('configuration.policy.pleaseAddAtLeastOneOfMatchFields'));
                $scope.rule.valid = false;
                return false;
              }
              // App Family List & PLP not supported for IPv6. This check will be removed when it is supported in future release
              if (($scope.rule.match.matchOrder.includes('appList') || $scope.rule.match.matchOrder.includes('plp')) && ($scope.rule.match.matchOrder.includes('sourceDataPrefixList') || $scope.rule.match.matchOrder.includes('destinationDataPrefixList'))) {
                if (!appUtil.isUndefinedOrEmpty($scope.rule.match.sourceDataPrefixList) && $scope.rule.match.sourceDataPrefixList.type == 'dataIpv6Prefix') {
                  notification.error($translate.instant('configuration.policy.iPv6SourceDataPrefixListNotSupported'));
                  $scope.rule.valid = false;
                  return false;
                }
                if (!appUtil.isUndefinedOrEmpty($scope.rule.match.destinationDataPrefixList) && $scope.rule.match.destinationDataPrefixList.type == 'dataIpv6Prefix') {
                  notification.error($translate.instant('configuration.policy.iPv6DestinationDataPrefixListNotSupported'));
                  $scope.rule.valid = false;
                  return false;
                }
                if (!_.isNull($scope.rule.match.sourceIp) && $scope.rule.sourceIpType == 'sourceIpv6') {
                  notification.error($translate.instant('configuration.policy.iPv6SourceDataPrefixNotSupportedForApplication'));
                  $scope.rule.valid = false;
                  return false;
                }
                if (!_.isNull($scope.rule.match.destinationIp) && $scope.rule.destinationIpType == 'destinationIpv6') {
                  notification.error($translate.instant('configuration.policy.iPv6DestinationDataPrefixNotSupportedForApplication'));
                  $scope.rule.valid = false;
                  return false;
                }
              }
              function validateMaxForDataprefixAndFqdn(type){
                var isValid = true,
                  countByPrefixType = _.countBy($scope.rule.match[type + "FqdnList"], 'type');

                if (countByPrefixType.fqdn > 1 || countByPrefixType.dataPrefix > 1 ){
                  //validate for the Fqdnlist
                  isValid =  false;
                }
                return isValid;
              }

              function validateSNGName(name){
                var sng_regex = /SNG-APPQOE$|(SNG-APPQOE([1-9]|[1-2][0-9]|3[0-1]))$/;
                return sng_regex.test(name);
              }

              if( $scope.rule.match.matchOrder.includes('sourceFqdnList')){
                if( !validateMaxForDataprefixAndFqdn('source')) {
                  notification.error($translate.instant('configuration.policy.maximumOfOneFQDNAndOrOneIPv4SourceDataPrefixAllowed'));
                  $scope.rule.valid = false;
                  return false;
                }
              }
              if( $scope.rule.match.matchOrder.includes('destinationFqdnList')){
                if(!validateMaxForDataprefixAndFqdn('destination')) {
                  notification.error($translate.instant('configuration.policy.maximumOfOneFQDNAndOrOneIPv4DestinationDataPrefixRequired'));
                  $scope.rule.valid = false;
                  return false;
                }
              }
              if ($scope.rule.match.matchOrder.includes('firewallApplicationList') && (!$scope.rule.action.actionOrder.includes('inspect') && !$scope.rule.action.inspect)) {
                notification.error($translate.instant('configuration.policy.actionMustBeInspect'));
                $scope.rule.valid = false;
                return false;
              }
              if ($scope.rule.match.matchOrder.includes('community') && $scope.rule.match.community && $scope.rule.match.community.matchFlag !== 'or' && $scope.rule.match.community.lists.length > 1) {
                notification.error($translate.instant('configuration.policy.pleaseChangeTheCriteria'));
                $scope.rule.valid = false;
                return false;
              }
              if ($scope.rule.action.actionOrder.includes('setVPN') && !($scope.rule.action.actionOrder.includes('setTLOCList') || $scope.rule.action.actionOrder.includes('setNexthop'))) {
                notification.error($translate.instant('configuration.policy.TLOCOrNextHopIsMandatoryWhenConfiguringVPN'));
                $scope.rule.valid = false;
                return false;
              } else if ($scope.rule.action.actionOrder.includes('setTLOCList') && ($scope.rule.action.set.hasOwnProperty('vpn') && !$scope.rule.action.actionOrder.includes('setVPN'))) {
                notification.error($translate.instant('configuration.policy.vPNIsMandatoryWhenConfiguringTLOC'));
                $scope.rule.valid = false;
                return false;
              } else if ($scope.rule.action.actionOrder.includes('setAsPath') && ((_.isNull($scope.rule.action.set.asPath.prepend) || _.isEmpty($scope.rule.action.set.asPath.prepend)) && (_.isNull($scope.rule.action.set.asPath.exclude) || _.isEmpty($scope.rule.action.set.asPath.exclude)))) {
                notification.error($translate.instant('configuration.policy.pleaseFillEitherPrependorOrExcludeASPath'));
                $scope.rule.valid = false;
                return false;
              } else if ($scope.rule.action.actionOrder.includes('setService') && ($scope.rule.action.set.service.type.key === 'appqoe' && _.isNull($scope.rule.action.set.service.vpn))) {
                notification.error($translate.instant('configuration.policy.vPNIsMandatoryWhenConfiguringAppQoEService'));
                $scope.rule.valid = false;
                return false;
              } else if ($scope.rule.action.actionOrder.includes('appqoeOptimization') && !_.isNull($scope.rule.action.appqoeOptimization.sngName) && !_.isEmpty($scope.rule.action.appqoeOptimization.sngName)) {
                if(!validateSNGName($scope.rule.action.appqoeOptimization.sngName)){
                  notification.error($translate.instant('configuration.policy.invalidSNGName'));
                  $scope.rule.valid = false;
                  return false;
                }
              } else if ($scope.rule.action.actionOrder.includes('lossProtect')) {
                if (($scope.rule.action.lossProtect.lossProtectOption === null || $scope.rule.action.lossProtect.lossProtectOption === 'none') && !$scope.rule.action.lossProtect.packetDuplicationEnabled) {
                  notification.error($translate.instant('configuration.policy.pleaseChooseLossCorrectionOrEnablePacketDuplication'));
                  $scope.rule.valid = false;
                  return false;
                }
              } else if ($scope.rule.action.actionOrder.includes('sig')) {
                if ($scope.rule.action.actionOrder.includes('natPool') || $scope.rule.action.actionOrder.includes('natVPN') || ($scope.rule.action.actionOrder.includes('setNexthop'))) {
                  notification.error($translate.instant('configuration.policy.secureInternetGatewayCannotBeEnabled'));
                  $scope.rule.valid = false;
                  return false;
                }
              } else if ($scope.rule.action.actionOrder.includes('slaClass')) {
                if($scope.rule.action.slaClass.fallbackToBestPath !== null && $scope.rule.action.slaClass.fallbackToBestPath === 'fallbackToBestPath' && !$scope.rule.action.slaClass.name.entries[0].hasOwnProperty('fallbackBestTunnel')) {
                  notification.error($translate.instant('configuration.policy.sLAClassSelectedDoesNotHaveFallbackBestTunnelEnabled'));
                  $scope.rule.valid = false;
                  return false;
                }
              } else if ($scope.rule.action.actionOrder.includes('setServiceChain') && (['setTLOCList', 'setVPN'].some(actionName => $scope.rule.action.actionOrder.includes(actionName)))) {
                notification.error($translate.instant('configuration.policy.ServiceChainRemoteIsEnabledCannotSetTLOCOrVPN'));
                $scope.rule.valid = false;
                return false;
              } else if($scope.rule.action.actionOrder.includes('setServiceChain') && $scope.rule.action.set.serviceChain.tloc.ip){
                  let missedTlocField = [];  
                  if(!$scope.rule.action.set.serviceChain.tloc.color) missedTlocField.push($translate.instant('common.color'));
                  if(!$scope.rule.action.set.serviceChain.tloc.encap) missedTlocField.push($translate.instant('common.encapsulation'));
                  if(missedTlocField.length){
                    if(missedTlocField.length === 1){
                      notification.error($translate.instant('configuration.policy.serviceChainTLOCValidation') + missedTlocField[0]);
                    }else if(missedTlocField.length>1){
                      notification.error(`${$translate.instant('configuration.policy.serviceChainTLOCValidation')} ${missedTlocField[0]} and ${missedTlocField[1]}.`);
                    }
                    $scope.rule.valid = false;
                    return false;
                  }
              }else if($scope.rule.action.actionOrder.includes('setServiceChain') && !$scope.rule.action.set.serviceChain.tloc.ip){
                if($scope.rule.action.set.serviceChain.tloc.color || $scope.rule.action.set.serviceChain.tloc.encap){
                  notification.error(`${$translate.instant('configuration.policy.serviceChainFillRequiredTlocFields')}`);
                  $scope.rule.valid = false;
                  return false;
                }
              }

              if (!($scope.rule instanceof AppRoutePolicyRule)) {
                if ($scope.rule.action.actionOrder.includes('redirectDns') && !$scope.rule.match.matchOrder.includes('dnsAppList') && !$scope.rule.match.matchOrder.includes('dns')) {
                  notification.error($translate.instant('configuration.policy.dNSApplicationListDNSRequestMatchIsMandatoryForRedirectDNS'));
                  $scope.rule.valid = false;
                  return false;
                }
              }

              if ($scope.rule instanceof ACLv4PolicyRule || $scope.rule instanceof ACLv6PolicyRule) {
                var isValidAclDropActions = containsOnly($scope.rule.action.actionOrder, ["drop", "count", "log"]);
                if ($scope.rule.action.drop === true && !isValidAclDropActions) {
                  notification.error($translate.instant('configuration.policy.forDropActionOnlyCounterAndLogAreApplicable'));
                  $scope.rule.valid = false;
                  return false;
                }
              }

              if ($scope.rule.match.matchOrder.includes("saasAppList")) {
                var isValidSaasAppListActions = containsOnly($scope.rule.action.actionOrder, ["cloudSaas", "count"]);

                if (!isValidSaasAppListActions) {
                  notification.error($translate.instant('configuration.policy.forCloudSaaSApplicationListMatchOnlyCloudSLA'));
                  $scope.rule.valid = false;
                  return false;
                }
              }

              if ($scope.rule.action.actionOrder.length > 12) {
                notification.error($translate.instant('configuration.policy.maximum12ActionsAreAllowedPerSequenceRule'));
                $scope.rule.valid = false;
                return false;
              }

              if ($scope.saveFn) {
                $scope.saveFn();
              } else {
                $scope.rule.readOnly = true;
              }
              clearReadOnlyElements();
              $scope.collapseDiv.show = false;
              compileReadOnlyRulesTemplate($scope.rule.match.matchOrder, 'match', $element, $scope);
              compileReadOnlyRulesTemplate($scope.rule.action.actionOrder, 'action', $element, $scope);
              collapseElements();
              $scope.rule.valid = true;
              $scope.$emit('evaluate-rule', {index: $scope.rule.orderNo, event: {'editable': true}, rule: $scope.rule});
            };

            function containsOnly(list, validOptions) {
              return list.every(function(item) {
                return validOptions.includes(item);
              });
            }

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#removeRule
             * @params{number} index
             * @returns {Void}
             * @description method remove the rule
             */
            $scope.removeRule = function (index) {
              $element.parent().remove();
              $scope.removeFn({index: index});
            };

            /**
             * @ngdoc method
             * @name vManage.directive:policyRule#cancelEdit
             * @returns {Void}
             * @description method to cancel the edit operation on a rule
             */
            $scope.cancelEdit = function () {
              if ($scope.cancelFn) {
                $scope.cancelFn();
              } else {
                $scope.rule.readOnly = true;
                $scope.rule.valid = true;
                removeNewElements();
                restore();
              }
              $scope.$emit('evaluate-rule', {index: $scope.rule.orderNo, event: {'editable': true}, rule: $scope.rule});
            };

            $scope.initializeCommunityVariable = function() {
              // this.rule.match.community.matchFlag = 'or';
            };

            $scope.initSourceIpProtocol = function () {
              if(_.isUndefined(this.rule.sourceIpType)) {

                if(this.rule instanceof ACLv6PolicyRule) {
                  this.rule.sourceIpType = 'sourceIpv6';
                } else if (this.rule instanceof  ZoneBasedPolicyRule){
                  if (this.rule.sequenceIpType === 'ipv4') {
                    this.rule.sourceIpType = 'sourceIp';
                  } else {
                    this.rule.sourceIpType = 'sourceFqdn';
                  }
                }else  {
                  if (this.rule.sequenceIpType === 'ipv4') {
                    this.rule.sourceIpType = 'sourceIp';
                  } else if (this.rule.sequenceIpType === 'fqdn') {
                    this.rule.sourceIpType = 'sourceFqdn';
                  }else {
                    this.rule.sourceIpType = 'sourceIpv6';
                  }
                }
              }
            };

            $scope.initDestIpProtocol = function () {
              if(_.isUndefined(this.rule.destinationIpType)) {
                if(this.rule instanceof ACLv6PolicyRule) {
                  this.rule.destinationIpType = 'destinationIpv6';
                }  else if (this.rule instanceof  ZoneBasedPolicyRule){
                  if (this.rule.sequenceIpType == 'ipv4') {
                    this.rule.destinationIpType = 'destinationIp';
                  } else {
                    this.rule.destinationIpType = 'destinationFqdn';
                  }
                }else {
                  if (this.rule.sequenceIpType == 'ipv4') {
                    this.rule.destinationIpType = 'destinationIp';
                  }  else {
                    this.rule.destinationIpType = 'destinationIpv6';
                  }
                }
              }
            };

            $scope.initSLAClassListObj = function() {
              if ($scope.rule.action.slaClass && !$scope.rule.action.slaClass.fallbackToBestPath) {
                $scope.rule.action.slaClass.fallbackToBestPath = LOAD_BALANCE;
              }
            }

            $scope.onSlaNotMetChange = function() {
              if ($scope.rule.action.actionOrder.includes('backupSlaPreferredColor') && $scope.rule.action.slaClass.fallbackToBestPath !== LOAD_BALANCE) {
                $scope.rule.action.slaClass.fallbackToBestPath = LOAD_BALANCE;
                notification.error($translate.instant('configuration.policy.backupSLAPreferredColorApplicable'));
                return false;
              }
            }

            $scope.initCommunityObj = function () {
              if(Array.isArray(this.rule.match?.matchOrder) && this.rule.match.matchOrder.slice(-1).toString() !== "community")
              { return; /*init community obj only when community button is activated*/ }

              if(!this.rule.match.community || this.rule.match.community && this.rule.match.community.lists === null) {
                this.rule.match.community = {matchFlag: 'or', lists: []};
              }
              if(this.rule.match.community.lists && this.rule.match.community.lists.length) {
                var type = this.rule.match.community.lists[0].type;
                if(type === 'expandedCommunity') {
                  this.rule.communityType = 'expandedCommunity';
                }
              }
             };

            $scope.changeCommunityType = function() {
              if(this.rule.communityType === 'community') {
                this.rule.match.community = {matchFlag: 'or', lists: []};
              } else if(this.rule.communityType === 'expandedCommunity' || this.rule.type == 'vEdgeRoute') {
                this.rule.match.community = {lists: []};
              }
            }

            $scope.defineCommunityRoute = function() {
              if(!this.rule.match.community || this.rule.match.community && this.rule.match.community.lists === null || _.isEmpty(this.rule.communityVariableField.expandedCommunityInline)) {
                this.rule.match.community = {
                  lists: []
                }
              }

            };
            $scope.defineExpandedRoute = function() {
              if(!this.rule.match.expandedCommunity || this.rule.match.expandedCommunity && this.rule.match.expandedCommunity.lists === null) {
                this.rule.match.expandedCommunity = {
                  lists: []
                }
              }
            };
            $scope.getICMPCriteria = function() {
              if(this.rule === null){
                return false;
              }
              return (((this.rule.match.protocol === '1' && this.rule.sequenceIpType === 'ipv4') || (this.rule.match.protocol === '58' && this.rule.sequenceIpType === 'ipv6') || (this.rule.match.nextHeader === 58 && this.rule.sequenceIpType === 'ipv6') ||
                (this.rule.sequenceIpType === 'all' && (this.rule.match.protocol === '1' || this.rule.match.protocol === '58' || this.rule.match.protocol === '1 58' || this.rule.match.protocol === '58 1'))) || (this.rule.match.nextHeader == 58));
            };
            $scope.ICMP_MATCH_CRITERIA = ['1', '58', '1 58', '58 1'];
            $scope.initICMPMessage = function () {
              if(['all', 'ipv4', 'ipv6'].indexOf(this.rule.sequenceIpType) !== -1 && !this.rule.match.icmpMessage) {
                this.rule.match.icmpMessage = {lists: []};
              }
              $scope.icmpMessageList = $scope.getICMPMessage();
            };
            $scope.getICMPMessage = function() {
              if(this.rule.sequenceIpType === 'ipv4') {
                return icmpMessages.icmpMessage;
              } else if(this.rule.sequenceIpType === 'ipv6') {
                return icmpMessages.icmp6Message;
              } else if(this.rule.sequenceIpType === 'all') {
                // Get icmpMessage for ipv4
                var __icmpMessage = icmpMessages.icmpMessage;
                // Get icmp6Messages for ipv6
                var __icmp6Message = _.map(icmpMessages.icmp6Message, function(item) {
                  if(item.name.indexOf('(ipv6)') === -1) {
                    item.name = item.name + ' - (ipv6)';
                  }
                  return item;
                });
                // Combine both icmpMessages and icmp6Messages
                return __icmpMessage.concat(__icmp6Message);
              }
            };
            $scope.updateICMP = function() {
              this.rule.match.icmpMessage = {
                lists : []
              };
              if($scope.ICMP_MATCH_CRITERIA.indexOf(this.rule.match.protocol) == -1) {
                this.rule.match.icmpMessage.lists = [];
              }
              $scope.icmpMessageList  = $scope.getICMPMessage();
              var element = $compile('<multi-select-create-chips-drop-down place-holder="Search" create-option="false" disabled="rule.match.sourcePort || rule.match.destinationPort" model-Obj="rule.match.icmpMessage.lists" list-items="icmpMessageList" match-property="name" copy-list="true" chip-removable="true" heading="ICMP Message"></multi-select-create-chips-drop-down>')($scope);
              angular.element('#icmp_multi_select_component').html(element);
            };
            $scope.getICMPTitle = function () {
              var title = $translate.instant('configuration.policy.iCMPMessage');
              if(this.rule.sequenceIpType === 'ivp4' && this.rule.match.protocol === '1') {
                return title;
              } else if(this.rule.sequenceIpType === 'ivp6' && (this.rule.match.protocol === '58') || this.rule.match.nextHeader === 58) {
                title = $translate.instant('configuration.policy.iCMPv6Message');
              } else if(this.rule.sequenceIpType === 'all' && (this.rule.match.protocol == '1' || this.rule.match.protocol == '58')) {
                title = $translate.instant('configuration.policy.iCMPMessageOrICMPv6Message')
              } else if(this.rule.sequenceIpType === 'all' && this.rule.match.protocol === '1 58') {
                title = $translate.instant('configuration.policy.iCMPMessageAndOrICMPv6Message')
              }
              return title;
            };

            $scope.initRedirectDns = function () {
              if(!this.rule.action.redirectDns.redirectDNSOption) {
                this.rule.action.redirectDns.redirectDNSOption = 'dnsType';
              }
            };

            $scope.hasPort = function () {
              var port = false;
              angular.forEach($scope.rule.match.appProtocol, function (protocol) {
                if (!_.isUndefined(protocol.port)) {
                  port = true;
                }
              });
              return port;
            };


            $scope.getFqdnListNames = function(list){
              return _.map(getTransformFqdnListNames(list), 'name').join(",");
            }

            $scope.hasListEnteries = function(list, type, modelAttrib){
              var valid = false;
              if(!$scope.rule){
                return valid;
              }
              if($scope.rule.match[list].length > 0){
                valid =  _.countBy($scope.rule.match[list], 'type')[type] > 0;
                //set the sourceIp, destinationIp, sourceFqdn, destinationFqdn to null based on if the list has more than one
                // fqdn or ip
                if(valid){
                  $scope.rule.match[modelAttrib] = null;
                }
              }
              return valid;
            }

            $scope.onDataPrefixSwitchValueChange = function (model) {
              $scope.rule.match[model] = null;
            };

            $scope.clearDestinationIp = function() {
              $scope.onDataPrefixSwitchValueChange('destinationIp');
            };

            $scope.clearSourceIp = function() {
              $scope.onDataPrefixSwitchValueChange('sourceIp');
            };
            $scope.clearTlocAndTlocList = function(){
                $scope.rule.action.set.serviceChain.tloc['ip'] = null;
                angular.element('#schain_color_list button.md-chip-remove')?.click();
                angular.element('#schain_color_encap button.md-chip-remove')?.click();
                angular.element('#schain_color_tlocList button.md-chip-remove')?.click();
                angular.element("#select-rule_set_service_chain fieldset .errorMsg, #schain_color_tlocList + p.errormsg").remove();
            }
          }
        }
      }
    }
  }
})();
