import {EOL} from 'os';
import dedent from 'ts-dedent';
import {
  DocumentBuilder,
  FieldAnalyser,
  Metadata,
  MetadataValue,
  parseAndGetDocumentBuilderFromJSONDocument,
} from '@coveo/push-api-client';
import {appendFile, appendFileSync, writeFileSync} from 'fs';
import PlatformClient, {Environment} from '@coveord/platform-client';
import {createHash} from 'crypto';

type FieldTable = string[];
interface VariantModel {
  productCount: number;
  variantCount: number;
  metadataCount: number;
  productMatrix: number[][];
  variantMatrix: number[][];
}

// const HACHES: Set<number> = new Set();
// function buildMatrix(): string {
//   throw 'TODO:';
// }

function encodeString(str: MetadataValue): number {
  switch (typeof str) {
    case 'number':
      return 0;

    case 'string':
      const hashed = hash(str);
      // TODO: transpose all hash to smaller numbers
      return hashed;

    default:
      return 0;
  }
}

function hash(word: string) {
  // TODO: find a better hashing (without collision)
  const bytes = 7; // wanted to use 8 bytes, but it can exceed the integer limit of 64 bit
  // TODO: only hash if the string
  // TODO: only hash if the string is greather than something.
  const hash = createHash('shake256', {outputLength: bytes}).update(word);
  const hex = hash.digest('hex');
  const hashedInt = parseInt(hex, 16);
  return hashedInt;
}

function buildMatrixRow(metadata: Metadata, fieldTable: FieldTable): number[] {
  // Should build a matrix different for products and variants
  const encodedDocument: number[] = Array(fieldTable.length).fill(0);
  for (let i = 0; i < fieldTable.length; i++) {
    const encodedString = encodeString(metadata[fieldTable[i]]);
    if (encodedString) {
      encodedDocument[i] = encodedString;
    }
  }
  return encodedDocument;
}

function isValidIdField(metadataValue: MetadataValue): boolean {
  const metadataValueType = typeof metadataValue;
  const allowedTypes = ['string', 'number'];
  return allowedTypes.includes(metadataValueType);
}

function getAllMetadataValues() {
  // return Array.from(HACHES.values());
}

// function buildModel(model: VariantModel): string {
//   const productMatrix = model.productMatrix.join(`|${EOL}`);
//   const variantMatrix = model.variantMatrix.join(`|${EOL}`);
//   return dedent`
// PRODUCT_NUMBER = ${model.productCount};
// VARIANT_NUMBER = ${model.variantCount};
// METADATA_KEY_NUMBER = ${model.metadataCount};
// product_matrix = [|
//     ${productMatrix} |];
// variant_matrix = [|
//     ${variantMatrix}|];
// `;
// }

function getClient() {
  return new PlatformClient({
    organizationId: 'clitestsnapshot9ywhd358',
    accessToken: 'xxd622e93f-fbed-4a80-995b-a32ab9fa8027',
    environment: Environment.dev,
  });
}

async function getFieldIndexTable(productFiles: string[]): Promise<FieldTable> {
  // const client = getClient() as any;
  // const analyser = new FieldAnalyser(client);
  // const docBuilders: DocumentBuilder[] = []; // TODO: should instead leverage the callback to not use a lot of memory
  // // const callback = async (docBuilder: DocumentBuilder) => TODO: something is not working with that approach
  // //   await analyser.add([docBuilder]);
  // for (const filePath of productFiles) {
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

async function getMatrices(productFiles: string[], fieldTable: FieldTable) {
  let productCount = 0;
  let variantCount = 0;
  // TODO: try with a dictionnary where the keys are the metadata keys and the values are a list of posible metadata values.
  // That way,  no need to parse twice and no need to transpose
  const productMatrix: number[][] = [];
  const variantMatrix: number[][] = [];

  const matrixBuilderCallback = async (docBuilder: DocumentBuilder) => {
    const {metadata} = docBuilder.build();
    switch (metadata?.objecttype) {
      case 'Product':
        productMatrix.push(buildMatrixRow(metadata, fieldTable));
        productCount++;
        break;
      case 'Variant':
        variantMatrix.push(buildMatrixRow(metadata, fieldTable));
        variantCount++;
        break;

      default:
        break;
    }
  };

  //   Second parse to build product matrix
  for (const filePath of productFiles) {
    parseAndGetDocumentBuilderFromJSONDocument(filePath, {
      callback: matrixBuilderCallback,
    });
  }

  return {
    productMatrix: transposeMatrix(productMatrix),
    variantMatrix: transposeMatrix(variantMatrix),
  };
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
  const productFiles = [
    '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/products.json',
    '/Users/ylakhdar/sandbox/dev_hour_10.0/data/raw_catalog/variants.json',
  ];
  const fieldTable = await getFieldIndexTable(productFiles);
  const {productMatrix, variantMatrix} = await getMatrices(
    productFiles,
    fieldTable
  );
  const uniqueProductMetadataKeys =
    findUniqueMetadataKeysInMatrix(productMatrix);
  const uniqueVariantMetadataKeys =
    findUniqueMetadataKeysInMatrix(variantMatrix);
  console.log('*********************');
  console.log(uniqueProductMetadataKeys.map((i) => fieldTable[i]));
  console.log(uniqueVariantMetadataKeys.map((i) => fieldTable[i]));
  console.log('*********************');
}

/**
 *
 * @param {number[][]} 2 matrix of METADATA_KEY x PRODUCT_NUMBER giving the metadata value for a product on a specific metadata.
 * @return {*}  {number[]} the metadata key indeces for which the value is unique across all documents
 */
function findUniqueMetadataKeysInMatrix(matrix: number[][]): number[] {
  const metadataKeyCandidates: number[] = [];
  for (let i = 0; i < matrix.length; i++) {
    const metadataKeyRow = matrix[i];
    if (!isUniqueAcrossDocument(metadataKeyRow)) {
      continue;
    }
    metadataKeyCandidates.push(i);
  }
  return metadataKeyCandidates;
}

function isUniqueAcrossDocument(possibleValues: number[]): boolean {
  const set = new Set(possibleValues);
  return set.size === possibleValues.length;
}
