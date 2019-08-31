import "mocha";
import {expect, use}  from 'chai';

import {Authenticator} from "../../src/authenticator";
import {APIGatewayProxyResult} from "aws-lambda";
import {EditIO, DeleteIO, GetIO} from "../../src/aws/i-o/user";
import {factory} from "../../src/executables/user";

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
        info: '#0 GET with valid token returns user data got from storage',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'read',
            subject: 'usr'
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
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
        info: '#1 GET with no token - fails',
        httpMethod: 'GET',
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "isAuthError": true,
                    "message": "x-auth-token header missing",
                }
            ],
            "message": "Unauthorized"
        },
        expectedResultStatus: 401
    },
    {
        info: '#2 GET with token of no access  - fails',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'check',
            subject: 'usr',
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "read",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
    },
    {
        info: '#3 GET with self only access returns user data got from storage',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
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
        info: '#4 GET with self only access and different subject fails',
        httpMethod: 'GET',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr1',
        },
        storageMethod: 'get',
        storageResponse: {Item: {login: 'usr', password: 'pass', name: 'name'}},
        storageError: null,
        executable: factory.readInstance,
        ioConstructor: () => GetIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "read",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
    },
    {
        info: '#5 POST with valid token puts data to storage and returns it',
        httpMethod: 'POST',
        grant: {
            object: 'users',
            operation: 'create',
            subject: 'usr',
        },
        noAuthenticator: true, //(not using authenticator fot POST user),
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
        info: '#6 POST with no token puts data to storage and returns it',
        httpMethod: 'POST',
        noAuthenticator: true, //(not using authenticator fot POST user),
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
        info: '#7 POST with create access and different subject puts data to storage and returns it',
        httpMethod: 'POST',
        grant: {
            object: 'users',
            operation: 'create',
            subject: 'usr',
        },
        noAuthenticator: true, //(not using authenticator fot POST user),
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'usr1', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.createInstance,
        ioConstructor: () => EditIO,
        eventPart: {
            body: JSON.stringify({login: 'usr1', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {"password":"en-US","name":"name","login":"usr1"},
        expectedResultStatus: 201,
        expectedStorageCallParams: {TableName: 'users', Item: {login: 'usr1', name: 'name', password: 'en-US'}}
    },
    // {
    //     // irrelevant as using no authenticator for CREATE user
    //     info: '#8 POST with self only access and different subject fails',
    //     httpMethod: 'POST',
    //     grant: {
    //         object: 'users',
    //         operation: 'self',
    //         subject: 'usr',
    //     },
    //     noAuthenticator: true, //(not using authenticator fot POST user),
    //     storageMethod: 'put',
    //     storageResponse: {Attributes: {login: 'usr1', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
    //     storageError: null,
    //     executable: factory.createInstance,
    //     ioConstructor: () => EditIO,
    //     eventPart: {
    //         body: JSON.stringify({login: 'usr1', name: 'name', password: 'en-US'})
    //     },
    //
    //     expectedResultBody: {
    //         "errors": [
    //             {
    //                 "action": "create",
    //                 "isAuthError": true,
    //                 "message": "action not permitted",
    //                 "object": "users",
    //             }
    //         ],
    //         "message": "Forbidden"
    //     },
    //     expectedResultStatus: 403
    // },
    {
        info: '#8 PUT with valid token puts data to storage and returns it',
        httpMethod: 'PUT',
        grant: {
            object: 'users',
            operation: 'replace',
            subject: 'usr',
        },
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'client', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
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
        info: '#9 PUT with no access token - fails',
        httpMethod: 'PUT',
        authRealm: 'users',
        authOps: 'replace',
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'client', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.replaceInstance,
        ioConstructor: () => EditIO,
        ioConstructorOptions: {successStatus: 202},
        eventPart: {
            body: JSON.stringify({login: 'client', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {
            "errors": [
                {
                    "isAuthError": true,
                    "message": "x-auth-token header missing",
                }
            ],
            "message": "Unauthorized"
        },
        expectedResultStatus: 401
    },
    {
        info: '#10 PUT with token of no access - fails',
        httpMethod: 'PUT',
        grant: {
            object: 'users',
            operation: 'get',
            subject: 'usr',
        },
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'client', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.replaceInstance,
        ioConstructor: () => EditIO,
        ioConstructorOptions: {successStatus: 202},
        eventPart: {
            body: JSON.stringify({login: 'client', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "replace",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
    },
    {
        info: '#11 PUT with self access token puts data to storage and returns it',
        httpMethod: 'PUT',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
        },
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'usr', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.replaceInstance,
        ioConstructor: () => EditIO,
        ioConstructorOptions: {successStatus: 202},
        eventPart: {
            body: JSON.stringify({login: 'usr', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {"password":"en-US","name":"name","login":"usr"},
        expectedResultStatus: 202,
        expectedStorageCallParams: {TableName: 'users', Item: {"login": "usr", "password": "en-US", "name": "name"}}
    },
    {
        info: '#12 PUT with self access token fails for different user',
        httpMethod: 'PUT',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
        },
        storageMethod: 'put',
        storageResponse: {Attributes: {login: 'client', name: 'executable expected to return passed model at the moment', password: 'en-US'}},
        storageError: null,
        executable: factory.replaceInstance,
        ioConstructor: () => EditIO,
        ioConstructorOptions: {successStatus: 202},
        eventPart: {
            body: JSON.stringify({login: 'client', name: 'name', password: 'en-US'})
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "replace",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
    },
    {
        info: '#13 DELETE with valid token puts data to storage and returns it',
        httpMethod: 'DELETE',
        grant: {
            object: 'users',
            operation: 'delete',
            subject: 'usr',
        },
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'client'}
        },

        expectedResultBody: '',
        expectedResultStatus: 204,
        expectedStorageCallParams: {TableName: 'users', Key: {"login": "client"}}
    },
    {
        info: '#14 DELETE with no access token - fails',
        httpMethod: 'DELETE',
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'client'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "isAuthError": true,
                    "message": "x-auth-token header missing",
                }
            ],
            "message": "Unauthorized"
        },
        expectedResultStatus: 401
    },
    {
        info: '#15 DELETE with token of no access - fails',
        httpMethod: 'DELETE',
        grant: {
            object: 'users',
            operation: 'get',
            subject: 'usr',
        },
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'client'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "delete",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
    },
    {
        info: '#16 DELETE with self access token puts data to storage and returns it',
        httpMethod: 'DELETE',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
        },
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'usr'}
        },

        expectedResultBody: '',
        expectedResultStatus: 204,
        expectedStorageCallParams: {TableName: 'users', Key: {"login": "usr"}}
    },
    {
        info: '#17 DELETE with self access token fails for different user',
        httpMethod: 'DELETE',
        grant: {
            object: 'users',
            operation: 'self',
            subject: 'usr',
        },
        storageMethod: 'delete',
        storageResponse: {Attributes: {}},
        storageError: null,
        executable: factory.deleteInstance,
        ioConstructor: () => DeleteIO,
        eventPart: {
            pathParameters: {login: 'client'}
        },

        expectedResultBody: {
            "errors": [
                {
                    "action": "delete",
                    "isAuthError": true,
                    "message": "action not permitted",
                    "object": "users",
                }
            ],
            "message": "Forbidden"
        },
        expectedResultStatus: 403
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
        it(test.info, async () => {
            const executable = test.executable(storage);
            let io;
            let event;
                secret = Authenticator.getSecretsManagerClient();
                authenticator = Authenticator.getInstance({secretSource: 'source', secretManagerClient: secret});
                secretStub = sinon.stub(secret);
                // stub SecretManager client method with expected response
                secretStub.getSecretValue.callsFake(getFake({SecretString: secretResponse}));
            if (test.noAuthenticator) {
                io = test.ioConstructor().getInstance(executable, null, test.ioConstructorOptions);
            } else {
                io = test.ioConstructor().getInstance(executable, authenticator, test.ioConstructorOptions);
            }

            if (test.grant) {
                // const details = {};
                // details[test.grant.object] = test.grant.operation;
                const token = await authenticator.grant({[test.grant.object]: test.grant.operation}, test.grant.subject, test.grant.realms);
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

            if (test.expectedStorageCallParams) {
                // check if correct storage method is called
                expect(client[test.storageMethod].args.length).eql(1);

                // check if storage method is called with expected params
                expect(client[test.storageMethod].args[0][0]).eql(test.expectedStorageCallParams);
            } else {
                expect(client[test.storageMethod].args.length).eql(0);
            }


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

    afterEach(() => {
        sinon.restore();
    });

    testRun(tests[0]);
    testRun(tests[1]);
    testRun(tests[2]);
    testRun(tests[3]);
    testRun(tests[4]);
    testRun(tests[5]);
    testRun(tests[6]);
    testRun(tests[7]);
    testRun(tests[8]);
    testRun(tests[9]);
    testRun(tests[10]);
    testRun(tests[11]);
    testRun(tests[12]);
    testRun(tests[13]);
    testRun(tests[14]);
    testRun(tests[15]);
    testRun(tests[16]);
    testRun(tests[17]);
});
