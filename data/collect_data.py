#!/usr/bin/env python3

import json
import random
from collections import Counter
from typing import Dict, Set
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

PGNS = {
    (0, 0, 0): 0,
    (0, 1, 1): 5,
    (0, 1, 2): 9,
    (0, 2, 1): 12,
    (0, 2, 2): 13,
    (3, 0, 2): 8,
    (3, 1, 1): 1,
    (3, 1, 2): 3,
    (3, 2, 1): 6,
    (3, 2, 2): 14,
    (2, 1, 1): 2,
    (2, 1, 2): 7,
    (2, 2, 1): 11,
    (2, 2, 2): 15,
    (1, 0, 1): 4,
    (1, 0, 2): 10,
}

PERSONS = {"p1": 1, "p2": 2, "p3": 3, "unknown": 0, "NA": 0}
GENDERS = {"m": 1, "f": 2, "unknown": 0, "NA": 0}
NUMBERS = {"sg": 1, "pl": 2, "unknown": 0, "NA": 0}

app: App = use("ETCBC/bhsa", silent=True)
api = app.api


class UnhandledStemError(KeyError):
    pass

class RootManager:
    def __init__(self):
        self.roots: Dict[str, Root] = {}
        self.counts: Dict[Root, int] = {}
        self.order_lookup: Dict[Root, int] = {}
        self.order_needs_updating = False

    def __len__(self):
        return len(self.roots)

    def get_root(self, n):
        root = Root(n)
        self.roots.setdefault(root.lex, root)
        self.counts.setdefault(root, 0)
        self.counts[root] += 1
        self.order_needs_updating = True
        return root

    def update_order(self):
        order = Counter(self.counts).most_common()
        self.order_lookup = {root: i for i, (root, _) in enumerate(order)}
        self.order_needs_updating = False

    def get_id(self, root):
        if self.order_needs_updating:
            self.update_order()
        return self.order_lookup[root]


class Root:
    def __init__(self, n):
        self.lex = api.F.lex_utf8.v(n)
        self.freq_lex = api.F.freq_lex.v(n)
        self.gloss = api.F.gloss.v(n)

    def __eq__(self, other):
        return self.lex == other.lex

    def __hash__(self):
        return hash(self.lex)

    def to_simple_obj(self, roots: RootManager):
        return [roots.get_id(self), self.lex, self.freq_lex, self.gloss]


class Verb:
    def __init__(self, n, roots: RootManager):
        self.n = n
        self.verb = api.F.g_word_utf8.v(n)
        self.root = roots.get_root(api.L.u(n, otype="lex")[0])
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
        if len(clause_text.split()) < 3:
            verses = api.L.u(clause, otype="verse")
            if len(verses):
                all_clauses = api.L.d(verses[0], otype="clause")
                main_clause_index = all_clauses.index(clause)
                if main_clause_index > 0:
                    clause_text = (
                        api.T.text(all_clauses[main_clause_index - 1])
                        + " "
                        + clause_text
                    )
                if main_clause_index < len(all_clauses) - 1:
                    clause_text += " " + api.T.text(all_clauses[main_clause_index + 1])
        clause_text = clause_text.replace(self.verb, "$")
        clause_text = clause_text.replace("׃", "").strip()

        return (
            clause_text,
            BOOKS[self.reference[0]],
            *self.reference[1:],
        )

    def to_simple_obj(self, roots):
        result = [
            self.verb,
            roots.get_id(self.root),
            STEMS[self.stem],
            TENSES[self.tense],
            *self.get_context(),
        ]

        pgn = PGNS[(
            PERSONS.get(self.person, 0),
            GENDERS.get(self.gender, 0),
            NUMBERS.get(self.number, 0),
        )]
        suffix = PGNS[(
            PERSONS.get(self.pronom_person, 0),
            GENDERS.get(self.pronom_gender, 0),
            NUMBERS.get(self.pronom_number, 0),
        )]
        if pgn + suffix > 0:
            result.append(pgn)

        if suffix > 0:
            result.append(suffix)

        return result

    def has_vowels(self):
        for vowel in VOWELS:
            if vowel in self.verb:
                return True
        return False

    def should_skip(self):
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


class DataManager:
    def __init__(self):
        self.verbs: Set[Verb] = set()
        self.roots = RootManager()
        self.stem_stats = { key: 0 for key in STEMS.keys() }
        self.tense_stats = { key: 0 for key in TENSES.keys() }
        self.suffixes = 0

    def add_verb(self, n):
        verb = Verb(n, self.roots)
        if verb.should_skip():
            return
        self.verbs.add(verb)
        self.stem_stats[verb.stem] += 1
        self.tense_stats[verb.tense] += 1
        if PERSONS.get(verb.pronom_person):
            self.suffixes += 1

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
    data = DataManager()

    for n in api.N.walk():
        if api.F.otype.v(n) != "word":
            continue
        data.process(n)

    with open("verbs.json", "w", encoding="utf-8") as verbsFile:
        json.dump(
            [
                verb.to_simple_obj(data.roots)
                for verb in data.verbs
            ],
            verbsFile,
            separators=(",", ":"),
            ensure_ascii=False,
            check_circular=False,
        )

    with open("roots.json", "w", encoding="utf-8") as rootsFile:
        json.dump(
            [root.to_simple_obj(data.roots) for root in data.roots.roots.values()],
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
