import {
    GenericResult,
    success,
    IAuth,
    IError,
    failure,
    AbstractExecutable,
    AbstractIO,
    IAuthTokenResult,
    AbstractAuth
} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";
import {IAuthCredentials, ITokens, IExchangeTokens} from "../../model";
import {AuthExecutable, ExchangeExecutable} from "../../executables/token";

/**
 * Auth-io class, handles io for token authentication api
 */
export class AuthIO extends AwsApiGwProxyIO< IAuthCredentials,ITokens > {
    // protected options :ITokenIOOptions;

    constructor(executable: AuthExecutable, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, null, {...{successStatus: 200}, ...options});
    };

    protected data(inputs: IAwsApiGwProxyInput): Promise<GenericResult<IAuthCredentials>> {
        const credentials = inputs.event.headers && inputs.event.headers['x-auth-basic'];
        if (!credentials) return Promise.resolve(
            failure([AbstractIO.error('Authorization header missing or incorrect')])
        );
        const result :IAuthCredentials = AuthIO.decodeCredentials(credentials);
        return Promise.resolve(success(result));
    }

    static encodeCredentials (login :string, pass :string) :string {
        let result = JSON.stringify({login: login, password: pass});
        return Buffer.from(result).toString('base64');
    }

    static decodeCredentials (str :string) :IAuthCredentials {
        let result = Buffer.from(str, 'base64').toString('ascii');
        return JSON.parse(result);
    }


    static getInstance(executable, options?) {
        return new AuthIO(executable, null, options);
    }

}

/**
 * Exchange-io class, handles io for token exchange api
 */
export class ExchangeIO extends AwsApiGwProxyIO<IExchangeTokens,ITokens > {
    // protected options :ITokenIOOptions;

    constructor(executable: ExchangeExecutable, authenticator: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
    };

    /**
     * returns x-auth-token header value or fails for auth
     * @param input
     */
    protected authTokens(input: IAwsApiGwProxyInput): IAuthTokenResult {
        try {
            const body = JSON.parse(input.event.body);
            const token = body['exchangeToken'];
            if (!token) return failure([AbstractAuth.error('bad exchangeToken provided')]);
            return success(token);
        } catch (e) {
            return failure([AbstractAuth.error(e.message)]);
        }
    }

    /**
     * returns x-auth-token header value or fails for executable
     * @param input
     */
    protected data(inputs: IAwsApiGwProxyInput): Promise<GenericResult<IExchangeTokens>> {
        return Promise.resolve(this.authTokens(inputs).transform(token => {return {exchangeToken: token}}));
    }

    static getInstance(executable, authenticator, options?) {
        return new ExchangeIO(executable, authenticator, options);
    }
}
