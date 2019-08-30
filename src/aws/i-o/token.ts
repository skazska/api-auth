import {
    GenericModelFactory,
    IModelDataAdepter,
    IModelError,
    GenericResult,
    success,
    IExecutable,
    IAuth,
    IAuthTokenResult,
    IError,
    failure,
    ICUExecuteOptions,
    IModel,
    AbstractAuth
} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";
import {APIGatewayProxyResult} from "aws-lambda";
import {UserModel, IUserKey, IUserProps} from "../../model";

class TokenModelIOAdapter implements IModelDataAdepter<IUserKey, IUserProps> {
    getKey (data :any) :GenericResult<IUserKey, IModelError> {
        return success({ login: data.login });
    };
    getProperties (data :any) :GenericResult<IUserProps, IModelError> {
        let result :IUserProps = {
            password :data.password,
            name :data.name
        };
        if (data.email) result.email = data.email;
        if (data.person) result.person = data.person;
        return success(result);
    };
    getData(key: IUserKey, properties: IUserProps): any {
        return {...key, ...properties}
    }
}

/**
 * Model Factory for user-io
 */
class TokenModelIOFactory extends GenericModelFactory<IUserKey, IUserProps> {
    constructor() { super(UserModel, new TokenModelIOAdapter()); };
}

/**
 * Options interface for UserIO class options structure
 */
interface ITokenIOOptions extends IAwsApiGwProxyIOOptions {
    modelFactory: TokenModelIOFactory
}

/**
 * User-io class, handles io for users api common method
 */
abstract class TokenIO<EI, EO> extends AwsApiGwProxyIO<EI,EO> {
    protected options :ITokenIOOptions;

    protected constructor(executable: IExecutable, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
        if (!this.options.modelFactory) this.options.modelFactory = new TokenModelIOFactory();
    };

    // protected authTokens(input: IAwsApiGwProxyInput): IAuthTokenResult {
    //     let token = input.event.headers && input.event.headers['x-auth-token'];
    //     if (!token) return failure([AbstractAuth.error('x-auth-token header missing')]);
    //     return success(token);
    // }
}
