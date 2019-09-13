import {
    ICRUDExecutableConfig,
    ICUExecuteOptions,
    CRUDExecutable,
    IAuthIdentity,
    GenericResult,
    IAuthError,
    success,
    IRunError,
    AbstractModelStorage
} from "@skazska/abstract-service-model";
import {IUserKey, IUserProps, UserModel} from "../model";
import {UserStorage} from "../aws/storage/user";

let _defaultStorage;
const getDefaultStorage = () => {
    if (!_defaultStorage) _defaultStorage = UserStorage.getInstance('users');
    return _defaultStorage;
};

export interface IUserExecutableConfig<I, O> extends ICRUDExecutableConfig<I, O, IUserKey, IUserProps> {
    accessObject :string,
    operation :string,
    storage :UserStorage,
    executor :(storage :AbstractModelStorage<IUserKey, IUserProps>, params: I)=>Promise<GenericResult<O, IRunError>>
}

// export interface IUserCUExecutableOptions extends ICUExecuteOptions<IUserKey, IUserProps> {}

export abstract class UserExecutable<I, O> extends CRUDExecutable<I, O, IUserKey, IUserProps> {
    protected abstract checkUserSelf(identity :IAuthIdentity, params :I) :boolean;

    protected _authenticate(identity :IAuthIdentity, params :I) :GenericResult<any, IAuthError> {
        let access = identity.access(this.accessObject, 'self');
        if (!access.isFailure && access.get() && this.checkUserSelf(identity, params)) {
            return success(true);
        }
        return identity.access(this.accessObject, this.operation);
    }
}

export class UserCUExecutable extends UserExecutable<ICUExecuteOptions, UserModel> {
    constructor(props :IUserExecutableConfig<ICUExecuteOptions, UserModel>) {
        super(props);
    }

    protected checkUserSelf(identity :IAuthIdentity, params :ICUExecuteOptions) :boolean {
        return identity.subject === params.model.getKey().login;
    };
}

export class UserRDExecutable<O> extends UserExecutable<IUserKey, O> {
    constructor(props :IUserExecutableConfig<IUserKey, O>) {
        super(props);
    }

    protected checkUserSelf(identity :IAuthIdentity, params :IUserKey) :boolean {
        return identity.subject === params.login;
    };
}

export class UserReadExecutable extends UserRDExecutable<UserModel> {}
export class UserDeleteExecutable extends UserRDExecutable<null> {}

export const factory = {
    createInstance: (storage? :UserStorage) => {
        return new UserCUExecutable({
            accessObject: 'users',
            operation: 'create',
            storage: storage || getDefaultStorage(),
            executor: CRUDExecutable.createExecutor,
        });
    },
    readInstance: (storage? :UserStorage) => {
        return new UserReadExecutable({
            accessObject: 'users',
            operation: 'read',
            storage: storage || getDefaultStorage(),
            executor: CRUDExecutable.readExecutor,
        });
    },
    replaceInstance: (storage? :UserStorage) => {
        return new UserCUExecutable({
            accessObject: 'users',
            operation: 'replace',
            storage: storage || getDefaultStorage(),
            executor: CRUDExecutable.updateExecutor,
        });
    },
    updateInstance: (storage? :UserStorage) => {
        return new UserCUExecutable({
            accessObject: 'users',
            operation: 'update',
            storage: storage || getDefaultStorage(),
            executor: CRUDExecutable.updateExecutor,
        });
    },
    deleteInstance: (storage? :UserStorage) => {
        return new UserDeleteExecutable({
            accessObject: 'users',
            operation: 'delete',
            storage: storage || getDefaultStorage(),
            executor: CRUDExecutable.deleteExecutor,
        });
    }
};
