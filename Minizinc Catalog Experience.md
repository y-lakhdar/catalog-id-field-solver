# Minizinc catalog experience
## Scenario 1 : Products
### Rules
- sku field should be available on all document
- sku field should be unique across all data

## Scenario 2 : Products and Variants
### Rules
- object type count >= 2
- product id field should be unique for data having object type of X
- product id field should be unique for data having object type of Y
- product id field from object type X should exist in object type of Y
- sku field should be unique across all data

## Scenario 3 : Products, Variants and Availabilities
### Rules
- object type count >= 3
- product id field should be unique for data having object type of X
- product id field should be unique for data having object type of Y
- product id field from object type X should exist in object type of Y
- SKU field should be unique across object type of Y
- availability Is should be unique across object Z
- sku list not sure how to compute that????