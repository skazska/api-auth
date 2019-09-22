import {
    IS3StorageConfig,
    IS3StorageGetOptions,
    S3Storage,
    IRawDataAdapter,
    RawDataJSONAdapter
} from '@skazska/abstract-aws-service-model';
import {IRoles} from '../../model';
import {GenericResult, IStorageError} from '@skazska/abstract-service-model';
import S3 = require("aws-sdk/clients/s3");

export interface IRoleStorageConfig extends IS3StorageConfig<IRoles, string> {
    getOptions :IS3StorageGetOptions;
}

export class RoleStorage extends S3Storage<IRoles, string>{
    protected key :string;
    protected getOptions :IS3StorageGetOptions;
    constructor(options :IRoleStorageConfig) {
        super(options);
        this.getOptions = options.getOptions;
    }

    getRoles(): Promise<GenericResult<IRoles>> {
        return super.load(this.key, this.getOptions);
    }

    static getInstance(
        bucket: string,
        defaultGetOptions :IS3StorageGetOptions = {key: 'roles'},
        client :S3 = S3Storage.getDefaultClient(),
        dataAdapter: IRawDataAdapter<IRoles, string> = new RawDataJSONAdapter()
    ) {
        return new RoleStorage({
            getOptions :defaultGetOptions,
            bucket: bucket,
            client :client,
            dataAdapter: dataAdapter
        });
    }
}
