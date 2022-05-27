import {EOL} from 'os';
import dedent from 'ts-dedent';
import {
  DocumentBuilder,
  FieldAnalyser,
  Metadata,
  MetadataValue,
  parseAndGetDocumentBuilderFromJSONDocument,
} from '@coveo/push-api-client';
import PlatformClient, {Environment} from '@coveord/platform-client';
import {createHash} from 'crypto';

type MatrixValue = string | number | null;
type FieldTable = string[];
// interface VariantModel {
//   objectTypeACount: number;
//   objectTypeBCount: number;
//   metadataCount: number;
//   matrixA: number[][];
//   matrixB: number[][];
// }

// const HACHES: Set<number> = new Set();
// function buildMatrix(): string {
//   throw 'TODO:';
// }

function encodeString(value: MetadataValue): MatrixValue {
  switch (typeof value) {
    case 'number':
      return value;

    case 'string':
      const hashed = hash(value);
      // TODO: transpose all hash to smaller numbers
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

function addToMap(matrix: Map<string, MatrixValue[]>, metadata: Metadata) {
  for (const [key, value] of Object.entries(metadata)) {
    let matrixValue = matrix.get(key);
    if (matrixValue === undefined) {
      matrixValue = [];
    }
    matrixValue.push(encodeString(value));
    matrix.set(key, matrixValue);
  }

  // const encodedDocument: MatrixValue[] = Array(fieldTable.length).fill(0);
  // for (let i = 0; i < fieldTable.length; i++) {
  //   const encodedString = encodeString(metadata[fieldTable[i]]);
  //   if (encodedString) {
  //     encodedDocument[i] = encodedString;
  //   }
  // }
  // return encodedDocument;
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

async function getMatrices(filePaths: string[]) {
  // TODO: try with a dictionnary where the keys are the metadata keys and the values are a list of posible metadata values.
  // That way, no need to transpose
  const matrixA: Map<string, MatrixValue[]> = new Map();
  const matrixB: Map<string, MatrixValue[]> = new Map();

  const matrixBuilderCallback = async (docBuilder: DocumentBuilder) => {
    const {metadata} = docBuilder.build();
    switch (metadata?.objecttype) {
      // TODO: get the objecttype values on the first document parse
      case 'Product':
        addToMap(matrixA, metadata);
        break;
      case 'Variant':
        addToMap(matrixB, metadata);
        break;

      default:
        break;
    }
  };

  //   Second parse to build product matrix
  for (const filePath of filePaths) {
    parseAndGetDocumentBuilderFromJSONDocument(filePath, {
      callback: matrixBuilderCallback,
    });
  }

  return {matrixA, matrixB};
}

function transposeMatrix<T>(matrix: T[][]): T[][] {
  // TODO: optimize
  const transposed: typeof matrix = [];

  for (let i = 0; i < matrix[0].length; i++) {
    const col = [];
    for (let j = 0; j < matrix.length; j++) {
      col.push(matrix[j][i]);
    }
    transposed.push(col);
  }

  return transposed;
}

export async function getCatalogFieldIds() {
  const filePaths = [
    '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/products.json',
    '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/variants.json',
  ];
  // const fieldTable = await getFieldIndexTable(filePaths);
  const {matrixA, matrixB} = await getMatrices(filePaths);
  const uniqueObjectTypeAMetadataKeys = findUniqueMetadataKeysInMatrix(matrixA);
  const uniqueObjectTypeBMetadataKeys = findUniqueMetadataKeysInMatrix(matrixB);

  // try the 2 alternatives
  const {productIdFields, variantIdFields} = findProductIdField(
    matrixA,
    matrixB,
    uniqueObjectTypeBMetadataKeys,
    uniqueObjectTypeAMetadataKeys
  );

  if (productIdFields.length === 0) {
    return findProductIdField(
      matrixA,
      matrixB,
      uniqueObjectTypeAMetadataKeys,
      uniqueObjectTypeBMetadataKeys
    );
  }

  return {
    // TODO: return product object type and variant object type
    productIdFields,
    variantIdFields,
  };
}

function findProductIdField<T>(
  matrixA: Map<string, MatrixValue[]>,
  matrixB: Map<string, MatrixValue[]>,
  uniqueObjectTypeAMetadataKeys: string[],
  uniqueObjectTypeBMetadataKeys: string[]
) {
  // TODO: can be optimized
  const productIdCandidates: string[] = [];
  for (const metdataKey of uniqueObjectTypeAMetadataKeys) {
    const objectTypeASet = new Set(matrixA.get(metdataKey));
    const objectTypeBSet = new Set(matrixB.get(metdataKey));
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

/**
 *
 * @param {number[][]} 2 matrix of METADATA_KEY x PRODUCT_NUMBER giving the metadata value for a product on a specific metadata.
 * @return {*}  {number[]} the metadata key indeces for which the value is unique across all documents
 */
function findUniqueMetadataKeysInMatrix(
  matrix: Map<string, MatrixValue[]>
): string[] {
  const metadataKeyCandidates: string[] = [];
  for (const [key, values] of matrix.entries()) {
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
