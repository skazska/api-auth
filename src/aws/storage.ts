import {IModelDataAdepter, GenericModelFactory, GenericResult, IStorageError, AbstractModelStorage, IStorage, success,
    IModelError} from '@skazska/abstract-service-model';
import {
    DynamodbModelStorage,
    IDynamodbModelStorageConfig,
    IDynamodbStorageDelOptions,
    IDynamodbStorageGetOptions,
    IDynamodbStorageSaveOptions
} from '@skazska/abstract-aws-service-model'
import {UserModel, IUserKey, IUserProps} from "../model";
import {v4} from 'uuid';
import {DocumentClient} from 'aws-sdk/clients/dynamodb';

// import {DocumentClient} from "aws-sdk/lib/dynamodb/document_client";

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

    // newKey(): Promise<GenericResult<IUserKey, IStorageError>> {
    //     return Promise.resolve(success({id: v4()}));
    // }

    // returns new instance with default options
    static getInstance (table? :string, client? :DocumentClient) :UserStorage {
        return new UserStorage({
            modelFactory: new UserModelStorageFactory(),
            table: table || 'users',
            client: client || DynamodbModelStorage.getDefaultClient()
        });
    }

}

// export class UserStorage implements IStorage<IUserKey, IUserProps, UserModel> {
//     private storage :DynamodbModelStorage<IUserKey, IUserProps>;
//     constructor(props :IDynamodbModelStorageConfig<IUserKey, IUserProps>) {
//         this.storage = new DynamodbModelStorage<IUserKey, IUserProps>(props);
//     }
//
//     newKey(): Promise<GenericResult<IUserKey, IStorageError>> {
//         return undefined;
//     }
//
//     async load(key :IUserKey, options?: IDynamodbStorageGetOptions) :Promise<GenericResult<UserModel, IStorageError>> {
//         return (await this.storage.load(key, options)).wrap((result) => {
//             return <UserModel>result;
//         });
//     }
//
//     async save(data :UserModel, options: IDynamodbStorageSaveOptions): Promise<GenericResult<UserModel, IStorageError>> {
//         return (await this.storage.save(data, options)).wrap((result) => {
//             return data;
//         });
//     }
//
//     async erase(key :IUserKey, options?: IDynamodbStorageDelOptions) :Promise<GenericResult<boolean, IStorageError>> {
//         return (await this.storage.erase(key, options)).wrap((result) => {
//             return true;
//         });
//     }
//
//     // returns new instance with default options
//     static getInstance (table? :string, client? :DocumentClient) :UserStorage {
//         return new UserStorage({
//             modelFactory: new UserModelStorageFactory(),
//             table: table || 'users',
//             user: user || DynamodbModelStorage.getDefaultUser()
//         });
//     }
//
// }
