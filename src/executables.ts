import {ICRUDExecutableConfig, ICUExecuteOptions} from "@skazska/abstract-service-model";
import {IUserKey, IUserProps} from "./model";
import {UserStorage} from "./aws/storage";

export interface IUserExecutableConfig extends ICRUDExecutableConfig<IUserKey, IUserProps> {
    storage :UserStorage
}

export interface IUserCUExecutableOptions extends ICUExecuteOptions<IUserKey, IUserProps> {}
