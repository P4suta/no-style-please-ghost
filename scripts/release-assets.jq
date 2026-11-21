def empty_starter:
  .state == "starter" and .size == 0
  and (.id | type == "number" and . > 0 and floor == .)
  and (.digest == null or .digest == "" or .digest == "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

(.assets | map(.name)) as $names
| if ($names | unique | length) != ($names | length)
  then error("Duplicate release asset")
  else .
  end
| if all(.assets[]; . as $asset | any($expected[];
    .name == $asset.name and (($asset | empty_starter) or (($asset | .state == "uploaded") and .digest == $asset.digest))))
  then .
  else error("Unexpected, incomplete, or mismatched draft asset")
  end
| if $mode == "cleanup" then .assets[] | select(empty_starter) | .id
  elif $mode == "missing" and all(.assets[]; empty_starter | not) then
    $expected[] | select(.name as $name | $names | index($name) == null) | .name
  else error("Refresh the draft after incomplete uploads")
  end
