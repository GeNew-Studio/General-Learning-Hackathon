import 'dart:convert';

import 'package:http/http.dart' as http;

String apiBase() {
  const fromEnv = String.fromEnvironment('API_BASE');
  if (fromEnv.isNotEmpty) return fromEnv;
  return 'http://127.0.0.1:8787';
}

class ApiException implements Exception {
  ApiException(this.message, {this.status});
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class DecoyApi {
  DecoyApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? sessionId;

  Future<Map<String, dynamic>> _json(
    String method,
    String path, {
    Object? body,
  }) async {
    final uri = Uri.parse('${apiBase()}$path');
    final headers = {'Content-Type': 'application/json'};
    late final http.Response res;
    try {
      if (method == 'POST') {
        res = await _client
            .post(uri, headers: headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 90));
      } else {
        res = await _client.get(uri, headers: headers).timeout(const Duration(seconds: 90));
      }
    } on Exception {
      throw ApiException('Message not sent');
    }
    Map<String, dynamic> data = {};
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) data = decoded;
    } catch (_) {}
    if (res.statusCode >= 400) {
      throw ApiException('Message not sent', status: res.statusCode);
    }
    return data;
  }

  Future<void> createSession() async {
    final data = await _json('POST', '/api/session', body: {'persona_id': 'dating'});
    sessionId = data['session_id'] as String?;
    if (sessionId == null || sessionId!.isEmpty) {
      throw ApiException("Couldn't start chat");
    }
  }

  Future<void> seed(List<Map<String, String>> messages) async {
    if (sessionId == null) await createSession();
    await _json('POST', '/api/session/$sessionId/seed', body: {'messages': messages});
  }

  Future<String?> chat(String message) async {
    if (sessionId == null) await createSession();
    Future<Map<String, dynamic>> post() {
      return _json('POST', '/api/chat', body: {
        'session_id': sessionId,
        'message': message,
      });
    }

    try {
      final data = await post();
      return data['reply'] as String?;
    } on ApiException catch (err) {
      if (err.status != 404) rethrow;
      await createSession();
      final data = await post();
      return data['reply'] as String?;
    }
  }
}
