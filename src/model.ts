import {ModelValidationResult, IModel, failure, success, GenericModel, IModelOptions, IAccessDetails, IModelDataAdepter,
    IModelError,
    GenericResult,
    SimpleModelAdapter} from "@skazska/abstract-service-model";
import validator from 'validator';

/**
 * User model
 */

/**
 * User key properties structure
 */
export interface IUserKey {
    login :string
}

/**
 * User properties structure
 */
export interface IUserProps {
    name?: string,
    password?: string
    roles? :string[],
    email? :string,
    person? :string,
}

// class ClientSchema extends AbstractModelSchema<IClientKey, IClientProps> {
//     validateKey(key :IClientKey) :ModelValidationResult {
//         if (!validator.isUUID(key.id, 4))
//             return failure([ AbstractModelSchema.error('should be UUID v4', 'id') ]);
//         return success(true);
//     };
//     validateProperties(properties :IClientProps) :ModelValidationResult {
//         const result = new ModelValidationResult();
//         if (!validator.isLength(properties.name, {min: 3, max: 80})) {
//             result.error(AbstractModelSchema.error('data or data1 field should present', '*'));
//         }
//
//         //TODO check locale field
//
//         if (!validator.isAlphanumeric(properties.name, properties.locale)) {
//             result.error(AbstractModelSchema.error('data or data1 field should present', '*'));
//         }
//         return result;
//     };
//
// }
//

/**
 * User model, represents user
 */
export class UserModel extends GenericModel<IUserKey, IUserProps> implements IModel {
    constructor (key :IUserKey, properties :IUserProps) {
        super(key, properties, {
            // schema: new ClientSchema()
        });
    }


    // protected setOptions(options: IGenericModelOptions<IUserKey, IUserProps>): any {
    // }
}


/**
 * User Model adapter
 */
const userKeys :IUserKey[keyof IUserKey][]= ['login'];

export class UserModelAdapter extends SimpleModelAdapter<IUserKey, IUserProps> {
    constructor(props? :IUserProps[keyof IUserProps][]) {
        super(userKeys, props)
    }
}



/**
 * Auth tokens structures
 */
export interface IAuthCredentials {
    type :string,
    login :string,
    password? :string,
    accessDetails? :IAccessDetails
}

export interface ITokens {
    exchange :string,
    auth :string
}

export interface IExchangeTokens {
    exchangeToken :string,
    login?: string,
    accessDetails? :IAccessDetails
}


/**
 * Roles & AccessDetails structures
 */
export interface IRoles {
    [roleName :string]: IAccessDetails;
}
