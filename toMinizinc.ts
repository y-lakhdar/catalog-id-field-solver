import { DocumentBuilder, Metadata, MetadataValue, parseAndGetDocumentBuilderFromJSONDocument } from '@coveo/push-api-client';

type MapValue = string | number | null;
type MetadataValueMap = Map<string, MapValue[]>;

function encodeString(value: MetadataValue): MapValue {
  switch (typeof value) {
    case 'number':
      return value;

    case 'string':
      return value;

    default:
      return null;
  }
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

async function getMaps(filePaths: string[]): Promise<Map<MetadataValue, MetadataValueMap>> {
  const objectTypeMap: Map<MetadataValue, MetadataValueMap> = new Map();
  const mapBuilderCallback = async (docBuilder: DocumentBuilder) => {
    const { metadata } = docBuilder.build();
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

function findCatalogIdField<T>(maps: IterableIterator<MetadataValueMap>, uniqueMetadataKeys: string[][]) {
  // TODO: can be optimized
  // FIXME: Assuming there is only 2 object types at the moment.
  const [mapA, mapB] = maps;
  const [uniqueObjectTypeAMetadataKeys, uniqueObjectTypeBMetadataKeys] = uniqueMetadataKeys;

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
