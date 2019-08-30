import {UserModel, IUserKey, IUserProps} from "../model";
import {GenericModelFactory, IModelDataAdepter, IModelError, GenericResult, success, IExecutable, IAuth, IAuthTokenResult, IError,
    failure,
    ICUExecuteOptions,
    AbstractAuth} from "@skazska/abstract-service-model";
import {AwsApiGwProxyIO, IAwsApiGwProxyInput, IAwsApiGwProxyIOOptions} from "@skazska/abstract-aws-service-model";

