import {SecretsManager} from 'aws-sdk';
import {ISecretValue} from "../../model";
import {
    IRawDataAdapter, ISecretStorageConfig,
    RawDataJSONAdapter, SecretStorage
} from "@skazska/abstract-aws-service-model";


export interface IApiSecretStorageConfig extends ISecretStorageConfig<ISecretValue> {
    secretName :string,
    client : SecretsManager,
    dataAdapter :IRawDataAdapter<ISecretValue, string>
}

export class APISecretStorage extends SecretStorage<ISecretValue> {
    constructor(options :IApiSecretStorageConfig) {
        super(options);
    }



    static getInstance(
        client? :SecretsManager|null,
        dataAdapter?: IRawDataAdapter<ISecretValue, string>|null
    ) {
        return new SecretStorage<ISecretValue>({
            client :client || SecretStorage.getDefaultClient(),
            dataAdapter: dataAdapter || new RawDataJSONAdapter()
        });
    }

}
