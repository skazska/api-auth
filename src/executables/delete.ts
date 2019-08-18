import {DeleteCRUDExecutable} from "@skazska/abstract-service-model"
import {IUserKey, IUserProps} from "../model";
import {IUserExecutableConfig} from "../executables";
import {UserStorage} from "../aws/storage";

const defaultStorage = UserStorage.getInstance('users');

export class UserDeleteExecutable extends DeleteCRUDExecutable<IUserKey, IUserProps> {
    constructor(props :IUserExecutableConfig) {
        props.accessObject = props.accessObject || 'users';
        props.operation = props.operation || 'delete';
        super(props);
    }

    static getInstance(operation? :string, storage? :UserStorage) {
        return new UserDeleteExecutable({operation: operation, storage: storage || defaultStorage});
    }
}
