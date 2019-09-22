import "mocha";
import {expect, use}  from 'chai';

import {Authenticator} from "../../src/authenticator";
import {APISecretStorage} from "../../src/aws/storage/secret";
import {APIGatewayProxyResult} from "aws-lambda";
import {AuthIO, ExchangeIO} from "../../src/aws/i-o/token";
import {factory} from "../../src/executables/token";

import {UserStorage} from "../../src/aws/storage/user";
import {RoleStorage} from "../../src/aws/storage/roles";
import {apiGwProxyProvider} from "../../src/aws";
import {EventPayload} from './util/lambda';
import {DynamodbModelStorage, S3Storage} from "@skazska/abstract-aws-service-model";


import sinon from "sinon";
import {IRoles, IExchangeTokens, ITokens} from "../../src/model";
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
    let secretStorage;
    let eventInput;
    let eventContext;
    let client;
    let s3Client;
    let secretClient;
    let clientStub;
    let s3ClientStub;
    let secretStub;

    let tokens :ITokens; //IExchangeTokens;

    beforeEach(() => {
        // dunamodb client to stub user data loading (user roles) for user storage
        client = DynamodbModelStorage.getDefaultClient();
        // user storage
        storage = UserStorage.getInstance('users', client);
        // secret manager client to stub secrets loading for secrets storage
        secretClient = APISecretStorage.getDefaultClient();
        // secret storage
        secretStorage = APISecretStorage.getInstance(secretClient);
        // s3 client to stub roles config loading for roles storage
        s3Client = S3Storage.getDefaultClient();
        // roles storage
        roleStorage = RoleStorage.getInstance(
            'api-auth',
            {key: 'api-auth-roles'},
            s3Client
        );
        // authenticator instance
        authenticator = null;

        // lambda event input and context
        eventInput = new EventPayload(null, 'input');
        eventContext = new EventPayload(null, 'context');

        // stubs
        clientStub = sinon.stub(client);
        s3ClientStub = sinon.stub(s3Client);
        secretStub = sinon.stub(secretClient);

        // stub SecretManager client method with expected response
        secretStub.getSecretValue.callsFake(getFake(null, {SecretString: secretResponse}));
        // stub roles storage client method with expected response
        s3ClientStub['getObject'].callsFake(getFake(null, {Body: JSON.stringify(rolesData)}));

    });

    afterEach(() => {
        sinon.restore();
    });

    it('success auth returns set of tokens', async () => {
        // stub user storage client method with expected response
        clientStub['get'].yieldsRightAsync(null, {Item: {login: 'usr', password: 'pass', name: 'name'}});

        // instantiate authenticator
        authenticator = Authenticator.getInstance('source', secretStorage);

        // instantiate auth executable
        const executable = factory.auth(authenticator, storage, roleStorage);

        // instantiate auth io
        const io = AuthIO.getInstance(executable);

        // configure event
        const event = eventInput.get({
            httpMethod: 'GET',
            headers: {'x-auth-basic': AuthIO.encodeCredentials('usr', 'rightPassword')}
        });

        // configure context
        const context = eventContext.get({});

        // prepare handler
        const handler = apiGwProxyProvider({'GET': () => io});

        // execute handler (wrapped in Promise to keep async/await style of routine, prepared handler should work
        // with callback)
        const result: APIGatewayProxyResult = await new Promise((resolve, reject) => {
            handler.call({}, event, context, (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            });
        });

        // check results
        expect(result.statusCode).eql(200);
        expect(result.headers).eql({
            "Content-Type": "application/json"
        });
        let data = JSON.parse(result.body);

        expect(data).to.have.property('exchange');
        expect(data).to.have.property('auth');

        tokens = data;

        // TODO
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

    it('valid exchange token returns new token set', async () => {
        // stub user storage client method with expected response
        clientStub['get'].yieldsRightAsync(null, {Item: {login: 'usr', password: 'pass', name: 'name'}});

        // instantiate authenticator
        authenticator = Authenticator.getInstance('source', secretStorage);

        // instantiate auth executable
        const executable = factory.exchange(authenticator, storage, roleStorage);

        // instantiate auth io
        const io = ExchangeIO.getInstance(executable, authenticator);

        // configure event
        const event = eventInput.get({
            httpMethod: 'POST',
            headers: {'x-exchange-token': tokens.exchange}
        });

        // configure context
        const context = eventContext.get({});

        // prepare handler
        const handler = apiGwProxyProvider({'POST': () => io});

        // execute handler (wrapped in Promise to keep async/await style of routine, prepared handler should work
        // with callback)
        const result: APIGatewayProxyResult = await new Promise((resolve, reject) => {
            // use timeout to have time gap for new tokens generation
            setTimeout(()=>{
                handler.call({}, event, context, (err, result) => {
                    if (err) return reject(err);
                    return resolve(result);
                });
            }, 100);
        });

        // check results
        expect(result.statusCode).eql(200);
        expect(result.headers).eql({
            "Content-Type": "application/json"
        });
        let data = JSON.parse(result.body);

        expect(data).to.have.property('exchange');
        expect(data).to.have.property('auth');

        expect(data.exchange).not.equal(tokens.exchange);
        expect(data.auth).not.equal(tokens.auth);

        //TODO
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
