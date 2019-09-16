import {
    GenericResult,
    success,
    IRunError,
    IExecutableConfig,
    AbstractExecutable, failure, IAuthIdentity, IError, IStorageError, IModel, IAccessDetails, AbstractAuth
} from "@skazska/abstract-service-model";
import {IAuthCredentials, ITokens, IExchangeTokens, UserModel, IRoles} from "../model";
import {UserStorage} from "../aws/storage/user";
import {Authenticator} from "../authenticator";
import {fail} from "assert";
import {RoleStorage} from "../aws/storage/roles";

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
let _defaultStorage :UserStorage;
const getDefaultStorage = () => {
    if (!_defaultStorage) _defaultStorage = UserStorage.getInstance('users');
    return _defaultStorage
};

/**
 *default storage
 */
let _defaultAuthenticator :Authenticator;
const getDefaultAuthenticator = () => {
    if (!_defaultAuthenticator) _defaultAuthenticator = Authenticator.getInstance();
    return _defaultAuthenticator;
};

/**
 * default role storage
 */
let _defaultRoleStorage :RoleStorage;
const getDefaultRoleStorage = () => {
    if (!_defaultRoleStorage) _defaultRoleStorage = RoleStorage.getInstance(
        'api-auth',
        {key: 'api-auth-roles'},
    );
    return _defaultRoleStorage;
};

/**
 * config for `GrantExecutable` constructor
 * needs authenticator to generate token pairs
 */
export interface IGrantExecutableConfig extends IExecutableConfig {
    authenticator :Authenticator
    storage :UserStorage
    roleStorage :RoleStorage
}

/**
 * implements 'granting' token  executable
 */
abstract class GrantExecutable<I> extends AbstractExecutable<I, ITokens> {
    protected authenticator :Authenticator;
    protected storage: UserStorage;
    protected roleStorage: RoleStorage;
    protected constructor(props: IGrantExecutableConfig) {
        super(props);
        this.authenticator = props.authenticator;
        this.storage = props.storage;
        this.roleStorage = props.roleStorage;
    }

    protected checkUserPassword(user :UserModel, password :string) :boolean {
        return true;
    }

    protected async getUserAccessDetails(login :string, password? :string) :Promise< GenericResult< IAccessDetails,IRunError >>{
        // get user roles
        const [userRolesResult, rolesResult] = await Promise.all([
            this.storage.load({login: login}, {projectionExpression: 'roles,password'}),
            this.roleStorage.getRoles()
        ]);

        if (rolesResult.isFailure) return rolesResult;

        if (userRolesResult.isFailure) {
            if (userRolesResult.errors[0].message === 'not found') return failure([AbstractAuth.error('bad credentials')]);
            return userRolesResult;
        }

        const user = userRolesResult.get();
        if (password && !this.checkUserPassword(user, password)) return failure([AbstractAuth.error('bad credentials')]);


        // take user current roles or `basic` role
        let userRoles = user.getProperties().roles;
        if (!userRoles) userRoles = [];
        if (!userRoles.length) userRoles.push('basic');

        // compose accessDetails from roles
        const roles = rolesResult.get();
        const accessDetails :IAccessDetails = userRoles.reduce((accessDetails, role) => {
            const roleDetails = roles[role];
            if (roleDetails) {
                for (let obj in roleDetails) {
                    if (!accessDetails[obj]) {
                        accessDetails[obj] = roleDetails[obj];
                    } else {
                        accessDetails[obj].push(roleDetails[obj]);
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

        let accessDetails = await this.getUserAccessDetails(params.login, params.password);

        if (accessDetails.isFailure) return failure(accessDetails.errors);


        return Promise.all([
            await this.authenticator.grant({}, params.login, []),
            await this.authenticator.grant(accessDetails.get(), params.login, [])
        ]).then(tokens => {
            if (tokens[0].isFailure) return failure(tokens[0].errors);
            if (tokens[1].isFailure) return failure(tokens[1].errors);

            return success({
                exchange: tokens[0].get(),
                auth: tokens[1].get()
            });
        })
    }

}

export const factory = {
    auth: (authenticator? :Authenticator, storage? :UserStorage, roleStorage? :RoleStorage) => {
        return new AuthExecutable({
            storage: storage || getDefaultStorage(),
            authenticator: authenticator || getDefaultAuthenticator(),
            roleStorage: roleStorage || getDefaultRoleStorage()
        });
    },
    exchange: (authenticator? :Authenticator, storage? :UserStorage, roleStorage? :RoleStorage) => {
        return new ExchangeExecutable({
            storage: storage || getDefaultStorage(),
            authenticator: authenticator || getDefaultAuthenticator(),
            roleStorage: roleStorage || getDefaultRoleStorage()
        });
    }
};
