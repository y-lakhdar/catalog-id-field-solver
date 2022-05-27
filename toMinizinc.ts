import {
    DocumentBuilder,
    FieldAnalyser,
    Metadata,
    MetadataValue,
    parseAndGetDocumentBuilderFromJSONDocument,
  } from '@coveo/push-api-client';
  import PlatformClient, {Environment} from '@coveord/platform-client';
  
  type MapValue = string | number | null;
  type FieldTable = string[];
  type MetadataValueMap = Map<string, MapValue[]>;
  
  function encodeString(value: MetadataValue): MapValue {
    switch (typeof value) {
      case 'number':
        return value;
  
      case 'string':
        const hashed = hash(value);
        return hashed;
  
      default:
        return null;
    }
  }
  
  function hash(word: string) {
    // TODO: simply hash the value if greater than lets say 255. In which case, it is very unlikely the id field would be that long
    const stringLengthLimit = 25;
    // if (word.length < stringLengthLimit) {
    //   // Product Id and sku id are generaly under 16 characters as a best commerce standard. Otherwise we hash long strings to use less memory
    //   // TODO: find a better number. no magic number
    //   return word;
    // }
    // Using the fastest hashing algorithm with less collisions
    // const hash = createHash('sha256').update(word);
    // const hex = hash.digest('base64');
    // return word.slice(0, stringLengthLimit);
    // return hex
    return word;
  }
  
  function addToMap(map: MetadataValueMap, metadata: Metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      let mapValue = map.get(key);
      if (mapValue === undefined) {
        mapValue = [];
      }
      mapValue.push(encodeString(value));
      map.set(key, mapValue);
    }
  }
  
  function getClient() {
    return new PlatformClient({
      organizationId: 'clitestsnapshot9ywhd358',
      accessToken: 'xxd622e93f-fbed-4a80-995b-a32ab9fa8027',
      environment: Environment.dev,
    });
  }
  
  async function getFieldIndexTable(filePaths: string[]): Promise<FieldTable> {
    // const client = getClient() as any;
    // const analyser = new FieldAnalyser(client);
    // const docBuilders: DocumentBuilder[] = []; // TODO: should instead leverage the callback to not use a lot of memory
    // // const callback = async (docBuilder: DocumentBuilder) => TODO: something is not working with that approach
    // //   await analyser.add([docBuilder]);
    // for (const filePath of filePaths) {
    //   docBuilders.push(...parseAndGetDocumentBuilderFromJSONDocument(filePath));
    // }
    // // TODO: remove all array fields
    // // TODO: remove documentId and objectId
    // // TODO: remove standard fields
    // await analyser.add(docBuilders);
    // const {fields} = analyser.report();
    // const a = fields.map((f) => `${f.name}`);
    // console.log('*********************');
    // console.log(a);
    // console.log('*********************');
  
    // return a;
    return [
      'documenttype',
      'objecttype',
      'cat_attributes',
      'cat_available_size_types',
      'cat_available_sizes',
      'cat_categories',
      'cat_color',
      'cat_color_code',
      'cat_color_swatch',
      'cat_colors_info',
      'cat_discount',
      'cat_gender',
      'cat_mrp',
      'cat_rating_count',
      'cat_retailer',
      'cat_retailer_category',
      'cat_retailer_categoryh',
      'cat_slug',
      'cat_total_sizes',
      'ec_brand',
      'ec_brand_name',
      'ec_category',
      'ec_category_no_gender',
      'ec_description',
      'ec_images',
      'ec_item_group_id',
      'ec_name',
      'ec_price',
      'ec_product_id',
      'ec_promo_price',
      'ec_rating',
      'availableskus',
      'cat_size',
      'cat_size_type',
      'ec_variant_sku',
      'permanentid',
    ];
  }
  
  async function getMaps(
    filePaths: string[]
  ): Promise<Map<MetadataValue, MetadataValueMap>> {
    // TODO: try with a dictionnary where the keys are the metadata keys and the values are a list of posible metadata values.
    // That way, no need to transpose
    const objectTypeMap: Map<MetadataValue, MetadataValueMap> = new Map();
  
    const mapBuilderCallback = async (docBuilder: DocumentBuilder) => {
      const {metadata} = docBuilder.build();
      if (metadata?.objecttype === undefined) {
        return;
      }
      let metadataValueMap = objectTypeMap.get(metadata?.objecttype);
      if (metadataValueMap === undefined) {
        metadataValueMap = new Map();
        objectTypeMap.set(metadata?.objecttype, metadataValueMap);
      }
      addToMap(metadataValueMap, metadata);
    };
  
    //   Second parse to build product map
    for (const filePath of filePaths) {
      parseAndGetDocumentBuilderFromJSONDocument(filePath, {
        callback: mapBuilderCallback,
      });
    }
  
    return objectTypeMap;
  }
  
  export async function getCatalogFieldIds() {
    const filePaths = [
      '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/products.json',
      '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/variants.json',
    ];
    // const fieldTable = await getFieldIndexTable(filePaths);
    const maps = await getMaps(filePaths);
    const uniqueMetadataKeys: string[][] = [];
    maps.forEach((map) => {
      uniqueMetadataKeys.push(findUniqueMetadataKeysInMap(map));
    });
    let idFields = findCatalogIdField(maps.values(), uniqueMetadataKeys);
    let objectTypes = Array.from(maps.keys());
  
    if (idFields.productIdFields.length === 0) {
      objectTypes = objectTypes.reverse();
      idFields = findCatalogIdField(maps.values(), uniqueMetadataKeys.reverse());
    }
  
    // FIXME: right now we only assume there are 2 object types
    return {
      product: {
        possibleIdFields: idFields.productIdFields,
        objectType: objectTypes[0],
      },
      variant: {
        possibleIdFields: idFields.variantIdFields,
        objectType: objectTypes[1],
      },
    };
  }
  
  function findCatalogIdField<T>(
    maps: IterableIterator<MetadataValueMap>,
    uniqueMetadataKeys: string[][]
  ) {
    // TODO: can be optimized
    // FIXME: Assuming there is only 2 object types at the moment.
    const [mapA, mapB] = maps;
    const [uniqueObjectTypeAMetadataKeys, uniqueObjectTypeBMetadataKeys] =
      uniqueMetadataKeys;
  
    const productIdCandidates: string[] = [];
    for (const metdataKey of uniqueObjectTypeAMetadataKeys) {
      const objectTypeASet = new Set(mapA.get(metdataKey));
      const objectTypeBSet = new Set(mapB.get(metdataKey));
      if (setAreEqual(objectTypeASet, objectTypeBSet)) {
        productIdCandidates.push(metdataKey);
      }
    }
    return {
      productIdFields: productIdCandidates,
      variantIdFields: uniqueObjectTypeBMetadataKeys,
    };
  }
  
  function setAreEqual<T>(setA: Set<T>, setB: Set<T>) {
    if (setA.size !== setB.size) return false;
    for (const a of setA) if (!setB.has(a)) return false;
    return true;
  }
  
  function findUniqueMetadataKeysInMap(map: MetadataValueMap): string[] {
    const metadataKeyCandidates: string[] = [];
    for (const [key, values] of map.entries()) {
      if (!isUniqueAcrossDocument(values)) {
        continue;
      }
      metadataKeyCandidates.push(key);
    }
  
    return metadataKeyCandidates;
  }
  
  function isUniqueAcrossDocument<T>(possibleValues: T[]): boolean {
    const set = new Set(possibleValues);
    return set.size === possibleValues.length;
  }
  
  async function main() {
    console.time('global');
    const fields = await getCatalogFieldIds();
    console.timeEnd('global');
    console.log(fields);
  
    const mu = process.memoryUsage();
    // # bytes / KB / MB / GB
    const gbNow = mu['heapUsed'] / 1024 / 1024;
    const gbRounded = Math.round(gbNow * 100) / 100;
  
    console.log(`Heap allocated ${gbRounded} MB`);
  }
  main();
  