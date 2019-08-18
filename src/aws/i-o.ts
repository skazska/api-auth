import {UserModel, IUserKey, IUserProps} from "../model";
import {GenericModelFactory, IModelDataAdepter, IModelError, GenericResult, success, IExecutable, IAuth, IAuthTokenResult, IError,
    failure} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";
import {IUserCUExecutableOptions} from "../executables";

class UserModelIOAdapter implements IModelDataAdepter<IUserKey, IUserProps> {
    getKey (data :any) :GenericResult<IUserKey, IModelError> {
        return success({ login: data.login });
    };
    getProperties (data :any) :GenericResult<IUserProps, IModelError> {
        let result :IUserProps = {
            password :data.password,
            name :data.name,
            email :data.email
        };
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
        console.log('auth tokens');
        console.dir(arguments);
        return success(input.event.headers && input.event.headers['x-auth-token']);
    }
}

export abstract class UsersKeyIO<EO> extends UsersIO<IUserKey,EO> {
    protected data(inputs: IAwsApiGwProxyInput): GenericResult<IUserKey, IError> {
        return success({login: inputs.event.pathParameters.id});
    }
}

export abstract class UsersModelIO<EO> extends UsersIO<IUserCUExecutableOptions,EO> {
    protected data(inputs: IAwsApiGwProxyInput): GenericResult<IUserCUExecutableOptions, IError> {
        console.log('post data');
        console.dir(arguments);

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
