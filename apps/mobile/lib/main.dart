import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/api_client.dart';
import 'core/ui.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID');
  runApp(const MadaniParentApp());
}

class MadaniParentApp extends StatefulWidget {
  const MadaniParentApp({super.key});

  @override
  State<MadaniParentApp> createState() => _MadaniParentAppState();
}

class _MadaniParentAppState extends State<MadaniParentApp> {
  final _store = SessionStore();
  late final ApiClient _api = ApiClient();
  late Future<Session?> _sessionFuture;
  Session? _session;

  @override
  void initState() {
    super.initState();
    _sessionFuture = _loadSession();
  }

  Future<Session?> _loadSession() async {
    final session = await _store.load();
    _api.token = session?.token;
    _session = session;
    return session;
  }

  Future<void> _setSession(Session session) async {
    _api.token = session.token;
    await _store.save(session);
    setState(() => _session = session);
  }

  Future<void> _logout() async {
    try {
      await _api.post('/auth/logout', {});
    } catch (_) {
      // Token may already be invalid. Local session still must be cleared.
    }
    _api.token = null;
    await _store.clear();
    setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Madani Nidham Parent',
      debugShowCheckedModeBanner: false,
      theme: madaniTheme(),
      home: FutureBuilder<Session?>(
        future: _sessionFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(body: LoadingBox());
          }

          final session = _session;
          if (session == null) {
            return LoginScreen(api: _api, onLoggedIn: _setSession);
          }

          return HomeShell(api: _api, session: session, onLogout: _logout);
        },
      ),
    );
  }
}
