import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'script.dart';

enum ItemKind { meta, stamp, outgoing, incoming, hint, sent, typing, undelivered }

class ThreadItem {
  ThreadItem(this.kind, String text, {this.failed = false}) : text = cleanChatText(text);
  final ItemKind kind;
  final String text;
  final bool failed;
}

class TinderChatPage extends StatefulWidget {
  const TinderChatPage({super.key});

  @override
  State<TinderChatPage> createState() => _TinderChatPageState();
}

class _TinderChatPageState extends State<TinderChatPage> {
  static const matchName = 'ava';
  static const avatarAsset = 'assets/ava.jpg';

  final _api = DecoyApi();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();

  List<ScriptTurn> _turns = [];
  final List<ThreadItem> _items = [];
  final List<({String user, String victim})> _demoLog = [];
  int _scriptStep = 0;
  int _seededCount = 0;
  bool _busy = false;
  String? _lastStampKey;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    final raw = await rootBundle.loadString('assets/dating_turns.json');
    final list = jsonDecode(raw) as List<dynamic>;
    _turns = list.map((e) => ScriptTurn.fromJson(e as Map<String, dynamic>)).toList();
    _resetThread();
  }

  void _resetThread() {
    _items
      ..clear()
      ..add(ThreadItem(ItemKind.meta, 'You matched with $matchName on ${_matchDate()}'));
    _scriptStep = 0;
    _seededCount = 0;
    _demoLog.clear();
    _lastStampKey = null;
    setState(() {});
  }

  String _matchDate() {
    final d = DateTime.now();
    return '${d.day}/${d.month}/${d.year}';
  }

  String _periodLabel() {
    final d = DateTime.now();
    final hour12 = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final m = d.minute.toString().padLeft(2, '0');
    final ampm = d.hour < 12 ? 'AM' : 'PM';
    return 'Today $hour12:$m $ampm';
  }

  void _maybeStamp() {
    final now = DateTime.now();
    final key = '${now.hour}:${now.minute}';
    if (_lastStampKey == key) return;
    _lastStampKey = key;
    _items.add(ThreadItem(ItemKind.stamp, _periodLabel()));
  }

  void _stripStatus() {
    _items.removeWhere((i) => i.kind == ItemKind.sent || i.kind == ItemKind.undelivered);
  }

  void _markSent() {
    _stripStatus();
    _items.add(ThreadItem(ItemKind.sent, 'Sent'));
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _seedPair(String user, String victim) async {
    _demoLog.add((user: user, victim: victim));

    Future<void> push(List<({String user, String victim})> pairs) {
      final messages = <Map<String, String>>[
        for (final pair in pairs) ...[
          {'role': 'user', 'content': pair.user},
          {'role': 'assistant', 'content': pair.victim},
        ],
      ];
      return _api.seed(messages);
    }

    try {
      await push(_demoLog.sublist(_seededCount));
      _seededCount = _demoLog.length;
    } on ApiException catch (err) {
      if (err.status != 404) rethrow;
      await _api.createSession();
      _seededCount = 0;
      await push(_demoLog);
      _seededCount = _demoLog.length;
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    _input.clear();

    if (_scriptStep < _turns.length) {
      if (matchesCurrentTurn(text, _turns, _scriptStep)) {
        await _playDemo(text);
      } else {
        _maybeStamp();
        setState(() {
          _stripStatus();
          _items.add(ThreadItem(ItemKind.outgoing, text));
          _markSent();
        });
        _scrollToEnd();
      }
      return;
    }
    await _sendLive(text);
  }

  Future<void> _playDemo(String text) async {
    final step = _turns[_scriptStep];
    _maybeStamp();
    setState(() {
      _busy = true;
      _stripStatus();
      _items.add(ThreadItem(ItemKind.outgoing, text));
      _items.add(ThreadItem(ItemKind.typing, ''));
    });
    _scrollToEnd();
    await Future<void>.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;
    setState(() {
      _items.removeWhere((i) => i.kind == ItemKind.typing);
      _markSent();
      _items.add(ThreadItem(ItemKind.incoming, step.victim));
      if (!_items.any((i) => i.kind == ItemKind.hint)) {
        _items.add(ThreadItem(ItemKind.hint, 'Double tap ❤️'));
      }
      _scriptStep += 1;
      _busy = false;
    });
    _scrollToEnd();
    try {
      await _seedPair(text, step.victim);
    } catch (_) {
      if (!mounted) return;
    }
  }

  Future<void> _sendLive(String text) async {
    _maybeStamp();
    setState(() {
      _busy = true;
      _stripStatus();
      _items.add(ThreadItem(ItemKind.outgoing, text));
      _items.add(ThreadItem(ItemKind.typing, ''));
    });
    _scrollToEnd();
    try {
      final reply = await _api.chat(text);
      if (!mounted) return;
      setState(() {
        _items.removeWhere((i) => i.kind == ItemKind.typing);
        _markSent();
        if (reply != null && reply.isNotEmpty) {
          _items.add(ThreadItem(ItemKind.incoming, reply));
          if (!_items.any((i) => i.kind == ItemKind.hint)) {
            _items.add(ThreadItem(ItemKind.hint, 'Double tap ❤️'));
          }
        }
        _busy = false;
      });
      _scrollToEnd();
    } catch (err) {
      if (!mounted) return;
      setState(() {
        _items.removeWhere((i) => i.kind == ItemKind.typing);
        _items.removeWhere((i) => i.kind == ItemKind.outgoing && i.text == text);
        _items.add(ThreadItem(ItemKind.outgoing, text));
        _items.add(ThreadItem(ItemKind.undelivered, 'Not delivered · tap to retry'));
        _busy = false;
        _input.text = text;
      });
      _scrollToEnd();
    }
  }

  Future<void> _unmatch() async {
    _resetThread();
    try {
      await _api.createSession();
    } catch (_) {}
  }

  void _openMore() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _sheetBtn('Unmatch', const Color(0xFFE0245E), () {
                  Navigator.pop(ctx);
                  _unmatch();
                }),
                const SizedBox(height: 8),
                _sheetBtn('Cancel', Colors.black87, () => Navigator.pop(ctx)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _sheetBtn(String label, Color color, VoidCallback onTap) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFFF2F2F4),
          foregroundColor: color,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final framed = size.width > 480;
    final phone = _phone();
    if (!framed) return phone;
    return ColoredBox(
      color: const Color(0xFF111111),
      child: Center(
        child: SizedBox(
          width: 390,
          height: min(844, size.height),
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(36),
              boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 24)],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(36),
              child: phone,
            ),
          ),
        ),
      ),
    );
  }

  Widget _phone() {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F7),
      body: SafeArea(
        child: Column(
          children: [
            _header(),
            Expanded(child: _thread()),
            _composer(),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(4, 6, 4, 10),
      child: Row(
        children: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.chevron_left, size: 32, color: Color(0xFF3A3A3C)),
          ),
          Expanded(
            child: Column(
              children: [
                ClipOval(
                  child: Image.asset(
                    avatarAsset,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                    alignment: const Alignment(0.15, -0.4),
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  matchName,
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Color(0xFF2B2B2B)),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: _openMore,
            icon: const Icon(Icons.more_horiz, size: 28, color: Color(0xFF3A3A3C)),
          ),
        ],
      ),
    );
  }

  Widget _thread() {
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(14, 18, 14, 12),
      itemCount: _items.length,
      itemBuilder: (context, index) => _bubble(_items[index], index),
    );
  }

  bool _showIncomingAvatar(int index) {
    for (var i = index + 1; i < _items.length; i++) {
      if (_items[i].kind == ItemKind.incoming) return false;
      if (_items[i].kind == ItemKind.outgoing) break;
    }
    return true;
  }

  Widget _bubble(ThreadItem item, int index) {
    switch (item.kind) {
      case ItemKind.meta:
      case ItemKind.stamp:
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            item.text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFFB0B0B4), fontSize: 13, fontWeight: FontWeight.w500),
          ),
        );
      case ItemKind.hint:
        return const Padding(
          padding: EdgeInsets.only(left: 36, bottom: 8, top: 2),
          child: Text('Double tap ❤️', style: TextStyle(color: Color(0xFFC2C2C6), fontSize: 13)),
        );
      case ItemKind.sent:
        return const Align(
          alignment: Alignment.centerRight,
          child: Padding(
            padding: EdgeInsets.only(bottom: 6, right: 2),
            child: Text('Sent', style: TextStyle(color: Color(0xFFC2C2C6), fontSize: 11)),
          ),
        );
      case ItemKind.undelivered:
        return Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () {
              final lastOut = _items.lastWhere((i) => i.kind == ItemKind.outgoing);
              _items.removeWhere((i) => i.kind == ItemKind.undelivered || (i.kind == ItemKind.outgoing && i.text == lastOut.text));
              _sendLive(lastOut.text);
            },
            child: const Text(
              'Not delivered · tap to retry',
              style: TextStyle(color: Color(0xFFE0245E), fontSize: 12),
            ),
          ),
        );
      case ItemKind.typing:
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _avatar(28),
              const SizedBox(width: 6),
              const _TypingDots(),
            ],
          ),
        );
      case ItemKind.incoming:
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _showIncomingAvatar(index) ? _avatar(28) : const SizedBox(width: 28),
              const SizedBox(width: 6),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE9E9EB),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(18),
                      topRight: Radius.circular(18),
                      bottomRight: Radius.circular(18),
                      bottomLeft: Radius.circular(6),
                    ),
                  ),
                  child: Text(item.text, style: const TextStyle(fontSize: 16, height: 1.3, color: Color(0xFF1C1C1E))),
                ),
              ),
            ],
          ),
        );
      case ItemKind.outgoing:
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Align(
            alignment: Alignment.centerRight,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 280),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFF26252A),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(6),
                  ),
                ),
                child: Text(item.text, style: const TextStyle(fontSize: 16, height: 1.3, color: Colors.white)),
              ),
            ),
          ),
        );
    }
  }

  Widget _avatar(double size) {
    return ClipOval(
      child: Image.asset(
        avatarAsset,
        width: size,
        height: size,
        fit: BoxFit.cover,
        alignment: const Alignment(0.15, -0.4),
      ),
    );
  }

  Widget _composer() {
    final hasText = _input.text.trim().isNotEmpty;
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFECECEE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              'GIF',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.4, color: Color(0xFF6E6E73)),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.only(left: 14, right: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFECECEE),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      focusNode: _focus,
                      enabled: !_busy,
                      maxLength: 4000,
                      decoration: const InputDecoration(
                        hintText: 'Type a message',
                        hintStyle: TextStyle(color: Color(0xFFB1B1B6)),
                        border: InputBorder.none,
                        counterText: '',
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  if (hasText)
                    IconButton(
                      onPressed: _busy ? null : _send,
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFFE3C72),
                        minimumSize: const Size(34, 34),
                        padding: EdgeInsets.zero,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingDots extends StatefulWidget {
  const _TypingDots();

  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1050),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFE9E9EB),
        borderRadius: BorderRadius.circular(18),
      ),
      child: AnimatedBuilder(
        animation: _c,
        builder: (_, _) {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, (i) {
              final t = ((_c.value + i * 0.12) % 1);
              final y = t < 0.4 ? -3.0 * (t / 0.4) : 0.0;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                child: Transform.translate(
                  offset: Offset(0, y),
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(color: Color(0xFFB4B4B8), shape: BoxShape.circle),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}
