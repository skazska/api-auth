import {
    GenericModelFactory,
    GenericResult,
    success,
    IAuth,
    IError,
    failure,
    ICUExecuteOptions,
    IModel,
    AbstractExecutable
} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";
import {APIGatewayProxyResult} from "aws-lambda";
import {UserModel, IUserKey, IUserProps, UserModelAdapter} from "../../model";


/**
 * User IO module provides classes implementing AbstractModelService IO (aws based) which is to be used in
 *  lambda functions handlers of AWS API Gateway proxy methods to process input events call executions and return results
 *  GetIO, EditIO, DeleteIO are descendants of AwsApiGwProxyIO and AbstractIO.
 * AbstractIO organizes auth, execution and error handling in common, AwsApiGwProxyIO implements some aws proxy
 *  method specifics.
 * GetIO, EditIO, DeleteIO implement specifics related to process user data specific inputs and outputs.
 */


/**
 * User Model adapter for user-io
 */
class UserModelIOAdapter extends UserModelAdapter {
    constructor() {
        super(['password','name','email','person'])
    }
}

/**
 * Model Factory for user-io
 */
class UserModelIOFactory extends GenericModelFactory<IUserKey, IUserProps> {
    constructor() { super(UserModel, new UserModelIOAdapter()); };
}

/**
 * Options interface for UserIO class options structure
 */
interface IUsersIOOptions extends IAwsApiGwProxyIOOptions {
    modelFactory: UserModelIOFactory
}

/**
 * User-io class, handles io for users api common method
 */
abstract class UsersIO<EI, EO> extends AwsApiGwProxyIO<EI,EO> {
    protected options :IUsersIOOptions;

    protected constructor(executable: AbstractExecutable<EI,EO>, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
        if (!this.options.modelFactory) this.options.modelFactory = new UserModelIOFactory();
    };
}

/**
 * User-io class, handles io for users api method which needs user login in path as input param
 */
abstract class UsersKeyIO<EO> extends UsersIO<IUserKey,EO> {
    protected data(inputs: IAwsApiGwProxyInput): GenericResult<IUserKey, IError> {
        return success({login: inputs.event.pathParameters.login});
    }
}

/**
 * User-io class, handles io for users api method which needs user data provided in request body
 */
abstract class UsersModelIO<EO> extends UsersIO<ICUExecuteOptions,EO> {
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


/**
 * User-io class, handles io for users api method DELETE
 */
export class DeleteIO extends UsersKeyIO<null> {
    constructor(executable: AbstractExecutable<IUserKey,null>, authenticator?: IAuth, options?: IUsersIOOptions) {
        super(executable, authenticator, {...{successStatus: 204}, ...options});
    };

    protected success(result: null): APIGatewayProxyResult {
        return super.success(null);
    }

    static getInstance(executable, authenticator?, options?) {
        return new DeleteIO(executable, authenticator, options)
    }
}


/**
 * User-io class, handles io for users api method CREATE, PUT or PATCH
 */
export class EditIO extends UsersModelIO<IModel> {
    constructor(executable: AbstractExecutable<ICUExecuteOptions,IModel>, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 201}, ...options});
    };

    protected success(result: IModel): APIGatewayProxyResult {
        const data = this.options.modelFactory.data(result);
        if (data.isFailure) return this.fail('encode', 'Error converting result to model', data.errors);
        return super.success(data.get());
    }

    static getInstance(executable, authenticator?, options?) {
        return new EditIO(executable, authenticator, options)
    }
}


/**
 * User-io class, handles io for users api method GET
 */
export class GetIO extends UsersKeyIO<IModel> {
    constructor(executable: AbstractExecutable<IUserKey,IModel>, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
    };

    protected success(result: IModel): APIGatewayProxyResult {
        const data = this.options.modelFactory.data(result);
        if (data.isFailure) return this.fail('encode', 'Error converting result to model', data.errors);
        return super.success(data.get());
    }

    static getInstance(executable, authenticator?, options?) {
        return new GetIO(executable, authenticator, options)
    }
}
