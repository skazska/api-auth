import {
    IModelDataAdepter,
    GenericModelFactory,
    GenericResult,
    IStorageError,
    AbstractModelStorage,
    IStorage,
    success,
    IModelError
} from '@skazska/abstract-service-model';
import { DynamodbModelStorage } from '@skazska/abstract-aws-service-model'
import { UserModel, IUserKey, IUserProps } from "../model";
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

class UserModelStorageAdapter implements IModelDataAdepter<IUserKey, IUserProps> {
    getKey (data :any) :GenericResult<IUserKey, IModelError>{
        return success({ login: data.login });
    };
    getProperties (data :any) :GenericResult<IUserProps, IModelError> {
        let result :IUserProps = {
            password :data.password,
            name :data.name,
            email :data.email
        };
        if (data.person) result.person = data.person;
        return success(result);
    };
    getData(key: IUserKey, properties: IUserProps): any {
        return {...key, ...properties}
    }
}

class UserModelStorageFactory extends GenericModelFactory<IUserKey, IUserProps> {
    constructor() { super(UserModel, new UserModelStorageAdapter()); };
}

export class UserStorage
    extends DynamodbModelStorage<IUserKey, IUserProps>
    implements IStorage<IUserKey, IUserProps, UserModel> {

    // returns new instance with default options
    static getInstance (table? :string, client? :DocumentClient) :UserStorage {
        return new UserStorage({
            modelFactory: new UserModelStorageFactory(),
            table: table || 'users',
            client: client || DynamodbModelStorage.getDefaultClient()
        });
    }

}
