import {
    GenericResult,
    success,
    IAuth,
    IError,
    failure,
    AbstractExecutable,
    AbstractIO
} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";
import {IAuthCredentials, ITokens} from "../../model";

/**
 * Auth-io class, handles io for token authentication api
 */
class AuthIO extends AwsApiGwProxyIO< IAuthCredentials,ITokens > {
    // protected options :ITokenIOOptions;

    constructor(executable: AbstractExecutable<IAuthCredentials,ITokens>, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, null, {...{successStatus: 200}, ...options});
    };

    protected data(inputs: IAwsApiGwProxyInput): GenericResult< IAuthCredentials, IError> {
        const creds = inputs.event.multiValueHeaders && inputs.event.multiValueHeaders['Authorization'];
        if (!(creds && creds[1])) return failure([AbstractIO.error('Authorization header missing or incorrect')]);

        const result :IAuthCredentials = {
            type: creds[0],
            login: inputs.event.pathParameters.login
        };

        switch (creds[0]) {
            case 'Basic':
                result.password = creds[1];
                break;
            default:
                return failure([AbstractIO.error('' + creds[0] + ' auth method is not supported')]);
        }

        return success(result);
    }
}

/**
 * Exchange-io class, handles io for token exchange api
 */
class ExchangeIO extends AwsApiGwProxyIO<string,ITokens > {
    // protected options :ITokenIOOptions;

    constructor(executable: AbstractExecutable<string,ITokens>, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, null, {...{successStatus: 200}, ...options});
    };

    protected data(inputs: IAwsApiGwProxyInput): GenericResult< string, IError> {
        let token = inputs.event.headers && inputs.event.headers['x-exchange-token'];
        if (!token) return failure([AbstractIO.error('x-exchange-token header missing')]);
        return success(token);
    }
}
