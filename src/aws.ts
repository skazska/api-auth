import {GetIO} from "./aws/i-o/get";
import {UserReadExecutable} from "./executables/read";
import {Authenticator} from "./authenticator";
import {EditIO} from "./aws/i-o/edit";
import {UserSaveExecutable} from "./executables/save";
import {DeleteIO} from "./aws/i-o/delete";
import {RegExIdentity} from "@skazska/abstract-service-model";

export interface IApiGwProxyProviderConfig {
    GET? :GetIO,
    POST? :EditIO,
    PUT? :EditIO, //TODO
    PATCH? :EditIO,
    DELETE? :DeleteIO
}

export const apiGwProxyProvider = (config :IApiGwProxyProviderConfig) => {
    return async (event, context, callback) => {

        console.dir(event);
        try {
            const io = config[event.httpMethod];
            const result = await io.handler({event: event, context: context, callback: callback});

            if (result.isFailure) {
                throw new Error(JSON.stringify(result.errors));
            }

            return callback(null, result.get());
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

const authenticator = Authenticator.getInstance(RegExIdentity);
const readExecutable = UserReadExecutable.getInstance();
const getIo = new GetIO(readExecutable, authenticator);

const deleteExecutable = UserReadExecutable.getInstance();
const deleteIo = new DeleteIO(deleteExecutable, authenticator);

const createExecutable = UserSaveExecutable.getInstance('create');
const postIo = new EditIO(createExecutable, authenticator);

const replaceExecutable = UserSaveExecutable.getInstance('replace');
const replaceIo = new EditIO(replaceExecutable, authenticator);

// TODO
const updateExecutable = UserSaveExecutable.getInstance('update');
const updateIo = new EditIO(updateExecutable, authenticator);


export const handler = apiGwProxyProvider({
    'GET' :getIo,
    'POST' :postIo,
    'PUT' :replaceIo,
    'PATCH' :updateIo, // TODO
    'DELETE' :deleteIo
});
