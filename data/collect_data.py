#!/usr/bin/env python3

import json
import random
from typing import Set
from tf.advanced.app import App
from tf.app import use

MIN_LEX_FREQ = 0
MIN_QAL_QATAL_FREQ = 50
MAX_VERSE_LENGTH = 15

VOWELS = (
    '\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05b9\u05ba\u05bb\u05bc'
)

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
    '1_Chronicles': 0,
    '1_Kings': 1,
    '1_Samuel': 2,
    '2_Chronicles': 3,
    '2_Kings': 4,
    '2_Samuel': 5,
    'Amos': 6,
    'Daniel': 7,
    'Deuteronomy': 8,
    'Ecclesiastes': 9,
    'Esther': 10,
    'Exodus': 11,
    'Ezekiel': 12,
    'Ezra': 13,
    'Genesis': 14,
    'Habakkuk': 15,
    'Haggai': 16,
    'Hosea': 17,
    'Isaiah': 18,
    'Jeremiah': 19,
    'Job': 20,
    'Joel': 21,
    'Jonah': 22,
    'Joshua': 23,
    'Judges': 24,
    'Lamentations': 25,
    'Leviticus': 26,
    'Malachi': 27,
    'Micah': 28,
    'Nahum': 29,
    'Nehemiah': 30,
    'Numbers': 31,
    'Obadiah': 32,
    'Proverbs': 33,
    'Psalms': 34,
    'Ruth': 35,
    'Song_of_songs': 36,
    'Zechariah': 37,
    'Zephaniah': 38,
}

class UnhandledStemError(KeyError):
    pass

PERSONS = {"p1": 1, "p2": 2, "p3": 3, "unknown": 0, "NA": 0}
GENDERS = {"m": 1, "f": 2, "unknown": 0, "NA": 0}
NUMBERS = {"sg": 1, "pl": 2, "unknown": 0, "NA": 0}

app: App = use("ETCBC/bhsa", silent=True)
api = app.api

class Root:
    def __init__(self, n):
        self.lex = api.F.lex_utf8.v(n)
        self.freq_lex = api.F.freq_lex.v(n)
        self.gloss = api.F.gloss.v(n)

    def __eq__(self, other):
        return self.lex == other.lex

    def __hash__(self):
        return hash(self.lex)

    def to_simple_obj(self):
        return [self.lex, self.freq_lex, self.gloss]

class Verb:
    def __init__(self, n):
        self.n = n
        self.verb = api.F.g_word_utf8.v(n)
        self.root = Root(n)
        self.stem = api.F.vs.v(n)
        if self.stem not in STEMS:
            raise UnhandledStemError()
        self.tense = api.F.vt.v(n)
        self.person = api.F.ps.v(n)
        self.gender = api.F.gn.v(n)
        self.number = api.F.nu.v(n)
        self.pronom_person = api.F.prs_ps.v(n)
        self.pronom_gender = api.F.prs_gn.v(n)
        self.pronom_number = api.F.prs_nu.v(n)
        self.reference = api.T.sectionFromNode(n)

        if self.tense == "wayq":
            p = api.L.p(n, otype="word")[-1]
            if api.F.sp.v(p) == "conj":
                self.verb = api.F.g_word_utf8.v(p) + self.verb

    def get_context(self) -> tuple[str, tuple]:
        clause = api.L.u(self.n, otype="clause")[0]
        clause_text = api.T.text(clause)
        if (
            len(clause_text.split()) == 1
            and self.stem != "qal"
            and self.tense != "qatal"
        ):
            try:
                clause = api.L.u(clause, otype="half_verse")[0]
            except IndexError:
                clause = api.L.u(clause, otype="sentence")[0]
            clause_text = api.T.text(clause)
        clause_text = clause_text.replace(self.verb, "$")

        return (
            clause_text,
            BOOKS[self.reference[0]],
            *self.reference[1:],
        )

    def to_simple_obj(self):
        result = [
            self.verb,
            self.root.lex,
            STEMS[self.stem],
            TENSES[self.tense],
            *self.get_context(),
        ]

        pgn = [
            PERSONS.get(self.person, 0),
            GENDERS.get(self.gender, 0),
            NUMBERS.get(self.number, 0),
        ]
        if sum(pgn) > 0:
            result.extend(pgn)

        suffix = [
            PERSONS.get(self.pronom_person, 0),
            GENDERS.get(self.pronom_gender, 0),
            NUMBERS.get(self.pronom_number, 0),
        ]
        if sum(suffix) > 0:
            result.extend(suffix)

        return result

    def has_vowels(self):
        for vowel in VOWELS:
            if vowel in self.verb:
                return True
        return False

    def should_skip(self):
        if not self.has_vowels():
            return True

        r = random.random()
        if len(self.get_context()[0].split()) == 1:
            return True
        if self.root.lex == "אמר" and self.stem == "qal" and self.tense == "perf":
            return r < 1 / 2
        if self.root.lex == "אמר" and self.stem == "qal" and self.tense == "wayq":
            return r < 2 / 3
        if (
            self.root.lex == "היה"
            and self.stem == "qal"
        ):
            return r < 1 / 2
        if (
            self.stem == "qal"
            and self.tense == "perf"
            and self.root.freq_lex < MIN_QAL_QATAL_FREQ
        ):
            return True
        return False

    def __eq__(self, other):
        return self.__hash__() == other.__hash__()

    def __hash__(self):
        return hash(
            (
                self.verb,
                self.root.lex,
                self.stem,
                self.tense,
                self.person,
                self.gender,
                self.number,
                self.pronom_person,
                self.pronom_gender,
                self.pronom_number,
                self.reference,
            )
        )


class DataProcessor:
    def __init__(self):
        self.verbs: Set[Verb] = set()
        self.roots: Set[Root] = set()
        self.stem_stats = { key: 0 for key in STEMS.keys() }
        self.tense_stats = { key: 0 for key in TENSES.keys() }
        self.suffixes = 0

    def add_verb(self, n):
        verb = Verb(n)
        if verb.should_skip():
            return
        self.verbs.add(verb)
        self.stem_stats[verb.stem] += 1
        self.tense_stats[verb.tense] += 1
        if PERSONS.get(verb.pronom_person):
            self.suffixes += 1
        self.roots.add(verb.root)

    def should_skip_node(self, n):
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

    def get_stats(self):
        return {
            "verbs": len(self.verbs),
            "roots": len(self.roots),
            "stems": self.stem_stats,
            "tenses": self.tense_stats,
            "suffixes": self.suffixes,
        }

def main():
    data = DataProcessor()

    for n in api.N.walk():
        if api.F.otype.v(n) != "word":
            continue
        data.process(n)

    with open("verbs.json", "w", encoding="utf-8") as verbsFile:
        json.dump(
            [
                verb.to_simple_obj()
                for verb in data.verbs
            ],
            verbsFile,
            separators=(",", ":"),
            ensure_ascii=False,
            check_circular=False,
        )

    with open("roots.json", "w", encoding="utf-8") as rootsFile:
        json.dump(
            [root.to_simple_obj() for root in data.roots],
            rootsFile,
            separators=(",", ":"),
            ensure_ascii=False,
            check_circular=False,
        )

    with open("stats.json", "w", encoding="utf-8") as statsFile:
        json.dump(
            data.get_stats(),
            statsFile,
            separators=(",", ":"),
            ensure_ascii=False,
            check_circular=False,
        )


if __name__ == "__main__":
    main()
