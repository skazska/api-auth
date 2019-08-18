import {ModelValidationResult, IModel, failure, success, GenericModel, IModelOptions} from "@skazska/abstract-service-model";
import validator from 'validator';

export interface IUserKey {
    login :string
}

export interface IUserProps {
    password: string
    name: string,
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
export class UserModel extends GenericModel<IUserKey, IUserProps> implements IModel {
    constructor (key :IUserKey, properties :IUserProps) {
        super(key, properties, {
            // schema: new ClientSchema()
        });
    }


    // protected setOptions(options: IGenericModelOptions<IUserKey, IUserProps>): any {
    // }
}
