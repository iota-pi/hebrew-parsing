# Ignore nodes with parsing exceptions
IGNORE_NODES = {
    112471,  # strange yiqtol 3fp ending (תָה)
    65032,   # data is messy because of textual variants
    16340,   # incorrect parsing (should have 3fs suffix but tagged as 3fp)
}

# Nodes to keep BHSA parsing but ignore OSM parsing (often OSM is inaccurate)
IGNORE_OSM_NODES={
    # Aramaic
    370708,
    370814,
    371016,
    371019,
    371025,
    371172,
    371367,
    371990,
    372155,
    372655,
    372762,
    373439,
    373591,
    373622,
    373642,
    373796,
    374043,
    374112,
    374114,
    374197,
    374483,
    379787,
    379837,
    379922,
    379941,
    380161,
    380394,
    380446,
    380464,
    380612,
    380647,
    381192,
    381296,
    381450,
    381468,

    # Hebrew
}
