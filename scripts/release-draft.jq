if (.id | tostring) == $id
  and .draft == true
  and ($source | test("\\A[0-9a-f]{40}\\z"))
  and .target_commitish == $source
  and (.tag_name | test("\\Av(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\z"))
then .tag_name
else error("Expected a stable release draft for the selected ID and source commit")
end
