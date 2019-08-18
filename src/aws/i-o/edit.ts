import {IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model"
import {IAuth, IModel, IExecutable} from "@skazska/abstract-service-model";
import {APIGatewayProxyResult} from "aws-lambda";
import {UsersModelIO} from "../i-o";

export class EditIO extends UsersModelIO<IModel> {
    constructor(executable: IExecutable, authenticator?: IAuth, options?: IAwsApiGwProxyIOOptions) {
        super(executable, authenticator, {...{successStatus: 201}, ...options});
    };

    protected success(result: IModel): APIGatewayProxyResult {
        const data = this.options.modelFactory.data(result);
        return super.success(data);
    }

    static getInstance(executable, authenticator?, options?) {
        return new EditIO(executable, authenticator, options)
    }
}
