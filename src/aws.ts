import {GetIO as GetUserIO, EditIO as EditUserIO, DeleteIO as DeleteUserIO} from "./aws/i-o/user";
import {factory} from "./executables";
import {Authenticator} from "./authenticator";

export interface IApiGwProxyProviderConfig {
    GET? :GetUserIO,
    POST? :EditUserIO,
    PUT? :EditUserIO, //TODO
    PATCH? :EditUserIO,
    DELETE? :DeleteUserIO
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
const getUserIO = new GetUserIO(readExecutable, authenticator);

const deleteExecutable = factory.deleteInstance();
const deleteUserIo = new DeleteUserIO(deleteExecutable, authenticator);

const createExecutable = factory.createInstance();
const postUserIo = new EditUserIO(createExecutable);

const replaceExecutable = factory.replaceInstance();
const replaceUserIo = new EditUserIO(replaceExecutable, authenticator);

// TODO
const updateExecutable = factory.updateInstance();
const updateUserIo = new EditUserIO(updateExecutable, authenticator);


export const userHandler = apiGwProxyProvider({
    'GET' :getUserIO,
    'POST' :postUserIo,
    'PUT' :replaceUserIo,
    'PATCH' :updateUserIo, // TODO
    'DELETE' :deleteUserIo
});

// export const tokenHandler = apiGwProxyProvider({
//     'GET' :getUserIO,
//     'POST' :postUserIo,
//     'PUT' :replaceUserIo,
//     'PATCH' :updateUserIo, // TODO
//     'DELETE' :deleteUserIo
// });
