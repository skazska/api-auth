import {JWTAuth} from '@skazska/a-s-m-jwt-auth'
import {GenericResult, IAuthError, AbstractAuth, success, failure, RegExIdentity, IAuthIdentity, IAccessDetails,
    IAuthOptions} from '@skazska/abstract-service-model';
import {SecretsManager} from 'aws-sdk'

export interface IAPIAuthOptions extends IAuthOptions {
    secretSource :string,
    secretManagerClient? : SecretsManager
}

export interface ISecretValue {
    authApiSecret :string,
    authPasswordSalt :string
}

const identityConstructor :(subject :string, details :IAccessDetails, realm? :string) => IAuthIdentity = RegExIdentity.getInstance;

export class Authenticator extends JWTAuth {
    protected secretCache: ISecretValue;
    protected secretManagerClient :SecretsManager;

    constructor(options :IAPIAuthOptions) {
        super(identityConstructor, options);
        this.secretManagerClient = options.secretManagerClient || Authenticator.getSecretsManagerClient(
            // {
            //     region: region
            // }
        )
    }

    protected async secret(): Promise<GenericResult<any, IAuthError>> {
        if (!this.secretCache) {
            const secretName = this.options.secretSource;

            // Create a Secrets Manager client
            const client = this.secretManagerClient;

            let data :SecretsManager.GetSecretValueResponse;
            try {
                data = await client.getSecretValue({SecretId: secretName}).promise();
            } catch (e) {
                return failure([ AbstractAuth.error(e.code) ]);
            }
            // Decrypts secret using the associated KMS CMK.
            // Depending on whether the secret is a string or binary, one of these fields will be populated.
            let secretString :string;
            if ('SecretString' in data) {
                secretString = data.SecretString;
            } else {
                let buff = Buffer.from(<string>data.SecretBinary, 'base64');
                secretString = buff.toString('ascii');
            }

            try {
                this.secretCache = JSON.parse(secretString);
                return success(this.secretCache.authApiSecret);
            } catch (e) {
                return failure([AbstractAuth.error('bad secret')]);
            }


        } else {
            return Promise.resolve(success(this.secretCache.authApiSecret));
        }
    }

    static getSecretsManagerClient(options? :SecretsManager.Types.ClientConfiguration) {
        return new SecretsManager(options);
    }

    static getInstance(options? :IAPIAuthOptions) {
        const opts = {
            secretSource: (options && options.secretSource) || '@-api-secrets',
            secretManagerClient: (options && options.secretManagerClient) || Authenticator.getSecretsManagerClient(
                // {
                //     region: region
                // }
            )
        };
        return new Authenticator(opts);
    }
}
