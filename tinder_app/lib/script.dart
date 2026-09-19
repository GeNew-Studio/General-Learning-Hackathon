class ScriptTurn {
  const ScriptTurn({required this.scammer, required this.victim});

  final String scammer;
  final String victim;

  factory ScriptTurn.fromJson(Map<String, dynamic> json) {
    return ScriptTurn(
      scammer: json['scammer'] as String,
      victim: json['victim'] as String,
    );
  }
}

const demoStop = {
  'a',
  'an',
  'the',
  'to',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'is',
  'are',
  'am',
  'be',
  'was',
  'it',
  'its',
  'im',
  'i',
  'me',
  'my',
  'you',
  'your',
  'he',
  'him',
  'his',
  'she',
  'her',
  'this',
  'that',
  'now',
  'so',
  'as',
  'if',
  'but',
  'will',
  'just',
  'into',
  'someone',
  'someones',
};

final _opener = RegExp(
  r'^((?:hi)+|hey+|hello|yo|sup|哈囉|嗨|你好)([\s!?.~💕💗😊💋]*)$',
  caseSensitive: false,
);
final _hkDollar = RegExp(r'hk\s*\$', caseSensitive: false);
final _digitSep = RegExp(r'(\d)[,\-\s]+(?=\d)');
final _emoji = RegExp(r'[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]', unicode: true);
final _nonAlnum = RegExp(r'[^\p{L}\p{N}\s]', unicode: true);
final _cjkRun = RegExp(r'([\u4e00-\u9fff]+)');
final _cjkChunk = RegExp(r'[\u4e00-\u9fff]{3,}');
final _longNum = RegExp(r'\d{5,}');
final _hasDigit = RegExp(r'\d');
final _hasLetter = RegExp(r'[a-z]', caseSensitive: false);
final _cjkChar = RegExp(r'[\u4e00-\u9fff]');

bool isOpener(String text) => _opener.hasMatch(text.trim());

bool distinctiveToken(String token) {
  return token.length >= 7 ||
      _longNum.hasMatch(token) ||
      (_hasDigit.hasMatch(token) && _hasLetter.hasMatch(token)) ||
      (token.length >= 4 && _cjkChar.hasMatch(token));
}

String normalizeDemo(String text) {
  return text
      .toLowerCase()
      .replaceAll(_hkDollar, 'hk ')
      .replaceAllMapped(_digitSep, (m) => m[1]!)
      .replaceAll(_emoji, ' ')
      .replaceAll(_nonAlnum, ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

List<String> demoTokens(String text) {
  return normalizeDemo(text)
      .replaceAllMapped(_cjkRun, (m) => ' ${m[1]} ')
      .split(' ')
      .where((w) => w.length > 1 && !demoStop.contains(w))
      .toList();
}

List<String> cjkChunks(String text) {
  return _cjkChunk.allMatches(normalizeDemo(text)).map((m) => m.group(0)!).toList();
}

bool demoLineMatches(String input, String expected) {
  final a = demoTokens(input).toSet();
  final b = demoTokens(expected).toSet().toList();
  if (b.isEmpty) return false;
  var hit = 0;
  for (final w in b) {
    if (a.contains(w)) hit += 1;
  }
  final coverage = hit / b.length;
  final nums = b.where(_longNum.hasMatch).toList();
  final compactIn = normalizeDemo(input).replaceAll(' ', '');
  final numsOk =
      nums.isNotEmpty && nums.every((n) => a.contains(n) || compactIn.contains(n));
  if (numsOk && hit >= 2) return true;
  final distinctiveHit = b.any((w) => distinctiveToken(w) && a.contains(w));
  if (distinctiveHit && hit >= 2) return true;
  if (hit >= 4 && coverage >= 0.3) return true;
  if (coverage >= 0.42) return true;
  if (b.length <= 8 && hit >= (b.length * 0.5).ceil().clamp(3, 8)) {
    return true;
  }
  final compactEx = normalizeDemo(expected).replaceAll(' ', '');
  if (compactEx.length >= 24 && compactIn.contains(compactEx.substring(0, 24))) {
    return true;
  }
  final chunks = cjkChunks(expected);
  final chunkHits = chunks.where(compactIn.contains).length;
  if (chunks.isNotEmpty && chunkHits / chunks.length >= 0.5) return true;
  if (chunkHits >= 2) return true;
  return false;
}

bool matchesCurrentTurn(String text, List<ScriptTurn> turns, int step) {
  if (step < 0 || step >= turns.length) return false;
  if (demoLineMatches(text, turns[step].scammer)) return true;
  return step == 0 && isOpener(text);
}

String cleanChatText(String text) {
  return text
      .replaceAll('\u00e2\u0080\u0094', ',')
      .replaceAll('\u00e2\u0080\u00a6', '...')
      .replaceAll('\u2014', ',')
      .replaceAll('\u2013', ',')
      .replaceAll('\u2026', '...')
      .replaceAll(' — ', ', ')
      .replaceAll(' – ', ', ')
      .replaceAll(' ,', ',');
}
