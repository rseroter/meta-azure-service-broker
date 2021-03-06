/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azurepostgresqldb/cmd-provision');
var postgresqldbOperations = require('../../../../lib/services/azurepostgresqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var postgresqldbOps = new postgresqldbOperations(azure);

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

describe('PostgreSqlDb - Provision - PreConditions', function () {
    var params = {};
    var cp;

    describe('All the required parameters are provided', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    postgresqlServerName: 'fake-server-name',
                    postgresqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('should succeed to validate the parameters', function () {
            (cp.getInvalidParams().length).should.equal(0);
        });
    });

    describe('parameters file is not provided', function () {

        before(function () {
            params = {
                plan_id: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('should fail to validate the parameters', function () {
            (cp.getInvalidParams().length).should.equal(5);
            cp.getInvalidParams().should.deepEqual([
                'resourceGroupName',
                'location',
                'postgresqlServerName',
                'administratorLogin',
                'administratorLoginPassword'
            ]);
        });
    });
});

describe('PostgreSqlDb - Provision - Execution', function () {
    var params = {};
    var cp;
    
    beforeEach(function () {
        params = {
            instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            plan_id: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
            parameters: {      // developer's input parameters file
                resourceGroup: 'fake-resource-group-name',
                location: 'westus',
                postgresqlServerName: 'fake-server-name',
                postgresqlServerParameters: {
                    allowPostgresqlServerFirewallRules: [{
                        ruleName: 'newrule',
                        startIpAddress: '0.0.0.0',
                        endIpAddress: '255.255.255.255'
                    }],
                    properties: {
                        administratorLogin: 'fake-server-name',
                        administratorLoginPassword: 'c1oudc0w'
                    }
                }
            },
            azure: azure
        };

        cp = new cmdProvision(params);
        
        msRestRequest.PUT = sinon.stub();
        
        // create resource group
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name')
            .yields(null, {statusCode: 200});  
        
        // create server
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforPostgreSQL/servers/fake-server-name')
            .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-serverPollingUrl'} }, {properties: {fullyQualifiedDomainName: 'fake-fqdn'}});
    });

    afterEach(function () {
        mockingHelper.restore();
    });
        
    describe('Server that does not previously exist', function() {

        before(function () {
          msRestRequest.GET = sinon.stub();
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforPostgreSQL/servers/fake-server-name')
              .yields(null, {statusCode: 404});
        });
    
        it('should not callback error', function (done) {
            cp.provision(postgresqldbOps, function (err, result) {
                should.not.exist(err);
                done();
            });
        });
    });

    describe('Server that does previously exist', function() {

        before(function () {
          msRestRequest.GET = sinon.stub();
          msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/fake-resource-group-name/providers/Microsoft.DBforPostgreSQL/servers/fake-server-name')
              .yields(null, {statusCode: 200}, '{}');
        });
    
        it('should callback conflict error', function (done) {
            cp.provision(postgresqldbOps, function (err, result) {
                should.exist(err);
                done();
            });
        });
    });
});

describe('PostgreSqlDb - Provision - Firewall rules', function () {
    var params = {};
    var cp;

    describe('Parameter validation should succeed if ...', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    postgresqlServerName: 'fake-server-name',
                    postgresqlServerParameters: {
                        allowPostgresqlServerFirewallRules: [{
                            ruleName: 'newrule',
                            startIpAddress: '0.0.0.0',
                            endIpAddress: '255.255.255.255'
                        }],
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    }
                },
                azure: azure
            };
            cp = new cmdProvision(params);
        });

        it('correct firewall rule specs are given', function (done) {
            (cp.getInvalidParams().length).should.equal(0);
            done();
        });
    });
    
    describe('Incorrect firewall rule specs are given', function () {
        before(function () {
            params = {
                instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
                plan_id: 'ffc1e3c8-0e24-471d-8683-1b42e100bb14',
                parameters: {      // developer's input parameters file
                    resourceGroup: 'fake-resource-group-name',
                    location: 'westus',
                    postgresqlServerName: 'fake-server-name',
                    postgresqlServerParameters: {
                        properties: {
                            administratorLogin: 'fake-server-name',
                            administratorLoginPassword: 'c1oudc0w'
                        }
                    }
                },
                azure: azure
            };
        });

        describe('no rule name', function () {
            before(function () {
                params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules = [{
                    startIpAddress: '0.0.0.0',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowPostgresqlServerFirewallRules');
                done();
            });
        });

        describe('no start IP address', function () {
            before(function () {
                params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    endIpAddress: '255.255.255.255'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowPostgresqlServerFirewallRules');
                done();
            });
        });

        describe('no end IP address', function () {
            before(function () {
                params.parameters.postgresqlServerParameters.allowPostgresqlServerFirewallRules = [{
                    ruleName: 'new rule',
                    startIpAddress: '0.0.0.0'
                }];
            });
            it('Parameter validation should fail', function (done) {
                cp = new cmdProvision(params);
                (cp.getInvalidParams())[0].should.equal('allowPostgresqlServerFirewallRules');
                done();
            });
        });
    });
});