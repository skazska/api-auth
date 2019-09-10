import {
    GenericResult,
    success,
    IRunError,
    IExecutableConfig,
    AbstractExecutable, failure, IAuthIdentity, IError, IStorageError, IModel, IAccessDetails
} from "@skazska/abstract-service-model";
import {IAuthCredentials, ITokens, IExchangeTokens, UserModel, IRoles} from "../model";
import {UserStorage} from "../aws/storage";
import {Authenticator} from "../authenticator";
import {fail} from "assert";

/**
 * Token executable module, provides executables for:
 * 1. exchange authentication credentials to tokens,
 * 2. exchange long lasting exchange token to tokens
 *
 * these executables return pair of tokens {exchange, auth}  auth token is to be used for exchange for new pair of
 * tokens
 */

/**
 *default storage
 */
const defaultStorage = UserStorage.getInstance('users');

/**
 *default storage
 */
const defaultAuthenticator = Authenticator.getInstance();


/**
 * config for `GrantExecutable` constructor
 * needs authenticator to generate token pairs
 */
export interface IGrantExecutableConfig extends IExecutableConfig {
    authenticator :Authenticator
    storage :UserStorage
    roles :IRoles
}

/**
 * implements 'granting' token  executable
 */
abstract class GrantExecutable<I> extends AbstractExecutable<I, ITokens> {
    protected authenticator :Authenticator;
    protected storage: UserStorage;
    protected roles: IRoles;
    protected constructor(props: IGrantExecutableConfig) {
        super(props);
        this.authenticator = props.authenticator;
        this.storage = props.storage;
        this.roles = props.roles;
    }

    protected async getUserAccessDetails(login :string) :Promise< GenericResult< IAccessDetails,IStorageError >>{
        // get user roles
        const userRolesResult = await this.storage.load({login: login}, {projectionExpression: 'roles'});
        if (userRolesResult.isFailure) return userRolesResult;
        let roles = userRolesResult.get().getProperties().roles;
        if (!roles) roles = [];
        if (!roles.length) roles.push('basic');

        // compose accessDetails from roles
        const accessDetails :IAccessDetails = roles.reduce((accessDetails, role) => {
            const roleDetails = this.roles[role];
            if (roleDetails) {
                for (let [obj, access] of roleDetails.entries()) {
                    if (!accessDetails[obj]) {
                        accessDetails[obj] = [access];
                    } else {
                        accessDetails[obj].push(access);
                    }
                }
            }
            return accessDetails;
        },{});
        return success(accessDetails);
    }
}

/**
 * implements exchange of exchange token for token pair, needs invocator to provide `run` with identity of
 * exchange token
 */
export class ExchangeExecutable extends GrantExecutable<IExchangeTokens> {
    constructor(props: IGrantExecutableConfig) { super(props); }

    async run(params :IExchangeTokens, identity? :IAuthIdentity) :Promise<GenericResult<ITokens, IError>> {
        if (!identity) return Promise.resolve(
            failure([AbstractExecutable.error('identity is not provided', 'token exchange')])
        );
        const authResult = this._authenticate(identity, params);
        if (authResult.isFailure) return authResult;
        params.login = authResult.get().subject;
        return this._execute(params);
    }


    protected async _execute(params: IExchangeTokens): Promise<GenericResult<ITokens, IRunError>> {

        return Promise.resolve(success({
            exchange: '',
            auth: ''
        }));
    }

}

/**
 * implements basic authentication, returns token pair
 */
export class AuthExecutable extends GrantExecutable<IAuthCredentials> {
    constructor(props: IGrantExecutableConfig) {
        super(props);
    }

    protected async _execute(params: IAuthCredentials): Promise<GenericResult<ITokens, IRunError>> {

        return Promise.resolve(success({
            exchange: '',
            auth: ''
        }));
    }

}

export const factory = {
    auth: (roles :IRoles, authenticator? :Authenticator, storage? :UserStorage) => {
        return new AuthExecutable({
            storage: storage || defaultStorage,
            authenticator: authenticator || defaultAuthenticator,
            roles: roles
        });
    },
    exchange: (roles :IRoles, authenticator? :Authenticator, storage? :UserStorage) => {
        return new ExchangeExecutable({
            storage: storage || defaultStorage,
            authenticator: authenticator || defaultAuthenticator,
            roles: roles
        });
    }
};
