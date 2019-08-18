import {ReadCRUDExecutable} from "@skazska/abstract-service-model"
import {IUserKey, IUserProps} from "../model";
import {IUserExecutableConfig} from "../executables";
import {UserStorage} from "../aws/storage";

const defaultStorage = UserStorage.getInstance('users');

export class UserReadExecutable extends ReadCRUDExecutable<IUserKey, IUserProps> {
    constructor(props :IUserExecutableConfig) {
        props.accessObject = props.accessObject || 'users';
        props.operation = props.operation || 'read';
        super(props);
    }
    static getInstance(operation?: string, storage? :UserStorage) {
        return new UserReadExecutable({operation: operation, storage: storage || defaultStorage});
    }
}
