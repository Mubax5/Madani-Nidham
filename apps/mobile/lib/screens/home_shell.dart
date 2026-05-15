import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import '../core/ui.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.api,
    required this.session,
    required this.onLogout,
  });

  final ApiClient api;
  final Session session;
  final Future<void> Function() onLogout;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  late Future<JsonMap> _homeFuture;
  var _index = 0;
  List<JsonMap> _children = const [];
  JsonMap? _selectedChild;

  @override
  void initState() {
    super.initState();
    _homeFuture = _loadHome();
  }

  Future<JsonMap> _loadHome() async {
    final data = asMap(await widget.api.get('/mobile/parent/home'));
    final children = asList(data['children']);
    if (mounted) {
      setState(() {
        _children = children;
        if (_selectedChild == null && children.isNotEmpty) {
          _selectedChild = children.first;
        } else if (_selectedChild != null) {
          _selectedChild = children
              .where((child) => child['id'] == _selectedChild!['id'])
              .firstOrNull;
        }
      });
    }
    return data;
  }

  Future<void> _refreshHome() async {
    setState(() => _homeFuture = _loadHome());
    await _homeFuture;
  }

  @override
  Widget build(BuildContext context) {
    final child = _selectedChild;
    final pages = [
      ParentHomeTab(homeFuture: _homeFuture, onRefresh: _refreshHome),
      ChildTab(api: widget.api, child: child),
      ActivityTab(api: widget.api, child: child),
      FeesTab(api: widget.api, child: child),
      InfoTab(api: widget.api),
      AiTab(api: widget.api, child: child),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Madani Nidham'),
            Text(
              widget.session.name,
              style: const TextStyle(
                color: MadaniColors.muted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        actions: [
          if (_children.length > 1)
            DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: child?['id'] as int?,
                borderRadius: BorderRadius.circular(8),
                items: _children
                    .map(
                      (item) => DropdownMenuItem<int>(
                        value: item['id'] as int,
                        child: Text(
                          textOf(item, 'nickname', textOf(item, 'fullName')),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (id) {
                  setState(() {
                    _selectedChild = _children.firstWhere(
                      (item) => item['id'] == id,
                    );
                  });
                },
              ),
            ),
          IconButton(
            tooltip: 'Profil',
            onPressed: _showProfile,
            icon: const Icon(Icons.account_circle_outlined),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Beranda',
          ),
          NavigationDestination(icon: Icon(Icons.child_care), label: 'Anak'),
          NavigationDestination(icon: Icon(Icons.timeline), label: 'Aktivitas'),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            label: 'Tagihan',
          ),
          NavigationDestination(
            icon: Icon(Icons.campaign_outlined),
            label: 'Info',
          ),
          NavigationDestination(icon: Icon(Icons.auto_awesome), label: 'AI'),
        ],
      ),
    );
  }

  Future<void> _showProfile() async {
    final user = widget.session.user;
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: MadaniColors.navy,
                    foregroundColor: Colors.white,
                    child: Icon(Icons.person_outline),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          textOf(user, 'name'),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          textOf(user, 'email'),
                          style: const TextStyle(
                            color: MadaniColors.muted,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              MadaniCard(
                child: Column(
                  children: [
                    _InfoRow('Telepon', textOf(user, 'phone', 'Belum diisi')),
                    _InfoRow(
                      'Google',
                      user['googleLinkedAt'] == null
                          ? 'Belum terhubung'
                          : 'Terhubung ${dateText(user['googleLinkedAt'])}',
                    ),
                    _InfoRow(
                      'Verifikasi',
                      user['emailVerifiedAt'] == null
                          ? 'Email belum terverifikasi'
                          : 'Email terverifikasi',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  widget.onLogout();
                },
                icon: const Icon(Icons.logout, size: 18),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ParentHomeTab extends StatelessWidget {
  const ParentHomeTab({
    super.key,
    required this.homeFuture,
    required this.onRefresh,
  });

  final Future<JsonMap> homeFuture;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<JsonMap>(
      future: homeFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const LoadingBox();
        }
        if (snapshot.hasError) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [ErrorBox('${snapshot.error}', onRetry: onRefresh)],
          );
        }

        final data = snapshot.data ?? {};
        final summary = asMap(data['summary']);
        final today = asMap(data['today']);
        final attendance = asList(today['attendance']);
        final absences = asList(today['absenceRequests']);
        final journals = asList(data['latestJournals']);
        final announcements = asList(data['announcements']);
        final agendas = asList(data['agendas']);
        final children = asList(data['children']);

        return RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
            children: [
              _HeroSummary(children: children),
              const SizedBox(height: 10),
              Row(
                children: [
                  MiniStat(
                    label: 'Anak',
                    value: '${summary['childrenCount'] ?? 0}',
                    icon: Icons.child_care,
                    color: MadaniColors.blue,
                  ),
                  const SizedBox(width: 8),
                  MiniStat(
                    label: 'Tagihan',
                    value: '${summary['pendingFees'] ?? 0}',
                    icon: Icons.receipt_long,
                    color: const Color(0xFFD97706),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  MiniStat(
                    label: 'Izin pending',
                    value: '${summary['pendingAbsenceRequests'] ?? 0}',
                    icon: Icons.assignment_late_outlined,
                    color: MadaniColors.danger,
                  ),
                  const SizedBox(width: 8),
                  MiniStat(
                    label: 'Notifikasi',
                    value: '${summary['unreadNotifications'] ?? 0}',
                    icon: Icons.notifications_active_outlined,
                    color: MadaniColors.gold,
                  ),
                ],
              ),
              const SectionTitle(title: 'Hari ini'),
              if (attendance.isEmpty && absences.isEmpty)
                const EmptyState('Belum ada absensi atau izin hari ini.')
              else ...[
                for (final item in attendance)
                  _CompactItem(
                    title: textOf(
                      asMap(item['student']),
                      'nickname',
                      textOf(asMap(item['student']), 'fullName'),
                    ),
                    subtitle:
                        '${dateText(item['date'])} - ${textOf(item, 'notes', 'Absensi tercatat')}',
                    pill: textOf(item, 'status'),
                    icon: Icons.check_circle_outline,
                  ),
                for (final item in absences)
                  _CompactItem(
                    title: textOf(
                      asMap(item['student']),
                      'nickname',
                      textOf(asMap(item['student']), 'fullName'),
                    ),
                    subtitle: textOf(item, 'reason'),
                    pill: textOf(item, 'status'),
                    icon: Icons.assignment_outlined,
                  ),
              ],
              const SectionTitle(title: 'Jurnal terbaru'),
              if (journals.isEmpty)
                const EmptyState('Jurnal terbaru belum tersedia.')
              else
                for (final item in journals)
                  _CompactItem(
                    title:
                        '${dateText(item['date'], short: true)} - ${textOf(asMap(item['student']), 'nickname', textOf(asMap(item['student']), 'fullName'))}',
                    subtitle: textOf(item, 'content'),
                    pill: textOf(item, 'mood', 'jurnal'),
                    icon: Icons.menu_book_outlined,
                  ),
              const SectionTitle(title: 'Pengumuman'),
              if (announcements.isEmpty)
                const EmptyState('Belum ada pengumuman.')
              else
                for (final item in announcements)
                  _CompactItem(
                    title: textOf(item, 'title'),
                    subtitle: textOf(item, 'content'),
                    pill: item['isUrgent'] == true ? 'urgent' : 'info',
                    icon: Icons.campaign_outlined,
                  ),
              const SectionTitle(title: 'Agenda dekat'),
              if (agendas.isEmpty)
                const EmptyState('Belum ada agenda dekat.')
              else
                for (final item in agendas)
                  _CompactItem(
                    title: textOf(item, 'title'),
                    subtitle:
                        '${dateText(item['startDate'])} - ${textOf(item, 'location', 'Sekolah')}',
                    pill: textOf(item, 'type'),
                    icon: Icons.event_outlined,
                  ),
            ],
          ),
        );
      },
    );
  }
}

class ChildTab extends StatefulWidget {
  const ChildTab({super.key, required this.api, required this.child});

  final ApiClient api;
  final JsonMap? child;

  @override
  State<ChildTab> createState() => _ChildTabState();
}

class _ChildTabState extends State<ChildTab> {
  late Future<JsonMap> _future = _load();

  @override
  void didUpdateWidget(covariant ChildTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.child?['id'] != widget.child?['id']) {
      _future = _load();
    }
  }

  Future<JsonMap> _load() async {
    final child = widget.child;
    if (child == null) return {};
    final id = child['id'];
    final results = await Future.wait([
      widget.api.get('/mobile/parent/children/$id'),
      widget.api.get('/mobile/parent/children/$id/reports'),
      widget.api.get(
        '/mobile/parent/children/$id/portfolio',
        query: {'limit': 8},
      ),
    ]);
    return {
      'detail': asMap(results[0]),
      'reports': asList(results[1]),
      'portfolio': asList(results[2]),
    };
  }

  @override
  Widget build(BuildContext context) {
    if (widget.child == null) return const _NoChild();
    return FutureBuilder<JsonMap>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const LoadingBox();
        }
        if (snapshot.hasError) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ErrorBox(
                '${snapshot.error}',
                onRetry: () => setState(() => _future = _load()),
              ),
            ],
          );
        }

        final detail = asMap(snapshot.data?['detail']);
        final reports = asList(snapshot.data?['reports']);
        final portfolio = asList(snapshot.data?['portfolio']);
        final activeClass = asList(detail['classes']).firstOrNull;

        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              MadaniCard(
                padding: 14,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _AvatarImage(url: textOf(detail, 'photoUrl', ''), size: 66),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            textOf(detail, 'fullName'),
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              StatusPill(
                                textOf(detail, 'programLabel', 'Reguler'),
                              ),
                              StatusPill(
                                textOf(activeClass ?? {}, 'name', 'Kelas'),
                              ),
                              StatusPill(textOf(detail, 'status')),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SectionTitle(title: 'Biodata'),
              MadaniCard(
                child: Column(
                  children: [
                    _InfoRow('NIS', textOf(detail, 'nis')),
                    _InfoRow('Panggilan', textOf(detail, 'nickname')),
                    _InfoRow(
                      'Lahir',
                      '${textOf(detail, 'birthPlace')} / ${dateText(detail['birthDate'])}',
                    ),
                    _InfoRow('Program', textOf(detail, 'programLabel')),
                    _InfoRow('Alamat', textOf(detail, 'address')),
                    _InfoRow(
                      'Alergi',
                      textOf(detail, 'allergyNotes', 'Tidak ada catatan'),
                    ),
                    _InfoRow(
                      'Medis',
                      textOf(detail, 'medicalNotes', 'Tidak ada catatan'),
                    ),
                  ],
                ),
              ),
              const SectionTitle(title: 'Raport terbit'),
              if (reports.isEmpty)
                const EmptyState('Raport yang sudah dipublish belum tersedia.')
              else
                for (final report in reports)
                  _CompactItem(
                    title:
                        'Semester ${textOf(report, 'semester')} - ${textOf(asMap(report['academicYear']), 'name')}',
                    subtitle: textOf(
                      report,
                      'generalNotes',
                      'Raport sudah diterbitkan.',
                    ),
                    pill: textOf(report, 'signatureStatus', 'published'),
                    icon: Icons.picture_as_pdf_outlined,
                    onTap: () => _openUrl(
                      textOf(
                        report,
                        'signedPdfUrl',
                        textOf(report, 'pdfUrl', ''),
                      ),
                    ),
                  ),
              const SectionTitle(title: 'Portofolio terbaru'),
              if (portfolio.isEmpty)
                const EmptyState('Portofolio belum tersedia.')
              else
                for (final item in portfolio)
                  _CompactItem(
                    title: textOf(item, 'title'),
                    subtitle:
                        '${dateText(item['workDate'])} - ${textOf(item, 'description')}',
                    pill: textOf(asMap(item['area']), 'name', 'portfolio'),
                    icon: Icons.collections_bookmark_outlined,
                  ),
            ],
          ),
        );
      },
    );
  }
}

class ActivityTab extends StatefulWidget {
  const ActivityTab({super.key, required this.api, required this.child});

  final ApiClient api;
  final JsonMap? child;

  @override
  State<ActivityTab> createState() => _ActivityTabState();
}

class _ActivityTabState extends State<ActivityTab> {
  final _tabs = const ['Absensi', 'Jurnal', 'Montessori', 'Hafalan', 'Izin'];
  final _search = TextEditingController();
  var _selected = 0;
  Future<dynamic>? _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void didUpdateWidget(covariant ActivityTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.child?['id'] != widget.child?['id']) {
      _future = _load();
    }
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<dynamic> _load() {
    final child = widget.child;
    if (child == null) return Future.value([]);
    final id = child['id'];
    return switch (_selected) {
      0 => widget.api.get(
        '/mobile/parent/children/$id/attendance',
        query: {'limit': 90},
      ),
      1 => widget.api.get(
        '/mobile/parent/children/$id/journals',
        query: {'limit': 60, 'q': _search.text.trim()},
      ),
      2 => widget.api.get('/mobile/parent/children/$id/montessori'),
      3 => widget.api.get('/mobile/parent/children/$id/hafalan'),
      _ => widget.api.get('/absence-requests/my'),
    };
  }

  void _reload() => setState(() => _future = _load());

  @override
  Widget build(BuildContext context) {
    if (widget.child == null) return const _NoChild();
    return Column(
      children: [
        Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _tabs.length,
            separatorBuilder: (_, index) => const SizedBox(width: 6),
            itemBuilder: (context, index) {
              final active = index == _selected;
              return ChoiceChip(
                selected: active,
                label: Text(_tabs[index]),
                onSelected: (_) {
                  setState(() {
                    _selected = index;
                    _future = _load();
                  });
                },
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: active ? MadaniColors.navy : MadaniColors.muted,
                ),
                selectedColor: MadaniColors.gold.withValues(alpha: 0.32),
                backgroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0x140A1F5C)),
                ),
              );
            },
          ),
        ),
        if (_selected == 1)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search, size: 20),
                hintText: 'Cari isi jurnal',
              ),
              onSubmitted: (_) => _reload(),
            ),
          ),
        Expanded(
          child: FutureBuilder<dynamic>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const LoadingBox();
              }
              if (snapshot.hasError) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [ErrorBox('${snapshot.error}', onRetry: _reload)],
                );
              }

              final childId = widget.child!['id'];
              return RefreshIndicator(
                onRefresh: () async => _reload(),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                  children: [
                    if (_selected == 0) _attendanceList(asList(snapshot.data)),
                    if (_selected == 1) _journalList(asList(snapshot.data)),
                    if (_selected == 2) _montessoriList(asList(snapshot.data)),
                    if (_selected == 3) _hafalanList(asMap(snapshot.data)),
                    if (_selected == 4)
                      _absenceList(
                        asList(snapshot.data)
                            .where((item) => item['studentId'] == childId)
                            .toList(),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
        if (_selected == 4)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: ElevatedButton.icon(
              onPressed: _showAbsenceSheet,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Kirim izin/sakit'),
            ),
          ),
      ],
    );
  }

  Widget _attendanceList(List<JsonMap> rows) {
    if (rows.isEmpty) {
      return const EmptyState('Riwayat absensi belum tersedia.');
    }
    return Column(
      children: [
        const SectionTitle(title: 'Riwayat absensi'),
        for (final item in rows)
          _CompactItem(
            title: dateText(item['date']),
            subtitle:
                '${textOf(asMap(item['class']), 'name', 'Kelas')} - ${textOf(item, 'notes', 'Tidak ada catatan')}',
            pill: textOf(item, 'status'),
            icon: Icons.fact_check_outlined,
          ),
      ],
    );
  }

  Widget _journalList(List<JsonMap> rows) {
    if (rows.isEmpty) return const EmptyState('Jurnal belum tersedia.');
    return Column(
      children: [
        const SectionTitle(title: 'Jurnal anak'),
        for (final item in rows)
          _CompactItem(
            title: dateText(item['date']),
            subtitle: textOf(item, 'content'),
            pill: textOf(item, 'mood', 'jurnal'),
            icon: Icons.menu_book_outlined,
          ),
      ],
    );
  }

  Widget _montessoriList(List<JsonMap> areas) {
    if (areas.isEmpty) {
      return const EmptyState('Progress Montessori belum tersedia.');
    }
    return Column(
      children: [
        const SectionTitle(title: 'Progress Montessori'),
        for (final area in areas)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: MadaniCard(
              padding: 0,
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 12),
                childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                title: Text(
                  textOf(area, 'name'),
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                subtitle: Text(
                  '${area['masteredCount'] ?? 0}/${area['milestoneCount'] ?? 0} dikuasai',
                  style: const TextStyle(
                    color: MadaniColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                children: [
                  for (final milestone in asList(area['milestones']))
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        textOf(milestone, 'name'),
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        textOf(
                          milestone,
                          'observationNotes',
                          'Belum ada catatan',
                        ),
                      ),
                      trailing: StatusPill(
                        textOf(milestone, 'studentStatus', 'not_started'),
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _hafalanList(JsonMap data) {
    final surahs = asList(data['surahs']);
    final doas = asList(data['doas']);
    if (surahs.isEmpty && doas.isEmpty) {
      return const EmptyState('Progress hafalan belum tersedia.');
    }
    return Column(
      children: [
        const SectionTitle(title: 'Surah'),
        for (final item in surahs.take(30))
          _CompactItem(
            title: textOf(item, 'nameId', textOf(item, 'nameLatin')),
            subtitle:
                'Ayat ${textOf(item, 'lastAyatReached', '0')}/${textOf(item, 'totalAyat', '-')}',
            pill: textOf(item, 'studentStatus', 'belum'),
            icon: Icons.auto_stories_outlined,
          ),
        const SectionTitle(title: 'Doa harian'),
        for (final item in doas.take(30))
          _CompactItem(
            title: textOf(item, 'name'),
            subtitle: textOf(item, 'meaning'),
            pill: textOf(item, 'studentStatus', 'belum'),
            icon: Icons.volunteer_activism_outlined,
          ),
      ],
    );
  }

  Widget _absenceList(List<JsonMap> rows) {
    return Column(
      children: [
        const SectionTitle(title: 'Riwayat izin/sakit'),
        if (rows.isEmpty)
          const EmptyState('Belum ada izin/sakit dari akun ini.')
        else
          for (final item in rows)
            _CompactItem(
              title: '${dateText(item['date'])} - ${textOf(item, 'type')}',
              subtitle: textOf(item, 'reason'),
              pill: textOf(item, 'status'),
              icon: Icons.assignment_late_outlined,
            ),
      ],
    );
  }

  Future<void> _showAbsenceSheet() async {
    final child = widget.child;
    if (child == null) return;
    final reason = TextEditingController();
    var date = DateTime.now();
    var type = 'izin';
    PlatformFile? document;
    var loading = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) {
          Future<void> submit() async {
            if (reason.text.trim().isEmpty) return;
            setSheetState(() => loading = true);
            try {
              await widget.api.multipart(
                '/absence-requests',
                fields: {
                  'studentId': '${child['id']}',
                  'date': date.toIso8601String().substring(0, 10),
                  'type': type,
                  'reason': reason.text.trim(),
                },
                file: document,
                fileField: 'document',
              );
              if (mounted && context.mounted) {
                Navigator.pop(context);
                _reload();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Permohonan izin terkirim.')),
                );
              }
            } catch (error) {
              if (mounted && context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('$error')));
              }
            } finally {
              setSheetState(() => loading = false);
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Kirim izin/sakit',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  items: const [
                    DropdownMenuItem(value: 'izin', child: Text('Izin')),
                    DropdownMenuItem(value: 'sakit', child: Text('Sakit')),
                  ],
                  onChanged: (value) =>
                      setSheetState(() => type = value ?? 'izin'),
                  decoration: const InputDecoration(labelText: 'Jenis'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime.now().subtract(
                        const Duration(days: 365),
                      ),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setSheetState(() => date = picked);
                  },
                  icon: const Icon(Icons.calendar_month, size: 18),
                  label: Text(dateText(date.toIso8601String())),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: reason,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Alasan'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    final result = await FilePicker.platform.pickFiles(
                      type: FileType.custom,
                      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
                    );
                    if (result != null) {
                      setSheetState(() => document = result.files.single);
                    }
                  },
                  icon: const Icon(Icons.attach_file, size: 18),
                  label: Text(document?.name ?? 'Lampirkan dokumen'),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: loading ? null : submit,
                  icon: loading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send, size: 18),
                  label: const Text('Kirim'),
                ),
              ],
            ),
          );
        },
      ),
    );
    reason.dispose();
  }
}

class FeesTab extends StatefulWidget {
  const FeesTab({super.key, required this.api, required this.child});

  final ApiClient api;
  final JsonMap? child;

  @override
  State<FeesTab> createState() => _FeesTabState();
}

class _FeesTabState extends State<FeesTab> {
  late Future<JsonMap> _future = _load();

  @override
  void didUpdateWidget(covariant FeesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.child?['id'] != widget.child?['id']) _future = _load();
  }

  Future<JsonMap> _load() async {
    final child = widget.child;
    if (child == null) return {};
    return asMap(
      await widget.api.get('/mobile/parent/children/${child['id']}/fees'),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.child == null) return const _NoChild();
    return FutureBuilder<JsonMap>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const LoadingBox();
        }
        if (snapshot.hasError) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              ErrorBox(
                '${snapshot.error}',
                onRetry: () => setState(() => _future = _load()),
              ),
            ],
          );
        }

        final summary = asMap(snapshot.data?['summary']);
        final fees = asList(snapshot.data?['fees']);
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  MiniStat(
                    label: 'Tagihan',
                    value: money(summary['totalBilled']),
                    icon: Icons.receipt_long,
                  ),
                  const SizedBox(width: 8),
                  MiniStat(
                    label: 'Terbayar',
                    value: money(summary['paidAmount']),
                    icon: Icons.check_circle_outline,
                    color: MadaniColors.success,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  MiniStat(
                    label: 'Sisa',
                    value: money(summary['outstanding']),
                    icon: Icons.warning_amber_outlined,
                    color: const Color(0xFFD97706),
                  ),
                  const SizedBox(width: 8),
                  MiniStat(
                    label: 'Pending',
                    value: '${summary['pendingCount'] ?? 0}',
                    icon: Icons.schedule,
                    color: MadaniColors.danger,
                  ),
                ],
              ),
              const SectionTitle(title: 'Daftar tagihan'),
              if (fees.isEmpty)
                const EmptyState('Belum ada tagihan.')
              else
                for (final fee in fees)
                  _FeeCard(fee: fee, onUpload: () => _showPaymentSheet(fee)),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showPaymentSheet(JsonMap fee) async {
    final amount = TextEditingController(
      text:
          '${(num.tryParse('${fee['totalBilled'] ?? 0}') ?? 0) - (num.tryParse('${fee['paidAmount'] ?? 0}') ?? 0)}',
    );
    final notes = TextEditingController();
    PlatformFile? proof;
    var loading = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) {
          Future<void> submit() async {
            final parsed = int.tryParse(
              amount.text.replaceAll(RegExp(r'[^0-9]'), ''),
            );
            if (parsed == null || parsed <= 0) return;
            setSheetState(() => loading = true);
            try {
              final bank = asMap(fee['bankAccount']);
              await widget.api.multipart(
                '/fees/${fee['id']}/payments',
                fields: {
                  'receivedAmount': '$parsed',
                  if (bank['id'] != null) 'bankAccountId': '${bank['id']}',
                  if (notes.text.trim().isNotEmpty) 'notes': notes.text.trim(),
                },
                file: proof,
                fileField: 'proof',
              );
              if (mounted && context.mounted) {
                Navigator.pop(context);
                setState(() => _future = _load());
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Pembayaran dikirim untuk konfirmasi.'),
                  ),
                );
              }
            } catch (error) {
              if (mounted && context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('$error')));
              }
            } finally {
              setSheetState(() => loading = false);
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 16,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Upload bukti bayar',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amount,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Nominal bayar'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: notes,
                  decoration: const InputDecoration(labelText: 'Catatan'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    final result = await FilePicker.platform.pickFiles(
                      type: FileType.custom,
                      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
                    );
                    if (result != null) {
                      setSheetState(() => proof = result.files.single);
                    }
                  },
                  icon: const Icon(Icons.attach_file, size: 18),
                  label: Text(proof?.name ?? 'Pilih bukti bayar'),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: loading ? null : submit,
                  icon: const Icon(Icons.send, size: 18),
                  label: const Text('Kirim'),
                ),
              ],
            ),
          );
        },
      ),
    );
    amount.dispose();
    notes.dispose();
  }
}

class InfoTab extends StatefulWidget {
  const InfoTab({super.key, required this.api});

  final ApiClient api;

  @override
  State<InfoTab> createState() => _InfoTabState();
}

class _InfoTabState extends State<InfoTab> {
  final _tabs = const ['Pengumuman', 'Agenda', 'Galeri', 'Artikel', 'Notif'];
  var _selected = 0;
  late Future<List<JsonMap>> _future = _load();

  Future<List<JsonMap>> _load() async {
    final path = switch (_selected) {
      0 => '/mobile/parent/announcements',
      1 => '/mobile/parent/agendas',
      2 => '/mobile/parent/gallery',
      3 => '/mobile/parent/articles',
      _ => '/mobile/parent/notifications',
    };
    return asList(await widget.api.get(path, query: {'limit': 80}));
  }

  void _reload() => setState(() => _future = _load());

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 48,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            scrollDirection: Axis.horizontal,
            itemCount: _tabs.length,
            separatorBuilder: (_, index) => const SizedBox(width: 6),
            itemBuilder: (context, index) {
              final active = index == _selected;
              return ChoiceChip(
                selected: active,
                label: Text(_tabs[index]),
                onSelected: (_) {
                  setState(() {
                    _selected = index;
                    _future = _load();
                  });
                },
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: active ? MadaniColors.navy : MadaniColors.muted,
                ),
                selectedColor: MadaniColors.gold.withValues(alpha: 0.32),
                backgroundColor: Colors.white,
              );
            },
          ),
        ),
        Expanded(
          child: FutureBuilder<List<JsonMap>>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const LoadingBox();
              }
              if (snapshot.hasError) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [ErrorBox('${snapshot.error}', onRetry: _reload)],
                );
              }
              final rows = snapshot.data ?? [];
              return RefreshIndicator(
                onRefresh: () async => _reload(),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                  children: [
                    SectionTitle(title: _tabs[_selected]),
                    if (rows.isEmpty)
                      const EmptyState('Data belum tersedia.')
                    else
                      for (final item in rows) _infoItem(item),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _infoItem(JsonMap item) {
    if (_selected == 2) {
      final photos =
          (item['photoUrls'] as List?)?.map((value) => '$value').toList() ?? [];
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: MadaniCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                textOf(item, 'eventName'),
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                '${dateText(item['eventDate'])} - ${textOf(asMap(item['class']), 'name', 'Kelas')}',
                style: const TextStyle(
                  color: MadaniColors.muted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (photos.isNotEmpty) ...[
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    photos.first,
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 100,
                      color: MadaniColors.bg,
                      child: const Icon(Icons.broken_image_outlined),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return _CompactItem(
      title: textOf(
        item,
        _selected == 4 ? 'title' : 'title',
        textOf(item, 'name'),
      ),
      subtitle: switch (_selected) {
        1 =>
          '${dateText(item['startDate'])} - ${textOf(item, 'location', 'Sekolah')}',
        3 => textOf(item, 'content'),
        4 => textOf(item, 'body'),
        _ => textOf(item, 'content'),
      },
      pill: switch (_selected) {
        0 => item['isUrgent'] == true ? 'urgent' : 'info',
        1 => textOf(item, 'type'),
        4 => item['readAt'] == null ? 'baru' : 'dibaca',
        _ => textOf(item, 'category', 'artikel'),
      },
      icon: switch (_selected) {
        1 => Icons.event_outlined,
        3 => Icons.article_outlined,
        4 => Icons.notifications_outlined,
        _ => Icons.campaign_outlined,
      },
      onTap: _selected == 4 && item['readAt'] == null
          ? () async {
              await widget.api.put('/notifications/${item['id']}/read', {});
              _reload();
            }
          : null,
    );
  }
}

class AiTab extends StatefulWidget {
  const AiTab({super.key, required this.api, required this.child});

  final ApiClient api;
  final JsonMap? child;

  @override
  State<AiTab> createState() => _AiTabState();
}

class _AiTabState extends State<AiTab> {
  final _message = TextEditingController();
  late Future<JsonMap> _future = _load();
  var _sending = false;

  @override
  void didUpdateWidget(covariant AiTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.child?['id'] != widget.child?['id']) _future = _load();
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<JsonMap> _load() async {
    final child = widget.child;
    if (child == null) return {};
    return asMap(
      await widget.api.get(
        '/ai/chat/my-history',
        query: {'studentId': child['id']},
      ),
    );
  }

  Future<void> _send() async {
    final child = widget.child;
    final message = _message.text.trim();
    if (child == null || message.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.api.post('/ai/chat', {
        'studentId': child['id'],
        'message': message,
      });
      _message.clear();
      setState(() => _future = _load());
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.child == null) return const _NoChild();
    return Column(
      children: [
        Expanded(
          child: FutureBuilder<JsonMap>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const LoadingBox();
              }
              if (snapshot.hasError) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    ErrorBox(
                      '${snapshot.error}',
                      onRetry: () => setState(() => _future = _load()),
                    ),
                  ],
                );
              }

              final data = snapshot.data ?? {};
              final messages = asList(data['messages']);
              final quota = asMap(data['quota']);
              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                children: [
                  MadaniCard(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.auto_awesome,
                          color: MadaniColors.gold,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Sisa ${quota['remainingRequests'] ?? '-'} dari ${quota['dailyRequestLimit'] ?? '-'} request hari ini',
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SectionTitle(title: 'AI Anak'),
                  if (messages.isEmpty)
                    const EmptyState(
                      'Belum ada chat. Tanya berdasarkan data anak yang tersimpan.',
                    )
                  else
                    for (final item in messages)
                      Align(
                        alignment: item['role'] == 'user'
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          constraints: const BoxConstraints(maxWidth: 320),
                          decoration: BoxDecoration(
                            color: item['role'] == 'user'
                                ? MadaniColors.navy
                                : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0x140A1F5C)),
                          ),
                          child: Text(
                            textOf(item, 'message'),
                            style: TextStyle(
                              color: item['role'] == 'user'
                                  ? Colors.white
                                  : MadaniColors.ink,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                ],
              );
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _message,
                    minLines: 1,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      hintText: 'Tanya perkembangan anak...',
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _sending ? null : _send,
                  icon: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _HeroSummary extends StatelessWidget {
  const _HeroSummary({required this.children});

  final List<JsonMap> children;

  @override
  Widget build(BuildContext context) {
    final first = children.firstOrNull;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        gradient: const LinearGradient(
          colors: [MadaniColors.navyDeep, MadaniColors.blue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Image.asset('assets/logo-madani-montessori.png'),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  first == null
                      ? 'Portal Orang Tua'
                      : textOf(first, 'nickname', textOf(first, 'fullName')),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  first == null
                      ? 'Data anak belum terhubung'
                      : '${textOf(first, 'programLabel')} - ${textOf(asList(first['classes']).firstOrNull ?? {}, 'name', 'Kelas')}',
                  style: const TextStyle(
                    color: Color(0xFFE5EDFF),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeeCard extends StatelessWidget {
  const _FeeCard({required this.fee, required this.onUpload});

  final JsonMap fee;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    final feeType = asMap(fee['feeType']);
    final bank = asMap(fee['bankAccount']);
    final outstanding =
        (num.tryParse('${fee['totalBilled'] ?? 0}') ?? 0) -
        (num.tryParse('${fee['paidAmount'] ?? 0}') ?? 0);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: MadaniCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    textOf(feeType, 'name', 'Tagihan'),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                StatusPill(textOf(fee, 'status')),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${money(fee['totalBilled'])} - sisa ${money(outstanding)}',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: MadaniColors.navy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Jatuh tempo ${dateText(fee['dueDate'])} - ${textOf(bank, 'bankName', 'Rekening belum dipilih')}',
              style: const TextStyle(
                color: MadaniColors.muted,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (textOf(bank, 'accountNumber', '').isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                '${textOf(bank, 'accountNumber')} a.n. ${textOf(bank, 'accountHolder')}',
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton.icon(
                onPressed: outstanding <= 0 ? null : onUpload,
                icon: const Icon(Icons.upload_file, size: 18),
                label: const Text('Upload bukti'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompactItem extends StatelessWidget {
  const _CompactItem({
    required this.title,
    required this.subtitle,
    required this.pill,
    required this.icon,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final String pill;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ListTileCard(
        onTap: onTap,
        title: title,
        subtitle: subtitle,
        leading: Icon(icon, color: MadaniColors.blue, size: 22),
        trailing: StatusPill(pill),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: const TextStyle(
                color: MadaniColors.muted,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AvatarImage extends StatelessWidget {
  const _AvatarImage({required this.url, required this.size});

  final String url;
  final double size;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: MadaniColors.gold.withValues(alpha: 0.22),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.child_care, color: MadaniColors.navy),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        url,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => Container(
          width: size,
          height: size,
          color: MadaniColors.gold.withValues(alpha: 0.22),
          child: const Icon(Icons.child_care, color: MadaniColors.navy),
        ),
      ),
    );
  }
}

class _NoChild extends StatelessWidget {
  const _NoChild();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: EmptyState('Akun orang tua belum terhubung ke data anak.'),
      ),
    );
  }
}

Future<void> _openUrl(String url) async {
  if (url.isEmpty) return;
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}
