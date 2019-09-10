import {
    GenericModelFactory,
    IStorage
} from '@skazska/abstract-service-model';
import { DynamodbModelStorage } from '@skazska/abstract-aws-service-model'
import {UserModel, IUserKey, IUserProps, UserModelAdapter} from "../model";
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

class UserModelStorageAdapter extends UserModelAdapter {
    constructor() {
        super(['password','name','email','person','roles'])
    }
}

class UserModelStorageFactory extends GenericModelFactory<IUserKey, IUserProps> {
    constructor() { super(UserModel, new UserModelStorageAdapter()); };
}

export class UserStorage
    extends DynamodbModelStorage<IUserKey, IUserProps>
    implements IStorage<IUserKey, UserModel> {

    // returns new instance with default options
    static getInstance (table? :string, client? :DocumentClient) :UserStorage {
        return new UserStorage({
            modelFactory: new UserModelStorageFactory(),
            table: table || 'users',
            client: client || DynamodbModelStorage.getDefaultClient()
        });
    }

}
