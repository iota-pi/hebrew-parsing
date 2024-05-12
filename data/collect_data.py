#!/usr/bin/env python3

from collections import Counter
import json
import random
import re
from typing import Any, Dict, Iterator, List, Set
from tf.advanced.app import App
from tf.app import use

MIN_LEX_FREQ = 10
MIN_QAL_QATAL_FREQ = 50

STEMS = {
    "qal": 1,
    "hif": 2,
    "piel": 3,
    "nif": 4,
    "hit": 5,
    "pual": 6,
    "hof": 7,
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

BOOKS = {
    "1_Chronicles": 0,
    "1_Kings": 1,
    "1_Samuel": 2,
    "2_Chronicles": 3,
    "2_Kings": 4,
    "2_Samuel": 5,
    "Amos": 6,
    "Daniel": 7,
    "Deuteronomy": 8,
    "Ecclesiastes": 9,
    "Esther": 10,
    "Exodus": 11,
    "Ezekiel": 12,
    "Ezra": 13,
    "Genesis": 14,
    "Habakkuk": 15,
    "Haggai": 16,
    "Hosea": 17,
    "Isaiah": 18,
    "Jeremiah": 19,
    "Job": 20,
    "Joel": 21,
    "Jonah": 22,
    "Joshua": 23,
    "Judges": 24,
    "Lamentations": 25,
    "Leviticus": 26,
    "Malachi": 27,
    "Micah": 28,
    "Nahum": 29,
    "Nehemiah": 30,
    "Numbers": 31,
    "Obadiah": 32,
    "Proverbs": 33,
    "Psalms": 34,
    "Ruth": 35,
    "Song_of_songs": 36,
    "Zechariah": 37,
    "Zephaniah": 38,
}

PERSONS = {"p1": 1, "p2": 2, "p3": 3, "unknown": 0, "NA": 0}
GENDERS = {"m": 1, "f": 2, "unknown": 0, "NA": 0}
NUMBERS = {"sg": 1, "pl": 2, "unknown": 0, "NA": 0}

app: App = use("ETCBC/bhsa", silent=True)
api = app.api


def strip_accents(s: str):
    return re.sub(rf"[^\u05b0-\u05bc\u05c1\u05c2\u05c7-\u05ea ]", "", s)


def to_ascii(s: str):
    hebrew_start = 0x0591
    ascii_start = 33
    return ''.join(
        c if ord(c) < hebrew_start else chr(ascii_start + ord(c) - hebrew_start)
        for c in s
    )


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

    def merge(self, other: 'HasId') -> 'HasId':
        return self

class CountByUses[T: HasId]:
    _data: Dict[str, T]
    counts: Counter[str, int]

    def __init__(self):
        self._data = {}
        self.counts = Counter()

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


class UnhandledStemError(KeyError):
    pass


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

    def merge(self, other: 'VerbForm') -> 'VerbForm':
        self.forms_with_accends.update(other.forms_with_accends)
        return self

    def to_simple_obj(self):
        return [
            to_ascii(self.verb),
            self.root.id,
        ]


class VerbParsing(HasId):
    def __init__(
        self,
        stem,
        tense,
        person,
        gender,
        number,
        pronom_person,
        pronom_gender,
        pronom_number,
        paragogic_nun,
    ):
        self.stem = stem
        self.tense = tense
        self.person = person
        self.gender = gender
        self.number = number
        self.pronom_person = pronom_person
        self.pronom_gender = pronom_gender
        self.pronom_number = pronom_number
        self.paragogic_nun = paragogic_nun

    @staticmethod
    def from_node(n):
        stem = api.F.vs.v(n)
        if stem not in STEMS:
            raise UnhandledStemError()
        tense = api.F.vt.v(n)
        person = api.F.ps.v(n)
        gender = api.F.gn.v(n)
        number = api.F.nu.v(n)
        pronom_person = api.F.prs_ps.v(n)
        pronom_gender = api.F.prs_gn.v(n)
        pronom_number = api.F.prs_nu.v(n)

        should_end_with_nun = (
            api.F.ps.v(n) in ("p3", "p2")
            and api.F.gn.v(n) == "f"
            and api.F.nu.v(n) == "pl"
        )
        paragogic_nun = (
            api.F.vbe.v(n).endswith("NN")
            if should_end_with_nun
            else api.F.vbe.v(n).endswith("N")
        )
        return VerbParsing(
            stem,
            tense,
            person,
            gender,
            number,
            pronom_person,
            pronom_gender,
            pronom_number,
            paragogic_nun,
        )

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
            'T' if self.paragogic_nun else 'F',
        ))

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

        if pgn or suffix:
            result.append(pgn)
            if suffix:
                result.append(suffix)

        result.append(1 if self.paragogic_nun else 0)

        return result


class Verse(HasId):
    def __init__(self, n: int):
        self.reference = api.T.sectionFromNode(n)
        self.text = self.get_text(n)

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
            BOOKS[self.reference[0]],
            *self.reference[1:],
            to_ascii(self.text),
        ]


class VerbOccurrence:
    def __init__(self, verb: VerbForm, parsing: VerbParsing, verse: Verse):
        self.verb = verb
        self.parsing = parsing
        self.verse = verse

    def to_simple_obj(self):
        return [
            self.verb.id,
            self.parsing.id,
            self.verse.id,
        ]

    def should_skip(self):
        r = random.random()
        root = self.verb.root
        parsing = self.parsing
        if root.lex == "אמר" and parsing.stem == "qal" and parsing.tense == "perf":
            return r < 1 / 2
        if root.lex == "אמר" and parsing.stem == "qal" and parsing.tense == "wayq":
            return r < 3 / 4
        if (
            root.lex == "היה"
            and parsing.stem == "qal"
        ):
            if parsing.tense == "perf" or parsing.tense == "yqtl":
                return r < 3 / 4
            return r < 1 / 2
        if (
            parsing.stem == "qal"
            and parsing.tense == "perf"
            and root.freq_lex < MIN_QAL_QATAL_FREQ
        ):
            return True
        return False


class DataManager:
    def __init__(self):
        self.roots = CountByUses[Root]()
        self.verbs = CountByUses[VerbForm]()
        self.parsings = CountByUses[VerbParsing]()
        self.verses = CountByUses[Verse]()
        self.occurrences: List[VerbOccurrence] = []

    def add_verb(self, n):
        r = Root(api.L.u(n, otype="lex")[0])
        root = self.roots.add(r.lex, r)
        v = VerbForm(n, root)
        verb = self.verbs.add(v.verb, v)
        p = VerbParsing.from_node(n)
        parsing = self.parsings.add(str(p), p)
        v = Verse(n)
        verse = self.verses.add(str(v), v)
        occurrence = VerbOccurrence(verb, parsing, verse)
        if occurrence.should_skip():
            return
        self.occurrences.append(occurrence)

    def should_skip_node(self, n):
        if api.F.otype.v(n) != "word":
            return True
        if api.F.language.v(n) != "Hebrew":
            return True
        if api.F.freq_lex.v(n) < MIN_LEX_FREQ:
            return True
        if api.F.sp.v(n) != "verb":
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
        self.roots.update_ids()
        self.verbs.update_ids()
        self.parsings.update_ids()
        self.verses.update_ids()

    def stats(self):
        print("Roots", len(self.roots))
        print("Verbs", len(self.verbs))
        print("Parsings", len(self.parsings))
        print("Verses", len(self.verses))
        print("Occurrences", len(self.occurrences))

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
        },
        "../public/data.json",
    )


if __name__ == "__main__":
    main()
