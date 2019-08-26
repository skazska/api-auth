import {GetIO} from "./aws/i-o/get";
import {factory} from "./executables";
import {Authenticator} from "./authenticator";
import {EditIO} from "./aws/i-o/edit";
import {DeleteIO} from "./aws/i-o/delete";

export interface IApiGwProxyProviderConfig {
    GET? :GetIO,
    POST? :EditIO,
    PUT? :EditIO, //TODO
    PATCH? :EditIO,
    DELETE? :DeleteIO
}

export const apiGwProxyProvider = (config :IApiGwProxyProviderConfig) => {
    return async (event, context, callback) => {

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

const authenticator = Authenticator.getInstance({secretSource: '@-api-secrets'});
const readExecutable = factory.readInstance();
const getIo = new GetIO(readExecutable, authenticator);

const deleteExecutable = factory.deleteInstance();
const deleteIo = new DeleteIO(deleteExecutable, authenticator);

const createExecutable = factory.createInstance();
const postIo = new EditIO(createExecutable);

const replaceExecutable = factory.replaceInstance();
const replaceIo = new EditIO(replaceExecutable, authenticator);

// TODO
const updateExecutable = factory.updateInstance();
const updateIo = new EditIO(updateExecutable, authenticator);


export const handler = apiGwProxyProvider({
    'GET' :getIo,
    'POST' :postIo,
    'PUT' :replaceIo,
    'PATCH' :updateIo, // TODO
    'DELETE' :deleteIo
});
