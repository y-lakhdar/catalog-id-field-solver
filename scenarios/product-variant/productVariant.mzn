include "productVariantLarge.dzn";
include "alldifferent.mzn";

% Constantes
int: PRODUCT_NUMBER;
int: VARIANT_NUMBER;
int: METADATA_KEY_NUMBER;
array[products, metadata_key] of int: product_matrix;
array[variants, metadata_key] of int: variant_matrix;

% Ensembles
set of int: products = 1..PRODUCT_NUMBER;
set of int: variants = 1..VARIANT_NUMBER;
set of int: metadata_key = 1..METADATA_KEY_NUMBER;

% -------- Variables --------
% x represents the product ID field on both object type matrices
array[1..2] of var 1..METADATA_KEY_NUMBER: x;

% y represents the variant ID field on variants
var 1..METADATA_KEY_NUMBER: y;

%-------- Constraints --------
%-- Product constraints --

% product ID field should be defined
constraint forall(i in products)(product_matrix[i, x[1]] != 0);
% product id field should be unique for data having object type of X
constraint alldifferent([product_matrix[i, x[1]] | i in products]);

% product id field must appear on both types of objects (products and variants).
% constraint forall(i in variants)(
%      variant_matrix[i, x[2]] in [product_matrix[j, x[1]] | j in products]
% );
% constraint forall(i in products)(
%      product_matrix[i, x[1]] in {variant_matrix[j, x[2]] | j in variants}
% );
constraint {product_matrix[i, x[1]] | i in products} = {variant_matrix[j, x[2]] | j in variants};

%-- Variant constraints --
% variant ID field should be defined
constraint forall(i in variants)(variant_matrix[i, y] != 0);
% variant ID field should be unique across all variants
constraint alldifferent([variant_matrix[i, y] | i in variants]);

% variant ID field should not be the same as the product ID field
constraint x[1] != y /\ x[2] != y; % TODO: use a global constraint


solve :: int_search(x, first_fail, indomain_min, complete) satisfy;

% Vous pouvez aussi experimenter avec ces variantes de "solve satisfy".
% solve :: int_search(x, first_fail, indomain_min, complete) satisfy;
% solve :: restart_geometric(1.5, 100) satisfy;
%solve :: int_search(x, first_fail, indomain_min, complete) :: restart_geometric(1.5, 100) satisfy;

output ["Product ID field: ", show(x), "\n"];
output ["Variant ID field: ", show(y), "\n"];