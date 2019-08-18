import {CreateCRUDExecutable} from "@skazska/abstract-service-model"
import {IUserKey, IUserProps} from "../model";
import {IUserExecutableConfig} from "../executables";
import {UserStorage} from "../aws/storage";

const defaultStorage = UserStorage.getInstance('users');

//TODO

export class UserUpdateExecutable extends CreateCRUDExecutable<IUserKey, IUserProps> {
    constructor(props :IUserExecutableConfig) {
        props.accessObject = props.accessObject || 'users';
        props.operation = 'update';
        super(props);
    }

    static getInstance(storage? :UserStorage) {
        return new UserUpdateExecutable({storage: storage || defaultStorage});
    }
}
