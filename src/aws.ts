import {GetIO as GetUserIO, EditIO as EditUserIO, DeleteIO as DeleteUserIO} from "./aws/i-o/user";

import {factory as userExecFactory} from "./executables/user";
import {Authenticator} from "./authenticator";

import {AuthIO, ExchangeIO} from "./aws/i-o/token";
import {factory as tokenExecFactory} from "./executables/token";
import {IIO} from "@skazska/abstract-service-model";

export interface IApiGwProxyProviderConfig {
    [method: string] :() => IIO;
}

export const userApiGwProxyProvider = (config :IApiGwProxyProviderConfig) => {
    return async (event, context, callback) => {

        try {
            const io = config[event.httpMethod]();
            const result = await io.handler({event: event, context: context, callback: callback});

            return callback(null, result);
        } catch (e) {
            console.error(e);
            callback(null, {
                statusCode: 500,
                body: e,
                headers: {
                    'Content-Type': 'application/json',
                },
            })

        }
    };
};

let _authenticator :Authenticator;
const getAuthenticator = () => {
    if (!_authenticator) _authenticator = Authenticator.getInstance();
    return _authenticator;
};

export const userHandler = userApiGwProxyProvider({
    'GET'    :() => {
        const readExecutable = userExecFactory.readInstance();
        return new GetUserIO(readExecutable, getAuthenticator());
    },
    'POST'   :() => {
        const createExecutable = userExecFactory.createInstance();
        return new EditUserIO(createExecutable);
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

export const authHandler = userApiGwProxyProvider({
    'GET'  :() => {
        const authExecutable = tokenExecFactory.auth();
        return new AuthIO(authExecutable, getAuthenticator());
    },
    'POST' :() => {
        const exchangeExecutable = tokenExecFactory.exchange();
        return new ExchangeIO(exchangeExecutable, getAuthenticator());
    }
});
