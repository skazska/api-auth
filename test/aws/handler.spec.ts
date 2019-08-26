import "mocha";
import {expect, use}  from 'chai';

import {Authenticator} from "../../src/authenticator";
import {APIGatewayProxyResult} from "aws-lambda";
import {EditIO} from "../../src/aws/i-o/edit";
import {DeleteIO} from "../../src/aws/i-o/delete";
import {GetIO} from "../../src/aws/i-o/get";
import {factory} from "../../src/executables";

import {UserStorage} from "../../src/aws/storage";
import {apiGwProxyProvider} from "../../src/aws";
import {EventPayload} from './util/lambda';
import {DynamodbModelStorage} from "@skazska/abstract-aws-service-model";


import sinon from "sinon";
// import sinonChai = require("sinon-chai");
// use(sinonChai);

const secretResponse = JSON.stringify({
    authApiSecret :'secret',
    authPasswordSalt :'secret'
});

const tests = [
    {
        info: 'GET with valid token',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'read',
            subject: 'usr',
            realms: ['r1']
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {login: 'usr', password: 'pass', name: 'name'},
        expectedResultStatus: 200,
        expectedStorageCallParams: {TableName: 'users', Key: {login: 'usr'}}
    },
    {
        info: 'GET with no access token',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'check',
            subject: 'usr',
            realms: ['r1']
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {login: 'usr', password: 'pass', name: 'name'},
        expectedResultStatus: 403,
        expectedStorageCallParams: {TableName: 'users', Key: {login: 'usr'}}
    },
    {
        info: 'GET with self only access and different subject',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr1',
            realms: ['r1']
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {login: 'usr', password: 'pass', name: 'name'},
        expectedResultStatus: 403,
        expectedStorageCallParams: {TableName: 'users', Key: {login: 'usr'}}
    },
    {
        info: 'GET with self only access',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
            realms: ['r1']
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {login: 'usr', password: 'pass', name: 'name'},
        expectedResultStatus: 200,
        expectedStorageCallParams: {TableName: 'users', Key: {login: 'usr'}}
    },
    {
        httpMethod: 'POST',
        authRealm: 'users',
        authOps: 'create',
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'usr', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.createInstance,
        ioConstructor: () => EditIO,
        eventPart: {
            body: JSON.stringify({login: 'usr', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {"password":"en-US","name":"name","login":"usr"},
        expectedResultStatus: 201,
        expectedStorageCallParams: {TableName: 'users', Item: {login: 'usr', name: 'name', password: 'en-US'}}
    },
    {
        httpMethod: 'PUT',
        authRealm: 'users',
        authOps: 'replace',
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'client', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.replaceInstance,
        ioConstructor: () => EditIO,
        ioConstructorOptions: {successStatus: 202},
        eventPart: {
            body: JSON.stringify({login: 'client', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {"password":"en-US","name":"name","login":"client"},
        expectedResultStatus: 202,
        expectedStorageCallParams: {TableName: 'users', Item: {"login": "client", "password": "en-US", "name": "name"}}
    },
    {
        httpMethod: 'DELETE',
        authRealm: 'users',
        authOps: 'delete',
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        secretResponse: {SecretString: secretResponse},
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'client'}
        },

        expectedResultBody: '',
        expectedResultStatus: 204,
        expectedStorageCallParams: {TableName: 'users', Key: {"login": "client"}}
    }
];

const getFake = (data) => {
    return (params) => {
        return {
            promise: () => {
                return Promise.resolve(data);
            }
        }
    }
};


describe('handler general tests', () => {
    let authenticator;
    let storage;
    let eventInput;
    let eventContext;
    let client;
    let clientStub;
    let secret;
    let secretStub;

    const testRun = test => {
        it(`#${test.httpMethod} calls storage client's ${test.storageMethod} method with ${JSON.stringify(test.expectedStorageCallParams)} and results with status ${test.expectedResultStatus} with ${JSON.stringify(test.expectedResultBody)}`, async () => {
            const executable = test.executable(storage);
            let io;
            let event;
            if (test.secretResponse) {
                secret = Authenticator.getSecretsManagerClient();
                authenticator = Authenticator.getInstance({secretSource: 'source', secretManagerClient: secret});
                secretStub = sinon.stub(secret);
                // stub SecretManager client method with expected response
                secretStub.getSecretValue.callsFake(getFake(test.secretResponse));
            }
            io = test.ioConstructor().getInstance(executable, authenticator, test.ioConstructorOptions);

            if (test.grant) {
                const token = await authenticator.grant({[test.grant.object]: test.operation}, test.grant.subject, test.grant.realms);
                event = eventInput.get(Object.assign({
                    httpMethod: test.httpMethod,
                    headers: {'x-auth-token': token.get()}
                }, test.eventPart));
            } else {
                event = eventInput.get(Object.assign({
                    httpMethod: test.httpMethod,
                }, test.eventPart));
            }

            const context = eventContext.get({});

            const handler = apiGwProxyProvider({ [test.httpMethod]: io });

            // stub storage client method with expected response
            clientStub[test.storageMethod].yieldsRightAsync(test.storageError, test.storageResponse);

            // run handler
            const result :APIGatewayProxyResult = await new Promise((resolve, reject) => {
                handler.call({}, event, context, (err, result) => {
                    if (err) return reject(err);
                    return resolve(result);
                });
            });

            // check result
            expect(result.statusCode).eql(test.expectedResultStatus);
            expect(result.headers).eql({
                "Content-Type": "application/json"
            });
            if (test.expectedResultBody) {
                expect(JSON.parse(result.body)).eql(test.expectedResultBody);
            } else {
                expect(result.body).equal('');
            }

            // check if correct storage method is called
            expect(client[test.storageMethod].args.length).eql(1);

            // check if storage method is called with expected params
            expect(client[test.storageMethod].args[0][0]).eql(test.expectedStorageCallParams);


            return true;
        });

    };

    beforeEach(() => {
        client = DynamodbModelStorage.getDefaultClient();
        storage = UserStorage.getInstance('users', client);
        authenticator = null;

        eventInput = new EventPayload(null, 'input');
        eventContext = new EventPayload(null, 'context');

        clientStub = sinon.stub(client);
    });

    // it('no auth token', async () => {
    //     const test = tests[0];
    //     const executable = test.executable(storage);
    //     const io = test.ioConstructor().getInstance(executable, authenticator, test.ioConstructorOptions);
    //     const handler = apiGwProxyProvider({ [test.httpMethod]: io });
    //
    //     const event = eventInput.get(Object.assign({
    //         httpMethod: test.httpMethod,
    //     }, test.eventPart));
    //     const context = eventContext.get({});
    //     // stub storage client method with expected response
    //     clientStub[test.storageMethod].yieldsRightAsync(test.storageError, test.storageResponse);
    //
    //     // stub storage client method with expected response
    //     clientStub[test.storageMethod].yieldsRightAsync(test.storageError, test.storageResponse);
    //
    //     // run handler
    //     const result :APIGatewayProxyResult = await new Promise((resolve, reject) => {
    //         handler.call({}, event, context, (err, result) => {
    //             if (err) return reject(err);
    //             return resolve(result);
    //         });
    //     });
    //
    //     // check result
    //     expect(result.statusCode).eql(403);
    //     expect(result.headers).eql({
    //         "Content-Type": "application/json"
    //     });
    //     expect(result.body).equal('{"message":"not identified","errors":[{"message":"bad tokens"}]}');
    // });

    afterEach(() => {
        sinon.restore();
    });

    // tests.forEach(testRun);
    testRun(tests[1]);
});
