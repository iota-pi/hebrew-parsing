#!/usr/bin/env python3

import json
from typing import Set
from tf.advanced.app import App
from tf.app import use

MIN_LEX_FREQ = 0
MAX_VERSE_LENGTH = 15

STEMS = {
    "qal":  "qal",
    "hif":  "hif",
    "piel": "piel",
    "nif":  "nif",
    "hit":  "hit",
    "pual": "pual",
    "hof":  "hof",
}

TENSES = {
    "perf": "perf",
    "impf": "impf",
    "wayq": "wayq",
    "ptca": "ptca",
    "infc": "infc",
    "impv": "impv",
    "ptcp": "ptcp",
    "infa": "infa",
}

class UnhandledStemError(KeyError):
    pass

PERSONS = {"p1": 1, "p2": 2, "p3": 3, "unknown": None}
GENDERS = {"m": "m", "f": "f", "unkown": None}
NUMBERS = {"sg": "s", "pl": "p", "unknown": None}

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
        self.root = api.F.lex_utf8.v(n)
        try:
            self.stem = STEMS[api.F.vs.v(n)]
        except KeyError:
            raise UnhandledStemError()
        self.tense = TENSES[api.F.vt.v(n)]
        self.person = PERSONS.get(api.F.ps.v(n))
        self.gender = GENDERS.get(api.F.gn.v(n))
        self.number = NUMBERS.get(api.F.nu.v(n))
        self.pronom_person = PERSONS.get(api.F.prs_ps.v(n))
        self.pronom_gender = GENDERS.get(api.F.prs_gn.v(n))
        self.pronom_number = NUMBERS.get(api.F.prs_nu.v(n))
        self.reference = api.T.sectionFromNode(n)

        if self.tense == "wayq":
            p = api.L.p(n, otype="word")[-1]
            if api.F.sp.v(p) == "conj":
                self.verb = api.F.g_word_utf8.v(p) + self.verb

    def get_context(self):
        clause = api.L.u(self.n, otype="clause")[0]
        try:
            verse = api.L.u(clause, otype="verse")[0]
            if len(api.T.text(verse).split()) > MAX_VERSE_LENGTH:
                verse = api.L.u(clause, otype="half_verse")[0]
        except IndexError:
            verse = api.L.u(clause, otype="sentence")[0]
        clause_text = api.T.text(clause)
        verse_text = api.T.text(verse)

        verse_text = verse_text.replace(clause_text, "$")
        clause_text = clause_text.replace(self.verb, "$")

        return (clause_text, verse_text, self.reference)

    def __eq__(self, other):
        return self.__hash__() == other.__hash__()

    def __hash__(self):
        return hash(
            (
                self.verb,
                self.root,
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

    def to_simple_obj(self):
        result = [
            self.verb,
            self.root,
            self.stem,
            self.tense,
            self.get_context(),
        ]
        if self.person or self.gender or self.number:
            result.append([self.person, self.gender, self.number])
        else:
            result.append(None)
        if self.pronom_person:
            result.append([
                self.pronom_person,
                self.pronom_gender,
                self.pronom_number,
            ])

        return result


class DataProcessor:
    def __init__(self):
        self.verbs: Set[Verb] = set()
        self.roots: Set[Root] = set()
        self.stem_stats = { key: 0 for key in STEMS.keys() }
        self.tense_stats = { key: 0 for key in TENSES.keys() }
        self.suffixes = 0

    def add_verb(self, n):
        verb = Verb(n)
        self.verbs.add(verb)
        self.stem_stats[verb.stem] += 1
        self.tense_stats[verb.tense] += 1
        if verb.pronom_person:
            self.suffixes += 1
        self.roots.add(Root(n))

    def should_skip_node(self, n):
        if api.F.language.v(n) != "Hebrew":
            return True
        if api.F.freq_lex.v(n) < MIN_LEX_FREQ:
            return True
        if api.F.sp.v(n) != "verb":
            return True
        word = api.F.g_word_utf8.v(n)
        if "\u05be" in word:
            # Contains maqef
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
