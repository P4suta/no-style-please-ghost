(.assets | map(.name)) as $names
| if ($names | unique | length) != ($names | length)
  then error("Duplicate release asset")
  else .
  end
| if all(.assets[]; . as $asset | .state == "uploaded" and any($expected[]; .name == $asset.name and .digest == $asset.digest))
  then $expected[] | select(.name as $name | $names | index($name) == null) | .name
  else error("Unexpected, incomplete, or mismatched draft asset")
  end
