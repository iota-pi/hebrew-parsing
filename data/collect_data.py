#!/usr/bin/env python3

from collections import Counter
import json
import random
import re
from typing import Any, Dict, Iterable, Iterator, List
from tf.advanced.app import App
from tf.app import use

INCLUDE_ALL_FOR_STATS = False
MIN_LEX_FREQ = 0 if INCLUDE_ALL_FOR_STATS else 20
MIN_QAL_QATAL_FREQ = 0 if INCLUDE_ALL_FOR_STATS else 50

VOWELS = set(
    "\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05b9\u05ba\u05bb\u05bc"
)

PARSING_EXCEPTIONS = {
    112471,  # strange yiqtol 3fp ending (תָה)
    65032,  # data is messy because of textual variants
    16340,  # incorrect parsing (should have 3fs suffix but tagged as 3fp)
}

STEMS = {
    "qal": 1,
    "hif": 2,
    "piel": 3,
    "nif": 4,
    "hit": 5,
    "pual": 6,
    "hof": 7,
}
OSM_STEMS = {
    "q": "qal",
    "Q": "qal",
    "N": "nif",
    "p": "piel",
    "P": "pual",
    "h": "hif",
    "H": "hof",
    "t": "hit",
}

TENSES = {
    "perf": 1,
    "impf": 2,
    "wayq": 3,
    "ptca": 4,
    "infc": 5,
    "impv": 6,
    "ptcp": 7,
    "infa": 8,
}
OSM_TENSES = {
    "p": "perf",
    "q": "perf",
    "i": "impf",
    "w": "wayq",
    "h": "impf",
    "j": "impf",
    "v": "impv",
    "r": "ptca",
    "s": "ptcp",
    "a": "infa",
    "c": "infc",
}

PERSONS = {"1": 1, "2": 2, "3": 3, "unknown": 0, "NA": 0}
GENDERS = {"m": 1, "f": 2, "c": 0, "unknown": 0, "NA": 0}
NUMBERS = {"s": 1, "p": 2, "unknown": 0, "NA": 0}


def map_osm_pgn(pgn: str) -> str:
    if pgn == "x":
        return "unknown"
    return pgn


app: App = use("ETCBC/bhsa", mod="ETCBC/bridging/tf", silent=True, loadData=False)
app.TF.load(" ".join([
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
api = app.TF.api


def strip_accents(s: str):
    return re.sub(rf"[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea ]", "", s)


def has_vowels(s: str):
    return any(c in VOWELS for c in s)


def to_ascii(s: str):
    hebrew_start = 0x0591
    ascii_start = 33
    return "".join(
        c if ord(c) < hebrew_start else chr(ascii_start + ord(c) - hebrew_start)
        for c in s
    )


class UnhandledStemError(KeyError):
    pass


class HasId:
    _id: int | None = None

    @property
    def id(self) -> int:
        if self._id is None:
            raise ValueError("id is not set")
        return self._id

    @id.setter
    def id(self, value: int):
        self._id = value

    def merge(self, other: "HasId") -> "HasId":
        return self

class CountByUses[T: HasId]:
    _data: Dict[str, T]
    counts: Counter[str, int]

    def __init__(self):
        self._data = {}
        self.counts = Counter()

    def get(self, key: str, default: T) -> T:
        if key not in self._data:
            return default
        return self._data[key]

    def add(self, key: str, value: T) -> T:
        if key not in self._data:
            self._data[key] = value
        else:
            self._data[key].merge(value)
        self.counts[key] += 1
        return self._data[key]

    def update_ids(self):
        for i, (key, _) in enumerate(self.counts.most_common()):
            self._data[key].id = i

    def __len__(self):
        return len(self.counts)

    @property
    def data(self) -> Iterator[T]:
        return (self._data[key] for key, _ in self.counts.most_common())


class Book(HasId):
    def __init__(self, n):
        self.book: str = api.T.bookName(n)

    def to_simple_obj(self):
        return self.book.replace("_", " ")


class Root(HasId):
    def __init__(self, n):
        self.lex = api.F.lex_utf8.v(n)
        self.freq_lex = api.F.freq_lex.v(n)
        self.gloss = api.F.gloss.v(n)

    def to_simple_obj(self):
        return [to_ascii(self.lex), self.freq_lex, self.gloss]


class VerbForm(HasId):
    def __init__(self, n: int, root: Root):
        self.verb = api.F.g_word_utf8.v(n)
        self.root = root
        if api.F.vt.v(n) == "wayq":
            p = api.L.p(n, otype="word")[-1]
            if api.F.sp.v(p) == "conj":
                self.verb = api.F.g_word_utf8.v(p) + self.verb
        self.forms_with_accends = set([self.verb])
        self.verb = strip_accents(self.verb)

    def merge(self, other: "VerbForm") -> "VerbForm":
        self.forms_with_accends.update(other.forms_with_accends)
        return self

    def to_simple_obj(self):
        return [
            to_ascii(self.verb),
            self.root.id,
        ]


class VerbParsing(HasId):
    def __init__(self):
        self.stem = ""
        self.tense = ""
        self.person = "NA"
        self.gender = "NA"
        self.number = "NA"
        self.pronom_person = "NA"
        self.pronom_gender = "NA"
        self.pronom_number = "NA"
        self.energic_nun = False
        self.paragogic_nun = False
        self.paragogic_heh = False
        self.cohortative = False

    @staticmethod
    def from_bhsa(n: int):
        p = VerbParsing()
        p.n = n
        p.stem = api.F.vs.v(n)
        if p.stem not in STEMS:
            raise UnhandledStemError()
        p.tense = api.F.vt.v(n)
        p.person = api.F.ps.v(n).replace("p", "")
        p.gender = api.F.gn.v(n)
        p.number = api.F.nu.v(n).replace("sg", "s").replace("pl", "p")
        p.pronom_person = api.F.prs_ps.v(n).replace("p", "")
        p.pronom_gender = api.F.prs_gn.v(n)
        p.pronom_number = api.F.prs_nu.v(n).replace("sg", "s").replace("pl", "p")

        vbe = strip_accents(api.F.g_vbe_utf8.v(n) or " ")
        word = strip_accents(api.F.g_word_utf8.v(n) or " ")
        root = api.F.lex_utf8.v(n)

        should_end_with_nun = (
            p.person in ("3", "2")
            and p.gender == "f"
            and p.number == "p"
        )
        p.paragogic_nun = (
            False
            if should_end_with_nun
            else vbe[-1] in "נן"
        )

        should_end_with_heh = (
            (
                p.tense == "perf"
                and p.person == "3"
                and p.gender == "f"
                and p.number == "s"
            )
            or (
                p.tense == "perf"
                and p.person == "2"
                and p.gender == "m"
                and p.number == "s"
            )
            or (
                p.tense in ("impf", "wayq")
                and p.person in "23"
                and p.gender == "f"
                and p.number == "p"
            )
            or (
                p.tense == "impv"
                and p.gender == "f"
                and p.number == "p"
            )
            or (
                p.tense in ("impf", "wayq")
                and p.person == "1"
            )
        )
        p.paragogic_heh = (
            vbe.endswith("ה")
            or (
                vbe.endswith("ָ")
                and not vbe[:-1].endswith("ך")
                and not vbe[:-1].endswith("כ")
                and not vbe[:-1].endswith("ת")
                and not vbe[:-1].endswith("תּ")
            )
            if not should_end_with_heh and p.pronom_person == "NA"
            else False
        )
        p.cohortative = (
            p.person == "1"
            and p.tense in ("impf", "wayq")
            and vbe.endswith("ה")
        )

        p.energic_nun = (
            (
                p.pronom_person == "3"
                and p.pronom_gender == "m"
                and p.pronom_number == "s"
                and (
                    word.endswith("נּוּ")
                    or word.endswith("נְהוּ")
                )
            )
            or (
                p.pronom_person == "2"
                and p.pronom_gender == "m"
                and p.pronom_number == "s"
                and (
                    word.endswith("ךָּ")
                    or word.endswith("כָּה")
                )
            ) or (
                p.pronom_person == "1"
                and p.pronom_number == "s"
                and (
                    word.endswith("נִּי")
                    or (
                        word.endswith("נְנִי")
                        and not root.endswith("נן")
                    )
                )
            ) or (
                p.pronom_person == "3"
                and p.pronom_gender == "f"
                and p.pronom_number == "s"
                and word.endswith("נָּה")
            )
        )

        return p

    @staticmethod
    def from_osm(n: int):
        osm = api.F.osm.v(n)
        osm_sf = api.F.osm_sf.v(n) or ""
        if osm and len(osm) == 2:
            osm = osm_sf
            osm_sf = ""
        if osm == osm_sf:
            osm_sf = ""
        if not osm or osm == "*" or osm[1] != "V":
            return None
        if (
            osm_sf
            and not osm_sf.startswith("HS")
            and not osm_sf.startswith("HPp")
        ):
            raise RuntimeError(f"Unexpected osm_sf: {osm_sf}")

        p = VerbParsing()
        p.n = n
        try:
            p.stem = OSM_STEMS[osm[2]]
        except KeyError:
            return None
        p.tense = OSM_TENSES[osm[3]]
        has_person = p.tense not in ("ptca", "ptcp", "infc", "infa")
        pgn_offset = 1 if has_person else 0
        p.person = map_osm_pgn(osm[4]) if has_person else "NA"
        p.gender = map_osm_pgn(osm[4 + pgn_offset]) if len(osm) > 4 else "NA"
        p.number = map_osm_pgn(osm[5 + pgn_offset]) if len(osm) > 4 else "NA"
        p.pronom_person = map_osm_pgn(osm_sf[3]) if len(osm_sf) > 3 else "NA"
        p.pronom_gender = map_osm_pgn(osm_sf[4]) if len(osm_sf) > 3 else "NA"
        p.pronom_number = map_osm_pgn(osm_sf[5]) if len(osm_sf) > 3 else "NA"
        p.paragogic_nun = osm_sf[2] == "n" if osm_sf else False
        p.paragogic_heh = osm_sf[2] in "dh" if osm_sf else False
        p.cohortative = osm[3] == "h"

        return p

    def __repr__(self) -> str:
        return " ".join((
            self.stem,
            self.tense,
            self.person or "",
            self.gender or "",
            self.number or "",
            self.pronom_person or "",
            self.pronom_gender or "",
            self.pronom_number or "",
            "T" if self.paragogic_nun else "F",
            "T" if self.paragogic_heh else "F",
            "T" if self.cohortative else "F",
            "T" if self.energic_nun else "F",
        ))

    def __eq__(self, value: object) -> bool:
        if not isinstance(value, VerbParsing):
            return False

        return (
            self.stem == value.stem
            and self.tense == value.tense
            and PERSONS[self.person] == PERSONS[value.person]
            and GENDERS[self.gender] == GENDERS[value.gender]
            and NUMBERS[self.number] == NUMBERS[value.number]
            and PERSONS[self.pronom_person] == PERSONS[value.pronom_person]
            and GENDERS[self.pronom_gender] == GENDERS[value.pronom_gender]
            and NUMBERS[self.pronom_number] == NUMBERS[value.pronom_number]
            and self.paragogic_nun == value.paragogic_nun
            and self.paragogic_heh == value.paragogic_heh
            and self.cohortative == value.cohortative
            and self.energic_nun == value.energic_nun
        )

    def to_simple_obj(self):
        result = [
            STEMS[self.stem],
            TENSES[self.tense],
        ]

        pgn = (
            PERSONS.get(self.person, 0),
            GENDERS.get(self.gender, 0),
            NUMBERS.get(self.number, 0),
        )
        suffix = (
            PERSONS.get(self.pronom_person, 0),
            GENDERS.get(self.pronom_gender, 0),
            NUMBERS.get(self.pronom_number, 0),
        )

        result.append(pgn)
        result.append(suffix)

        result.append(1 if self.paragogic_nun else 0)
        result.append(1 if self.paragogic_heh else 0)
        result.append(1 if self.cohortative else 0)
        result.append(1 if self.energic_nun else 0)

        return result


class Verse(HasId):
    def __init__(self, n: int, book: Book):
        self.reference = api.T.sectionFromNode(n)
        self.text = self.get_text(n)
        self.book = book

    def get_text(self, n: int):
        chunk = api.L.u(n, otype="verse")
        if len(chunk) == 0:
            chunk = api.L.u(n, otype="sentence")
        clause_text = api.T.text(chunk[0])
        clause_text = clause_text.replace("׃", "").replace("  ", " ").strip()
        return clause_text

    def __repr__(self):
        return repr(self.reference)

    def to_simple_obj(self):
        return [
            self.book.id,
            *self.reference[1:],
            to_ascii(self.text),
        ]


class VerbOccurrence:
    def __init__(self, verb: VerbForm, parsings: Iterable[VerbParsing], verse: Verse):
        self.verb = verb
        self.parsings = parsings
        self.verse = verse

    def to_simple_obj(self):
        return [
            self.verb.id,
            self.verse.id,
            *(p.id for p in self.parsings),
        ]

    def should_skip(self):
        r = random.random()
        if INCLUDE_ALL_FOR_STATS:
            return False
        root = self.verb.root
        for parsing in self.parsings:
            if parsing.paragogic_nun or parsing.paragogic_heh:
                continue
            if root.lex == "אמר" and parsing.stem == "qal" and parsing.tense == "perf":
                return r < 2 / 3
            if root.lex == "אמר" and parsing.stem == "qal" and parsing.tense == "wayq":
                return r < 3 / 4
            if (
                root.lex == "היה"
                and parsing.stem == "qal"
            ):
                if parsing.tense == "perf" or parsing.tense == "yqtl":
                    return r < 3 / 4
                return r < 1 / 2
            if root.freq_lex < MIN_LEX_FREQ or (
                parsing.stem == "qal"
                and parsing.tense == "perf"
                and root.freq_lex < MIN_QAL_QATAL_FREQ
            ):
                return True
        if not has_vowels(self.verb.verb):
            return True
        return False


class DataManager:
    def __init__(self):
        self.books = CountByUses[Book]()
        self.occurrences: List[VerbOccurrence] = []
        self.parsings = CountByUses[VerbParsing]()
        self.roots = CountByUses[Root]()
        self.verbs = CountByUses[VerbForm]()
        self.verses = CountByUses[Verse]()

    def add_verb(self, n):
        b = Book(n)
        book = self.books.get(b.book, b)

        r = Root(api.L.u(n, otype="lex")[0])
        root = self.roots.get(r.lex, r)

        v = VerbForm(n, root)
        verb = self.verbs.get(v.verb, v)

        v = Verse(n, book)
        verse = self.verses.get(str(v), v)

        p_bhs = VerbParsing.from_bhsa(n)
        p_osm = VerbParsing.from_osm(n)
        parsings = [
            self.parsings.get(str(p_bhs), p_bhs)
        ]
        if p_osm and p_osm != p_bhs:
            parsings.append(self.parsings.get(str(p_osm), p_osm))

        occurrence = VerbOccurrence(verb, parsings, verse)
        if occurrence.should_skip():
            return

        self.occurrences.append(occurrence)
        self.books.add(book.book, book)
        self.roots.add(root.lex, root)
        self.verbs.add(verb.verb, verb)
        self.verses.add(str(verse), verse)
        for parsing in parsings:
            self.parsings.add(str(parsing), parsing)

    def should_skip_node(self, n):
        if api.F.otype.v(n) != "word":
            return True
        if api.F.language.v(n) != "Hebrew":
            return True
        if api.F.sp.v(n) != "verb":
            return True
        if n in PARSING_EXCEPTIONS:
            return True

        # Contains maqef
        word = api.F.g_word_utf8.v(n)
        if "\u05be" in word:
            return True

        return False

    def process(self, n):
        if self.should_skip_node(n):
            return
        try:
            self.add_verb(n)
        except UnhandledStemError:
            return

    def finish(self):
        self.books.update_ids()
        self.parsings.update_ids()
        self.roots.update_ids()
        self.verbs.update_ids()
        self.verses.update_ids()

    def stats(self):
        print("Roots", len(self.roots))
        print("Verbs", len(self.verbs))
        print("Parsings", len(self.parsings))
        print("Verses", len(self.verses))
        print("Occurrences", len(self.occurrences))
        print(
            "OSM parsings in use",
            len([o for o in self.occurrences if len(o.parsings) > 1])
        )
        for i, p in enumerate(("BHS", "OSM")):
            print(
                f"Energic nuns ({p})",
                sum(
                    o.parsings[i].energic_nun
                    if i < len(o.parsings)
                    else False
                    for o in self.occurrences
                )
            )
            print(
                f"Paragogic nuns ({p})",
                sum(
                    o.parsings[i].paragogic_nun
                    if i < len(o.parsings)
                    else False
                    for o in self.occurrences
                )
            )
            print(
                f"Paragogic hehs ({p})",
                sum(
                    o.parsings[i].paragogic_heh
                    if i < len(o.parsings)
                    else False
                    for o in self.occurrences
                )
            )
            print(
                f"Cohortatives ({p})",
                sum(
                    o.parsings[i].cohortative
                    if i < len(o.parsings)
                    else False
                    for o in self.occurrences
                )
            )

def write_json(data: Any, filename: str):
    with open(filename, "w", encoding="utf-8") as file_object:
        json.dump(
            data,
            file_object,
            separators=(",", ":"),
            ensure_ascii=False,
            check_circular=False,
        )

def main():
    data = DataManager()
    for n in api.N.walk():
        data.process(n)
    data.finish()
    data.stats()

    write_json(
        {
            "verbs": [v.to_simple_obj() for v in data.verbs.data],
            "occurrences": [o.to_simple_obj() for o in data.occurrences],
            "parsings": [p.to_simple_obj() for p in data.parsings.data],
            "verses": [v.to_simple_obj() for v in data.verses.data],
            "roots": [root.to_simple_obj() for root in data.roots.data],
            "books": [book.to_simple_obj() for book in data.books.data],
        },
        "../public/data.json",
    )


if __name__ == "__main__":
    main()
