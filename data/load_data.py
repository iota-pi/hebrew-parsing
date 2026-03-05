import os
from cfabric import Fabric

_api_cache = None

def load_data():
    global _api_cache
    if _api_cache is not None:
        return _api_cache

    bhsa_path = os.path.expanduser("~/text-fabric-data/github/ETCBC/bhsa/tf/2021")
    bridging_path = os.path.expanduser("~/text-fabric-data/github/ETCBC/bridging/tf/2021")

    CF = Fabric(
        locations=[bhsa_path, bridging_path],
        silent=True,
    )
    api = CF.load(" ".join([
        "freq_lex",
        "gloss",
        "g_word_utf8",
        "g_vbe_utf8",
        "gn",
        "language",
        "lex_utf8",
        "nu",
        "osm",
        "osm_sf",
        "prs_nu",
        "prs_gn",
        "prs_ps",
        "ps",
        "sp",
        "vs",
        "vt",
        "vbe",
    ]))

    _api_cache = api
    return api
