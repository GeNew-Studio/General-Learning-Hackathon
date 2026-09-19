import 'package:flutter/material.dart';

import 'chat_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TinderApp());
}

class TinderApp extends StatelessWidget {
  const TinderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ava',
      debugShowCheckedModeBanner: false,
      locale: const Locale('en'),
      supportedLocales: const [Locale('en')],
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFE3C72)),
        fontFamily: 'Segoe UI',
        useMaterial3: true,
      ),
      home: const TinderChatPage(),
    );
  }
}
