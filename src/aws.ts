import {GetIO as GetUserIO, EditIO as EditUserIO, DeleteIO as DeleteUserIO} from "./aws/i-o/user";
import {factory as userExecFactory} from "./executables/user";
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

            // if (result.isFailure) {
            //     throw new Error(JSON.stringify(result.errors));
            // }

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

const authenticator = Authenticator.getInstance();
const readExecutable = userExecFactory.readInstance();
const getUserIO = new GetUserIO(readExecutable, authenticator);

const deleteExecutable = userExecFactory.deleteInstance();
const deleteUserIo = new DeleteUserIO(deleteExecutable, authenticator);

const createExecutable = userExecFactory.createInstance();
const postUserIo = new EditUserIO(createExecutable);

const replaceExecutable = userExecFactory.replaceInstance();
const replaceUserIo = new EditUserIO(replaceExecutable, authenticator);

// TODO
const updateExecutable = userExecFactory.updateInstance();
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
