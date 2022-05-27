[
  // base JSON
  [
    {
      "objecttype": "Products", // TODO: put in a different array
      "a": "foo",
      "b": "bar",
      "c": "baz"
    },
    {
      "objecttype": "Products",
      "a": "foo2",
      "x": "bix",
      "c": "baz"
    },
    {
      "objecttype": "Products",
      "a": "foo3",
      "b": "bar",
      "x": "bax"
    }
  ],

  // keys converted to number
  [
    ["foo", "bar", "baz", ""],
    ["foo2", "", "baz", "bix"],
    ["foo3", "bar", "", "bax"]
  ],


  // values and keys converted to number
  //  foo  -> 10
  //  foo2 -> 11
  //  foo3 -> 12
  //  bar  -> 20
  //  baz  -> 21
  //  bix  -> 22
  //  bax  -> 23
  [
    [10, 20, 21, 0],
    [11, 0, 21, 22],
    [12, 21, 0, 23]
  ]
]
