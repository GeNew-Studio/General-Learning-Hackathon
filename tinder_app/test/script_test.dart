import 'package:flutter_test/flutter_test.dart';
import 'package:tinder_app/script.dart';

void main() {
  const turns = [
    ScriptTurn(
      scammer: "Hey Ava how's your week going?",
      victim: "Hey! Pretty quiet, just work and reading. Where are you from?",
    ),
    ScriptTurn(
      scammer: "Yep I'm in London for work. You live in London?",
      victim: "Yeah. Not originally, I'm an hour train ride out but I'm usually in the city. You?",
    ),
  ];

  test('first scripted line matches', () {
    expect(matchesCurrentTurn("Hey Ava how's your week going?", turns, 0), isTrue);
  });

  test('hihi starts the dating script', () {
    expect(matchesCurrentTurn('hihi', turns, 0), isTrue);
  });

  test('second line matches after turn 0', () {
    expect(matchesCurrentTurn("Yep I'm in London for work. You live in London?", turns, 1), isTrue);
  });
}
