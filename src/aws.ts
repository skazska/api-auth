import {GetIO as GetUserIO, EditIO as EditUserIO, DeleteIO as DeleteUserIO, CreateIO as CreateUserIO} from "./aws/i-o/user";

import {factory as userExecFactory} from "./executables/user";
import {Authenticator} from "./authenticator";

import {AuthIO, ExchangeIO} from "./aws/i-o/token";
import {factory as tokenExecFactory} from "./executables/token";
import {IIO} from "@skazska/abstract-service-model";

export interface IApiGwProxyProviderConfig {
    [method: string] :() => IIO;
}

export const apiGwProxyProvider = (config :IApiGwProxyProviderConfig) => {
    return async (event, context, callback) => {
        const error = (e: Error) => {
            callback(null, {
                statusCode: 500,
                body: e,
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        };

        if (!config[event.httpMethod])
            return error(new Error('Http method ' + event.httpMethod + ' not supported'));
        try {
            const io = config[event.httpMethod]();
            const result = await io.handler({event: event, context: context, callback: callback});

            return callback(null, result);
        } catch (e) {
            error(e);
        }
    };
};

let _authenticator :Authenticator;
const getAuthenticator = () => {
    if (!_authenticator) _authenticator = Authenticator.getInstance();
    return _authenticator;
};

export const userHandler = apiGwProxyProvider({
    'GET'    :() => {
        const readExecutable = userExecFactory.readInstance();
        return new GetUserIO(readExecutable, getAuthenticator());
    },
    'POST'   :() => {
        const createExecutable = userExecFactory.createInstance();
        return new CreateUserIO(createExecutable, null, {utilAuthenticator: getAuthenticator()});
    },
    'PUT'    :() => {
        const replaceExecutable = userExecFactory.replaceInstance();
        return new EditUserIO(replaceExecutable, getAuthenticator());
    },
    'PATCH'  :() => {
        // TODO
        const updateExecutable = userExecFactory.updateInstance();
        return new EditUserIO(updateExecutable, getAuthenticator());
    },
    'DELETE' :() => {
        const deleteExecutable = userExecFactory.deleteInstance();
        return new DeleteUserIO(deleteExecutable, getAuthenticator());
    }
});

export const authHandler = apiGwProxyProvider({
    'GET'  :() => {
        const authExecutable = tokenExecFactory.auth();
        return new AuthIO(authExecutable);
    },
    'POST' :() => {
        const exchangeExecutable = tokenExecFactory.exchange();
        return new ExchangeIO(exchangeExecutable, getAuthenticator());
    }
});
