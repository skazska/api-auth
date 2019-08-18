import {IAuth, IExecutable} from "@skazska/abstract-service-model";
import {APIGatewayProxyResult} from "aws-lambda";
import {UsersKeyIO, IUsersIOOptions} from "../i-o";

export class DeleteIO extends UsersKeyIO<null> {
    constructor(executable: IExecutable, authenticator?: IAuth, options?: IUsersIOOptions) {
        super(executable, authenticator, {...{successStatus: 204}, ...options});
    };

    protected success(result: null): APIGatewayProxyResult {
        return super.success(null);
    }

    static getInstance(executable, authenticator?, options?) {
        return new DeleteIO(executable, authenticator, options)
    }
}
