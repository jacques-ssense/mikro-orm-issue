import {
    Cascade,
    Collection,
    Entity,
    EntityProperty,
    ManyToOne,
    MikroORM,
    OneToMany,
    Options,
    Platform,
    PrimaryKey,
    Type,
    ValidationError,
} from '@mikro-orm/core';

/**
 * Value Object
 */
class SKU {
    public readonly value: string;

    private static readonly skuRegex: RegExp = RegExp('.*ABC.*');

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
    @PrimaryKey({ fieldName: 'id' })
    private readonly _id: string;

    @OneToMany({ entity: () => ProductItem, mappedBy: (productItem) => productItem.product, cascade: [Cascade.ALL] })
    public readonly items: Collection<ProductItem> = new Collection<ProductItem>(this);

    private constructor(id: string) {
        this._id = id;
    }

    public static create(id: string): Product {
        return new Product(id);
    }

    public addItem(item: ProductItem): Product {
        this.items.add(item);
        return this;
    }
}

@Entity({ tableName: 'product_item' })
export class ProductItem {
    @PrimaryKey({ fieldName: 'sku', type: SkuType })
    private readonly _sku: SKU;

    @ManyToOne({ primary: true, hidden: true, entity: () => Product })
    public product: Product;

    private constructor(sku: SKU) {
        this._sku = sku;
    }

    public static create(sku: SKU): ProductItem {
        return new ProductItem(sku);
    }

    public get sku(): SKU {
        return this._sku;
    }
}

const entities = [Product, ProductItem];

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

    it('fails', async () => {
        const product = Product.create('product-id');
        product.addItem(ProductItem.create(SKU.create('ABC')));
        expect(product.items[0].sku).toBeInstanceOf(SKU);
        await expect(orm.em.persistAndFlush(product)).resolves.not.toThrow(); // <-- fails when using sqlite
        expect(product.items[0].sku).toBeInstanceOf(SKU); // <-- fails when using postgres
    });

    afterAll(async () => {
        await orm.close();
    });
});
