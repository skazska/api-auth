import {IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model"
import {IAuth, IModel, IExecutable} from "@skazska/abstract-service-model";
import {APIGatewayProxyResult} from "aws-lambda";
import {UsersKeyIO} from "../i-o";

export class GetIO extends UsersKeyIO<IModel> {
    constructor(executable: IExecutable, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 200}, ...options});
    };

    protected success(result: IModel): APIGatewayProxyResult {
        const data = this.options.modelFactory.data(result);
        return super.success(data);
    }

    static getInstance(executable, authenticator?, options?) {
        return new GetIO(executable, authenticator, options)
    }
}
