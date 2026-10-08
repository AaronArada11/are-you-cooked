# SOLUTION
def find_anagrams(words: list[str]) -> list[list[str]]:
    groups: dict[str, list[str]] = {}

    for word in words:
        signature = "".join(sorted(word))
        groups.setdefault(signature, []).append(word)

    return [group for group in groups.values() if len(group) >= 2]

result = find_anagrams(words)
print("The anagram groups found are:")
print(result)