import {UserModel, IUserKey, IUserProps} from "../model";
import {GenericModelFactory, IModelDataAdepter, IModelError, GenericResult, success, IExecutable, IAuth, IAuthTokenResult, IError,
    failure,
    ICUExecuteOptions,
    AbstractAuth} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";

class UserModelIOAdapter implements IModelDataAdepter<IUserKey, IUserProps> {
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

export class UserModelIOFactory extends GenericModelFactory<IUserKey, IUserProps> {
    constructor() { super(UserModel, new UserModelIOAdapter()); };
}

export interface IUsersIOOptions extends IAwsApiGwProxyIOOptions {
    modelFactory: UserModelIOFactory
}

export abstract class UsersIO<EI, EO> extends AwsApiGwProxyIO<EI,EO> {
    protected options :IUsersIOOptions;

    protected constructor(executable: IExecutable, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
        if (!this.options.modelFactory) this.options.modelFactory = new UserModelIOFactory();
    };

    protected authTokens(input: IAwsApiGwProxyInput): IAuthTokenResult {
        let token = input.event.headers && input.event.headers['x-auth-token'];
        if (!token) return failure([AbstractAuth.error('x-auth-token header missing')]);
        return success(token);
    }
}

export abstract class UsersKeyIO<EO> extends UsersIO<IUserKey,EO> {
    protected data(inputs: IAwsApiGwProxyInput): GenericResult<IUserKey, IError> {
        return success({login: inputs.event.pathParameters.login});
    }
}

export abstract class UsersModelIO<EO> extends UsersIO<ICUExecuteOptions,EO> {
    protected data(inputs: IAwsApiGwProxyInput): GenericResult<ICUExecuteOptions, IError> {

        try {
            let data = JSON.parse(inputs.event.body);
            return this.options.modelFactory.dataModel(data).wrap(
                model => { return {model: model}}
            );
        } catch (e) {
            console.error(e);
            return failure([e]);
        }
    }
}
