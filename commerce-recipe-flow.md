# flow where we redirect the user to the admin UI to create the catalog
create snapshot -> HARDCODED catalog id
                -> HARDCODED origin level
                -> requires product object type (from user input)

apply snapshot -> requires create snapshot

create catalog source

Stream data to source -> requires source id

create UI -> HARDCODED origin level

create catalog from Admin UI -> requires catalog fields ID
                             -> requires source ID
                             -> requires pushing data

# flow where we create the catalog from the CLI
create snapshot -> HARDCODED catalog id
                -> HARDCODED origin level
                -> requires product object type (from user input)

apply snapshot -> requires create snapshot

create catalog source

parse data to get catalog field IDs and standard fields

create catalog -> requires catalog fields ID
               -> requires source ID

Stream data to source -> requires source ID

create UI -> HARDCODED origin level
