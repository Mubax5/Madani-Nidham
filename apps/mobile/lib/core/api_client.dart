import 'dart:async';
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

typedef JsonMap = Map<String, dynamic>;

const defaultApiBaseUrl = String.fromEnvironment(
  'MADANI_API_URL',
  defaultValue: 'http://10.0.2.2:8000/api/v1',
);

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.errors});

  final String message;
  final int? statusCode;
  final Object? errors;

  @override
  String toString() => message;
}

class Session {
  const Session({required this.token, required this.user});

  final String token;
  final JsonMap user;

  String get name => '${user['name'] ?? 'Orang tua'}';
  String get email => '${user['email'] ?? ''}';
}

class SessionStore {
  static const _tokenKey = 'madani_parent_token';
  static const _userKey = 'madani_parent_user';
  static const _secureStorage = FlutterSecureStorage(
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<Session?> load() async {
    final prefs = await SharedPreferences.getInstance();
    var token = await _secureStorage.read(key: _tokenKey);
    final legacyToken = prefs.getString(_tokenKey);
    if (token == null && legacyToken != null) {
      token = legacyToken;
      await _secureStorage.write(key: _tokenKey, value: legacyToken);
      await prefs.remove(_tokenKey);
    }
    final rawUser = prefs.getString(_userKey);
    if (token == null || rawUser == null) return null;

    final decoded = jsonDecode(rawUser);
    if (decoded is! JsonMap) return null;
    return Session(token: token, user: decoded);
  }

  Future<void> save(Session session) async {
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.write(key: _tokenKey, value: session.token);
    await prefs.remove(_tokenKey);
    await prefs.setString(_userKey, jsonEncode(session.user));
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await _secureStorage.delete(key: _tokenKey);
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}

class ApiClient {
  ApiClient({this.baseUrl = defaultApiBaseUrl, this.token});

  static const _requestTimeout = Duration(seconds: 20);

  final String baseUrl;
  String? token;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final base = Uri.parse(baseUrl);
    final baseSegments = base.pathSegments.where((part) => part.isNotEmpty);
    final pathSegments = path
        .split('/')
        .where((part) => part.isNotEmpty)
        .map(Uri.decodeComponent);
    final cleanQuery = <String, String>{};
    query?.forEach((key, value) {
      if (value != null && '$value'.isNotEmpty) cleanQuery[key] = '$value';
    });

    return base.replace(
      pathSegments: [...baseSegments, ...pathSegments],
      queryParameters: cleanQuery.isEmpty ? null : cleanQuery,
    );
  }

  Map<String, String> get _headers => {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final response = await http
        .get(_uri(path, query), headers: _headers)
        .timeout(_requestTimeout);
    return _decode(response);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final response = await http
        .post(_uri(path), headers: _headers, body: jsonEncode(body))
        .timeout(_requestTimeout);
    return _decode(response);
  }

  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final response = await http
        .put(_uri(path), headers: _headers, body: jsonEncode(body))
        .timeout(_requestTimeout);
    return _decode(response);
  }

  Future<dynamic> multipart(
    String path, {
    required Map<String, String> fields,
    PlatformFile? file,
    String fileField = 'file',
  }) async {
    final request = http.MultipartRequest('POST', _uri(path));
    request.headers.addAll({
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });
    request.fields.addAll(fields);
    if (file?.path != null) {
      request.files.add(
        await http.MultipartFile.fromPath(
          fileField,
          file!.path!,
          filename: file.name,
        ),
      );
    }

    final streamed = await request.send().timeout(_requestTimeout);
    final response = await http.Response.fromStream(streamed);
    return _decode(response);
  }

  dynamic _decode(http.Response response) {
    JsonMap payload;
    try {
      payload = jsonDecode(response.body) as JsonMap;
    } catch (_) {
      throw ApiException(
        'Server mengirim response tidak valid.',
        statusCode: response.statusCode,
      );
    }

    final ok =
        response.statusCode >= 200 &&
        response.statusCode < 300 &&
        payload['success'] == true;
    if (!ok) {
      throw ApiException(
        '${payload['message'] ?? 'Request gagal.'}',
        statusCode: response.statusCode,
        errors: payload['errors'],
      );
    }

    return payload['data'];
  }
}

List<JsonMap> asList(dynamic value) {
  if (value is List) {
    return value.whereType<JsonMap>().toList();
  }
  return const [];
}

JsonMap asMap(dynamic value) => value is JsonMap ? value : <String, dynamic>{};
