include "CatalogProducts.dzn";
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
constraint forall(i in products)(
     product_matrix[i, x[1]] in {variant_matrix[j, x[2]] | j in variants}
);

%-- Variant constraints --
% variant ID field should be defined
constraint forall(i in variants)(variant_matrix[i, y] != 0);
% variant ID field should be unique across all variants
constraint alldifferent([variant_matrix[i, y] | i in variants]);

% variant ID field should not be the same as the product ID field
constraint x[1] != y /\ x[2] != y; % TODO: use a global constraint

% constraint all_different([x[i, j] | i in lignes, j in colonnes]);
% constraint forall(i in x)(sum([x[i, j] | j in colonnes]) = SOMME_MAGIQUE);
% constraint forall(j in colonnes)(sum([x[i, j] | i in lignes]) = SOMME_MAGIQUE);
% constraint sum([x[i, i] | i in lignes]) = SOMME_MAGIQUE;
% constraint sum([x[i, n - i + 1] | i in lignes]) = SOMME_MAGIQUE;

% Bris de symmetries

% % On peut prendre un carre magique et permuter les ranges i et n - i + 1
% % en meme temps que les colonnes i et n - i + 1 et obtenir un nouveau carre magique
% % satisfaisant toutes les contraintes. Par consequent, on peut
% % toujours obtenir une solution ou x[i, i] < x[n - i + 1, n - i + 1].
% % Si ce n'est pas le cas, on applique la permutation.
% constraint forall(i in 1..n div 2)(x[i, i] < x[n - i + 1, n - i + 1]);

% % On peut choisir deux entiers 1 <= i < j < n/2. On permutte la rangee i avec j et
% % la rangee n - i + 1 avec n - j + 1 de meme que la colonne i avec j et n - i + 1 avec
% % n - j + 1. La solution obtenue est un carre magique valide. La consequence est
% % qu'on peut faire n'importe quelle permutation sur les floor(n/2) premiers elements
% % de la diagonale. On peut donc trier cette partie de la diagonale.
% constraint forall(i in 1..n div 2 - 1)(x[i, i] < x[i + 1, i + 1]);

% % La transposee d'un carre magique et un carre magique. On peut donc forcer le coin
% % superieur droit a etre plus grand (ou plus petit) que le coin inferieur gauche.
% constraint x[1, n] > x[n, 1];

solve satisfy;

% Vous pouvez aussi experimenter avec ces variantes de "solve satisfy".
% solve :: int_search(x, first_fail, indomain_min, complete) satisfy;
% solve :: restart_geometric(1.5, 100) satisfy;
%solve :: int_search(x, first_fail, indomain_min, complete) :: restart_geometric(1.5, 100) satisfy;

output ["Product ID field: ", show(x), "\n"];
output ["Variant ID field: ", show(y), "\n"];