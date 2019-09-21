import {JWTAuth} from '@skazska/a-s-m-jwt-auth'
import {GenericResult, IAuthError, AbstractAuth, success, failure, RegExIdentity, IAuthIdentity, IAccessDetails,
    IAuthOptions,
    IStorage,
    IError} from '@skazska/abstract-service-model';
import {APISecretStorage} from './aws/storage/secret';
import {ISecretValue} from "./model";

/**
 * Module provides Api Authenticator
 */

/**
 * Authenticator constructor config structure
 */
export interface IAPIAuthOptions extends IAuthOptions {
    secretSource :string,
    secretStorage? : IStorage<string, ISecretValue>
}

/**
 * Auth Identity constructor
 */
const identityConstructor :(subject :string, details :IAccessDetails, realm? :string) => IAuthIdentity = RegExIdentity.getInstance;

/**
 * Authenticator based on JWTAuth
 */
export class Authenticator extends JWTAuth {
    protected secretCache: ISecretValue;
    protected secretStorage :IStorage<string, ISecretValue>;

    constructor(options :IAPIAuthOptions) {
        super(identityConstructor, options);
        this.secretStorage = options.secretStorage
    }

    /**
     * returns secret to be used for encode and verify signature from secret storage
     */
    protected async load(): Promise<GenericResult<ISecretValue, IError>> {
        if (!this.secretCache) {
            const secretName = this.options.secretSource;

            const secretResult = await this.secretStorage.load(secretName);

            if (!secretResult.isFailure) this.secretCache = secretResult.get();
            return secretResult;
        } else {
            return Promise.resolve(success(this.secretCache));
        }
    }

    /**
     * returns secret to be used for encode and verify signature from secret storage
     */
    protected async salt(): Promise<GenericResult<string, IError>> {
        const secretResult = await this.load();
        if (secretResult.isFailure) return failure([secretResult.errors[0]]); //AbstractAuth.error('bad secret')
        return success(this.secretCache.authPasswordSalt);
    }

    /**
     * returns password's hash TODO
     */
    protected async hash(password :string): Promise<GenericResult<string, IError>> {
        const secretResult = await this.load();
        if (secretResult.isFailure) return failure([secretResult.errors[0]]); //AbstractAuth.error('bad secret')
        return success(this.secretCache.authPasswordSalt);
    }

    /**
     * returns secret to be used for encode and verify signature from secret storage
     */
    protected async secret(): Promise<GenericResult<string, IError>> {
        const secretResult = await this.load();
        if (secretResult.isFailure) return failure([secretResult.errors[0]]); //AbstractAuth.error('bad secret')
        return success(this.secretCache.authApiSecret);
    }

    /**
     * returns instance, provides defaults for
     * @param secretSource - secret identifier
     * @param secretStorage - secret storage
     */
    static getInstance(secretSource? :string, secretStorage? :IStorage<string, ISecretValue>) {
        const opts = {
            secretSource: secretSource || '@-api-secrets',
            secretStorage: secretStorage || APISecretStorage.getInstance()
        };
        return new Authenticator(opts);
    }
}
