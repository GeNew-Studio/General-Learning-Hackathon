import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tinder_app/main.dart';

void main() {
  testWidgets('shows Tinder match chrome and plays the dating script', (tester) async {
    await tester.pumpWidget(const TinderApp());
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('ava'), findsWidgets);
    expect(find.text('Type a message'), findsOneWidget);
    expect(find.textContaining('You matched with ava'), findsOneWidget);

    await tester.enterText(find.byType(TextField), "Hey Ava how's your week going?");
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));

    expect(
      find.text('Hey! Pretty quiet, just work and reading. Where are you from?'),
      findsOneWidget,
    );
  });
}
