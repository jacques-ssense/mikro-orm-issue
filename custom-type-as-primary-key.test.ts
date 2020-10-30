import { Entity, EntityProperty, MikroORM, Options, Platform, PrimaryKey, Type, ValidationError } from '@mikro-orm/core';

/**
 * Value Object
 */
class SKU {
    public readonly value: string;

    private static readonly skuRegex: RegExp = RegExp('.*[ABC].*');

    private constructor(value: string) {
        this.value = value;
    }

    public static create(value: string): SKU {
        if (!this.skuRegex.test(value)) {
            throw new Error(`'${value}' is not a valid SKU`);
        }
        return new SKU(value);
    }
}

/**
 * Mikro ORM Custom Type
 */
class SkuType extends Type<SKU, string> {
    public convertToDatabaseValue(value: SKU | undefined, platform: Platform): string {
        if (value instanceof SKU) {
            return value.value;
        }
        throw ValidationError.invalidType(SkuType, value, 'JS');
    }

    public convertToJSValue(value: SKU | string | undefined, platform: Platform): SKU {
        if (!value || value instanceof SKU) {
            return <SKU>value;
        }
        return SKU.create(<string>value);
    }

    public getColumnType(prop: EntityProperty, platform: Platform): string {
        return 'varchar(255)';
    }
}

@Entity({ tableName: 'product' })
export class Product {
    @PrimaryKey({ fieldName: 'sku', type: SkuType })
    private readonly _sku: SKU;

    private constructor(sku: SKU) {
        this._sku = sku;
    }

    public static create(sku: SKU): Product {
        return new Product(sku);
    }

    public get sku(): SKU {
        return this._sku;
    }
}

const entities = [Product];

const inMemoryConfig: Options = {
    entities,
    type: 'sqlite',
    dbName: ':memory:',
};

const postgresConfig: Options = {
    entities,
    type: 'postgresql',
    host: 'localhost',
    dbName: 'postgres',
    user: 'postgres',
    password: 'postgres',
    debug: false,
};

let config = inMemoryConfig;

if (process.env.USE_POSTGRES == '1') {
    config = postgresConfig;
}

const reconstructSchema = async (orm: MikroORM) => {
    const generator = orm.getSchemaGenerator();
    await generator.dropSchema();
    await generator.createSchema();
};

describe('persistAndFlush', () => {
    let orm: MikroORM;

    beforeAll(async () => {
        orm = await MikroORM.init(config);
    });

    beforeEach(async () => {
        await reconstructSchema(orm);
    });

    it('passes', async () => {
        const product = Product.create(SKU.create('ABC'));
        expect(product.sku).toBeInstanceOf(SKU);
        await orm.em.persistAndFlush(product);
        expect(product.sku).toBeInstanceOf(SKU);
    });

    afterAll(async () => {
        await orm.close();
    });
});
