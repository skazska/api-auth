import {CreateCRUDExecutable, IAuthIdentity, GenericResult, IAuthError, ICUExecuteOptions, success} from "@skazska/abstract-service-model"
import {IUserKey, IUserProps} from "../model";
import {IUserExecutableConfig} from "../executables";
import {UserStorage} from "../aws/storage";
import {__stringPatternArnAwsUsGovCnKmsAZ26EastWestCentralNorthSouthEastWest1912D12KeyAFAF098AFAF094AFAF094AFAF094AFAF0912} from "aws-sdk/clients/mediaconvert";

const defaultStorage = UserStorage.getInstance('users');

export class UserSaveExecutable extends CreateCRUDExecutable<IUserKey, IUserProps> {
    constructor(props :IUserExecutableConfig) {
        props.accessObject = props.accessObject || 'users';
        props.operation = props.operation || 'write';
        super(props);
    }

    protected _authenticate(identity :IAuthIdentity, params :ICUExecuteOptions<IUserKey, IUserProps>) :GenericResult<any, IAuthError> {
        if (identity.subject === params.model.getKey().login) {
            return success(true);
        }
        return identity.access(this.accessObject, this.operation);
    }

    static getInstance(operation: string, storage? :UserStorage) {
        return new UserSaveExecutable({operation: operation, storage: storage || defaultStorage});
    }
}
