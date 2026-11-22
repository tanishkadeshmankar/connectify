# India location directory

Connectify bundles an alphabetical snapshot of Indian states and union territories, districts, and urban local bodies at `public/data/india-locations.json`. The single place search suggests matching cities/towns, districts, and states; choosing one filters the community catalog, event list, calendar, and map.

The map uses OpenStreetMap tiles with visible attribution. Its community and event dots represent approximate listing areas; they do not identify exact meeting addresses. Tile access follows the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

The source is the Local Government Directory (LGD), Ministry of Panchayati Raj, Government of India, served through an LGD-derived JSON mirror. The bundled snapshot currently contains 36 states/UTs, 784 districts, and 5,050 city/ULB records. City records without an LGD district code remain selectable under their state, but cannot be narrowed to a district in the picker.

Refresh the snapshot from a network-enabled terminal in the project folder:

```powershell
npm run refresh:locations
```

The script downloads the current states, districts, and city/ULB pages, sorts them alphabetically, and rewrites the bundled JSON. Check the source data and license before redistribution or production use.

Sources:

- [Government of India LGD districts dataset](https://data.gov.in/resource/local-government-directory-lgd-districts)
- [LGD-derived JSON API documentation](https://lgd-json-api.vercel.app/docs)
