import { DocumentBuilder, Metadata, MetadataValue, parseAndGetDocumentBuilderFromJSONDocument } from '@coveo/push-api-client';
import { PathLike } from 'fs';

type MapValue = string | number | null;
type MetadataValueMap = Map<string, MapValue[]>;

export async function getCatalogFieldIds(filePaths: PathLike[]) {
  const maps = await getMaps(filePaths);
  const uniqueMetadataKeys: string[][] = [];
  maps.forEach((map) => {
    uniqueMetadataKeys.push(findUniqueMetadataKeysInMap(map));
  });
  let catalogIdFields = findCatalogIdFields(maps.values(), uniqueMetadataKeys);
  let objectTypes = Array.from(maps.keys());

  if (catalogIdFields.productIdFields.length === 0) {
    objectTypes = objectTypes.reverse();
    catalogIdFields = findCatalogIdFields(maps.values(), uniqueMetadataKeys.reverse());
  }

  // FIXME: right now we only assume there are 2 object types
  return {
    product: {
      possibleIdFields: catalogIdFields.productIdFields,
      objectType: objectTypes[0],
    },
    variant: {
      possibleIdFields: catalogIdFields.variantIdFields,
      objectType: objectTypes[1],
    },
  };
}

function sanitizeMetadataValue(value: MetadataValue): MapValue {
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
    mapValue.push(sanitizeMetadataValue(value));
    map.set(key, mapValue);
  }
}

async function getMaps(filePaths: PathLike[]): Promise<Map<MetadataValue, MetadataValueMap>> {
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

  for (const filePath of filePaths) {
    parseAndGetDocumentBuilderFromJSONDocument(filePath, {
      callback: mapBuilderCallback,
    });
  }

  return objectTypeMap;
}

function findCatalogIdFields(maps: IterableIterator<MetadataValueMap>, uniqueMetadataKeys: string[][]) {
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

function findUniqueMetadataKeysInMap(map: MetadataValueMap): string[] {
  const metadataKeyCandidates: string[] = [];
  for (const [key, values] of map.entries()) {
    if (!isArrayWithDuplicates(values)) {
      continue;
    }
    metadataKeyCandidates.push(key);
  }

  return metadataKeyCandidates;
}

// TODO: put the next methods in util files

function setAreEqual<T>(setA: Set<T>, setB: Set<T>) {
  if (setA.size !== setB.size) {
    return false;
  }

  for (const a of setA) {
    if (!setB.has(a)) {
      return false;
    }
  }

  return true;
}

function isArrayWithDuplicates<T>(possibleValues: T[]): boolean {
  const set = new Set(possibleValues);
  return set.size === possibleValues.length;
}
