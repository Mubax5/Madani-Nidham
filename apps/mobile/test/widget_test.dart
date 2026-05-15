import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:madani_nidham_parent/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('renders parent login screen', (tester) async {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
    await initializeDateFormatting('id_ID');

    await tester.pumpWidget(const MadaniParentApp());
    await tester.pumpAndSettle();

    expect(find.text('Madani Nidham'), findsWidgets);
    expect(find.text('Portal orang tua/wali murid'), findsOneWidget);
    expect(find.text('Masuk'), findsWidgets);
  });
}
