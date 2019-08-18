import {JWTAuth} from '@skazska/a-s-m-jwt-auth'
import {GenericResult, IAuthError, AbstractAuth, success, failure, RegExIdentity, IAuthIdentity, IAccessDetails,
    IAuthOptions} from '@skazska/abstract-service-model';
import {SecretsManager} from 'aws-sdk'

const identityConstructor :(subject :string, details :IAccessDetails, realm? :string) => IAuthIdentity = RegExIdentity.getInstance;

export class Authenticator extends JWTAuth {
    private secretCache: string;

    constructor(options :IAuthOptions) {
        super(identityConstructor, options);
    }

    protected async secret(): Promise<GenericResult<any, IAuthError>> {
        if (!this.secretCache) {
            // Use this code snippet in your app.
            // If you need more information about configurations or implementing the sample code, visit the AWS docs:
            // https://aws.amazon.com/developers/getting-started/nodejs/

            // Load the AWS SDK
            // const region = "eu-west-1";
            const secretName = this.options.secretSource || "api-secrets";

            // Create a Secrets Manager client
            const client = new SecretsManager(
                // {
                //     region: region
                // }
            );

            // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
            // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
            // We rethrow the exception by default.

            // client.getSecretValue({SecretId: secretName}, function(err, data) {
            //     if (err) {
            //         if (err.code === 'DecryptionFailureException')
            //         // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            //         // Deal with the exception here, and/or rethrow at your discretion.
            //             throw err;
            //         else if (err.code === 'InternalServiceErrorException')
            //         // An error occurred on the server side.
            //         // Deal with the exception here, and/or rethrow at your discretion.
            //             throw err;
            //         else if (err.code === 'InvalidParameterException')
            //         // You provided an invalid value for a parameter.
            //         // Deal with the exception here, and/or rethrow at your discretion.
            //             throw err;
            //         else if (err.code === 'InvalidRequestException')
            //         // You provided a parameter value that is not valid for the current state of the resource.
            //         // Deal with the exception here, and/or rethrow at your discretion.
            //             throw err;
            //         else if (err.code === 'ResourceNotFoundException')
            //         // We can't find the resource that you asked for.
            //         // Deal with the exception here, and/or rethrow at your discretion.
            //             throw err;
            //     }
            //     else {
            //         // Decrypts secret using the associated KMS CMK.
            //         // Depending on whether the secret is a string or binary, one of these fields will be populated.
            //         if ('SecretString' in data) {
            //             secret = data.SecretString;
            //         } else {
            //             let buff = new Buffer(data.SecretBinary, 'base64');
            //             decodedBinarySecret = buff.toString('ascii');
            //         }
            //     }

                // Your code goes here.
            // });
            let data :SecretsManager.GetSecretValueResponse;
            try {
                data = await client.getSecretValue({SecretId: secretName}).promise();
            } catch (e) {
                return failure([ AbstractAuth.error(e.code) ]);
            }
            // Decrypts secret using the associated KMS CMK.
            // Depending on whether the secret is a string or binary, one of these fields will be populated.
            if ('SecretString' in data) {
                this.secretCache = data.SecretString;
            } else {
                let buff = Buffer.from(<string>data.SecretBinary, 'base64');
                this.secretCache = buff.toString('ascii');
            }
            return success(this.secretCache);

        } else {
            return Promise.resolve(success(this.secretCache));
        }
    }

    static getInstance(options :IAuthOptions) {
        return new Authenticator(options);
    }
}
