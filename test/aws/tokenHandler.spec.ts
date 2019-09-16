import "mocha";
import {expect, use}  from 'chai';

import {Authenticator} from "../../src/authenticator";
import {APIGatewayProxyResult} from "aws-lambda";
import {AuthIO, ExchangeIO} from "../../src/aws/i-o/token";
import {factory} from "../../src/executables/token";

import {UserStorage} from "../../src/aws/storage/user";
import {RoleStorage} from "../../src/aws/storage/roles";
import {apiGwProxyProvider} from "../../src/aws";
import {EventPayload} from './util/lambda';
import {DynamodbModelStorage, S3Storage} from "@skazska/abstract-aws-service-model";


import sinon from "sinon";
import {GetIO} from "../../src/aws/i-o/user";
import {IRoles} from "../../src/model";
// import sinonChai = require("sinon-chai");
// use(sinonChai);

const secretResponse = JSON.stringify({
    authApiSecret :'secret',
    authPasswordSalt :'secret'
});

const rolesData :IRoles = {
    basic: {
        'basic.*': '.*'
    },
    admin: {
        'users': '.*'
    }
};

const getFake = (err, data) => {
    return (params) => {
        return {
            promise: () => {
                return err? Promise.reject(err) : Promise.resolve(data);
            }
        }
    }
};

describe('token handler general tests', () => {
    let authenticator;
    let storage;
    let roleStorage;
    let eventInput;
    let eventContext;
    let client;
    let s3Client;
    let clientStub;
    let s3ClientStub;
    let secret;
    let secretStub;


    beforeEach(() => {
        client = DynamodbModelStorage.getDefaultClient();
        storage = UserStorage.getInstance('users', client);
        s3Client = S3Storage.getDefaultClient();
        roleStorage = RoleStorage.getInstance(
            'api-auth',
            {key: 'api-auth-roles'},
            s3Client
        );
        authenticator = null;

        eventInput = new EventPayload(null, 'input');
        eventContext = new EventPayload(null, 'context');

        clientStub = sinon.stub(client);
        s3ClientStub = sinon.stub(s3Client);
    });


    afterEach(() => {
        sinon.restore();
    });

    describe('auth', () => {
        it('1', async () => {
            let io;
            let event;
            secret = Authenticator.getSecretsManagerClient();
            authenticator = Authenticator.getInstance({secretSource: 'source', secretManagerClient: secret});
            secretStub = sinon.stub(secret);
            // stub SecretManager client method with expected response
            secretStub.getSecretValue.callsFake(getFake(null, {SecretString: secretResponse}));
            const executable = factory.auth(authenticator, storage, roleStorage);

            io = AuthIO.getInstance(executable);

            event = eventInput.get({
                httpMethod: 'GET',
                headers: {'x-auth-basic': AuthIO.encodeCredentials('usr', 'rightPassword')}
            });

            const context = eventContext.get({});

            const handler = apiGwProxyProvider({'GET': () => io});

            // stub storage client method with expected response
            clientStub['get'].yieldsRightAsync(null, {Item: {login: 'usr', password: 'pass', name: 'name'}});
            // stub storage client method with expected response
            s3ClientStub['getObject'].callsFake(getFake(null, {Body: JSON.stringify(rolesData)}));

            // run handler
            const result: APIGatewayProxyResult = await new Promise((resolve, reject) => {
                handler.call({}, event, context, (err, result) => {
                    if (err) return reject(err);
                    return resolve(result);
                });
            });

            // check result
            expect(result.statusCode).eql(200);
            expect(result.headers).eql({
                "Content-Type": "application/json"
            });
            let data = JSON.parse(result.body);

            expect(data).to.have.property('exchange');
            expect(data).to.have.property('auth');

           // if (test.expectedStorageCallParams) {
           //     // check if correct storage method is called
           //     expect(client[test.storageMethod].args.length).eql(1);
           //
           //     // check if storage method is called with expected params
           //     expect(client[test.storageMethod].args[0][0]).eql(test.expectedStorageCallParams);
           // } else {
           //     expect(client[test.storageMethod].args.length).eql(0);
           // }
           //
       });
    });


});
