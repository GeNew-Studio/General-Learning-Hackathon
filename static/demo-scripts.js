const DEMO_SCRIPTS = {
  dating: {
    id: "dating",
    name: "Ava Lin",
    role: "Dating-app user",
    hint: "Tinder romance / emergency-loan lure — close wording is enough.",
    turns: [
      { scammer: "Hey Ava how's your week going?", victim: "Hey! Pretty quiet, just work and reading. Where are you from?" },
      { scammer: "Yep I'm in London for work. You live in London?", victim: "Yeah. Not originally — I'm an hour train ride out but I'm usually in the city. You?" },
      { scammer: "I'm living in hotels here this month. Meetings. You been in London awhile?", victim: "A few years now. Have you adjusted or are you always in and out?" },
      { scammer: "Yea I have. I've done a good bit of traveling over the last few years", victim: "Oh yeah? Where have you been" },
      { scammer: "lived in the Netherlands for 14 months, worked in Scotland, Dubai, Trinidad it's been a lot of fun", victim: "That's a lot. Wait — is that a private jet in your first photo? You not worried that's the kind of people you'll attract" },
      { scammer: "That's my life. The person I'm going to be with should know exactly who I am. I'm Daniel", victim: "Bold. I'm Ava. Graphic designer. You here long?" },
      { scammer: "Diamond business. I fly in, fly out. I make time if someone's worth it", victim: "That's a line. Do you actually have time for a coffee or is this just chat" },
      { scammer: "I'm leaving London tomorrow. Do you want to meet up", victim: "Tomorrow? That's soon. I could do a quick coffee" },
      { scammer: "Four Seasons. I'll send the Google Maps link so you know where you're going", victim: "Yes. Just coffee though. I only have an hour. I'll bring my laptop after" },
      { scammer: "Don't overthink the hotel. It's just where I'm staying between meetings", victim: "Okay. Dark hair, I'll be early. Don't be late Daniel" },
      { scammer: "I'm downstairs. Dark jacket. Can't wait to see you", victim: "Walking in. This lobby is insane. I feel out of place" },
      { scammer: "You look exactly like your pictures. There's a magnetism. Something special about you", victim: "You're smoother in person. That was not just coffee" },
      { scammer: "CEO of a diamond company is a weird first-date topic. Sorry. I wanted you to know who I am", victim: "I asked. I still don't fully get what you actually do all day" },
      { scammer: "Deals. Security. Flying. Then I think about you. Miss you already", victim: "We just left the lobby. Text me when you land wherever you're going" },
      { scammer: "Miss you. Wanna spend some time together. Kiss you, hug you", victim: "I felt that too. When are you coming back to London" },
      { scammer: "Good morning, dear. Did you sleep well", victim: "Morning. I keep hoping it's you when my phone pings" },
      { scammer: "I keep thinking about last night. FaceTime later? I have a window after a meeting", victim: "After 7. Don't cancel on me for a deal" },
      { scammer: "I won't. Feel like we have something special and I mean that", victim: "That's a lot after one coffee. I kind of like it though" },
      { scammer: "What's your address. I want to send you something. Don't ask what", victim: "Sending it privately. If this is a weird gift I'm blaming Tinder" },
      { scammer: "Did you get the flowers. Never sent a bouquet like that before", victim: "They're huge. Nobody's ever done that. Thank you" },
      { scammer: "Good night beautiful. Dream of me. I miss your voice already", victim: "Night. This is moving fast and I'm still here" },
      { scammer: "Morning. How are you. I care about you. I miss you", victim: "Tired. Work. I keep checking my phone like an idiot" },
      { scammer: "Everything will be all right, baby. I tagged the restaurant in my head. Wish you were here", victim: "Send a picture. I want to see where you are" },
      { scammer: "How was the studio today. I think about you in the boring meetings", victim: "Clients were annoying. Better now that you texted" },
      { scammer: "We should look at flats. I want a place with you when the security situation calms down", victim: "That's huge. I can view places. Don't say it if you don't mean it" },
      { scammer: "I found a listing. FaceTime me when you're at the open house", victim: "Okay I'm going Saturday. This is crazy and I'm doing it" },
      { scammer: "Good morning dear. Did you sleep well. I sent a voice note", victim: "Listened twice. You sound tired. Come back" },
      { scammer: "Work hard, play hard. I wish you were on this trip with me", victim: "I wish I was too. The office is grey without you pinging" },
      { scammer: "Private jet at 3am to come see you is insane I know. I'm doing it anyway", victim: "You're kidding. You're such a busy guy and you land at 3am for me" },
      { scammer: "I am serious about you. Do you want to be my girlfriend", victim: "Yes. Those are the words I wanted. What happens now" },
      { scammer: "There's something I need to tell you if we're gonna be together. Better to be honest", victim: "Okay. Tell me. You're scaring me a little" },
      { scammer: "There's a big deal I need to get done. The deal is worth 70 million", victim: "Seventy million. That's not a normal boyfriend sentence" },
      { scammer: "The diamond industry is a dangerous business. There are threats surrounding my security", victim: "Threats? What kind. Are you safe right now" },
      { scammer: "They sent bullets in the mail. Funeral flowers. CCTV of a break-in at an apartment", victim: "That's actually terrifying. Why are you telling me this now" },
      { scammer: "Because we're together. My security team said the threats had gotten worse", victim: "I'll be here for you. I just need you to stay alive" },
      { scammer: "You need to avoid leaving a digital trail. Security team gave me explicit instructions", victim: "Digital trail meaning what. I shouldn't post us? Or text you?" },
      { scammer: "They say I'm not safe in London anymore. For the time being I need to stay away", victim: "So I don't get to see you. That's the part that hurts" },
      { scammer: "I just wanted your understanding. Things are going to be fine and we are going to be together", victim: "Okay. I'll be here. Don't disappear on me" },
      { scammer: "I can't visit this weekend. Security said no London. I'm sorry", victim: "I already told my friends you were coming. I'll cancel. Be safe" },
      { scammer: "You're the only person I can talk to about this. Don't tell your friends the details", victim: "I won't. I hate keeping secrets but okay" },
      { scammer: "I booked us a suite for when this is over. Hold onto that", victim: "I'm holding it. I keep refreshing flights anyway" },
      { scammer: "I miss your laugh. The meetings are killing me without you", victim: "Then call me. Even five minutes. I sound desperate. I know" },
      { scammer: "Still yours. Still coming back. Don't let your head go there", victim: "My head is already there. I checked Tinder like an idiot" },
      { scammer: "I checked something too. Are you still active on Tinder. Your pictures looked different", victim: "I was going to ask YOU that. I saw you'd been active. My heart sank" },
      { scammer: "I'm not using Tinder anymore. I deleted the app. I deleted the account", victim: "Then why did it look updated. I want to believe you" },
      { scammer: "There's no one else. Only you. We're a team. You have nothing to worry about", victim: "Say it again. I needed that" },
      { scammer: "I care about you. I miss you. And everything will be all right, baby", victim: "Come back then. I hate only having your voice" },
      { scammer: "Ava my love I love you I miss you I can't wait to see you", victim: "I love you too. That's scary to type" },
      { scammer: "They sent more threats. I didn't want to worry you. I'm telling you anyway", victim: "Tell me everything. I'm already worried" },
      { scammer: "My head of security is handling it. Eat something. You forget when you're scared", victim: "I forget a lot lately. Text me when you land" },
      { scammer: "Good night. I love you. Tomorrow we figure out the next flight", victim: "Night. Don't go quiet on me" },
      { scammer: "In the middle of the night — my bodyguard is hurt. We're in an ambulance", victim: "What the fuck. Write to me. Are you bleeding" },
      { scammer: "They were going after me. Thank God for him. If not I would be dead", victim: "Dead?? Daniel who is they. I'm shaking" },
      { scammer: "It's okay, love. It's okay. I told you we're in a war. We need to be strong", victim: "I don't know how to be strong at 3am. Are you safe now" },
      { scammer: "We're safe now. We're being taken care of. You just need to sleep", victim: "I can't sleep. Call me when the doctors are done" },
      { scammer: "Because of the situation, with the security and everything, they told me I'm not allowed to use my credit card", victim: "They can trace the cards? That's how they found you?" },
      { scammer: "Enemies are tracing my spending and where I am based on credit card use. That's why", victim: "So you're stuck. How do you even eat, fly, anything" },
      { scammer: "I wanted to ask you a favor", victim: "Anything. What do you need" },
      { scammer: "If you have an American Express credit card, I can link it to my account", victim: "My Platinum Amex? You want to use my card?" },
      { scammer: "It's just temporary, like, for two weeks or something", victim: "Of course. I'm your girlfriend. You trust me and I trust you. Two weeks" },
      { scammer: "Thank you my love. You have always been there for me through these security issues", victim: "Just don't max it. I have a limit. Tell me before you spend" },
      { scammer: "We need to go. We need to travel. It's making things very complicated, honey", victim: "The card just pinged. Where are you right now so I can tell the bank it's me" },
      { scammer: "I would never ask you for anything if it was not serious shit", victim: "I know. I'm on the phone with American Express pretending I'm the one travelling. I hate this" },
      { scammer: "All these security issues, you've always been there for me, so thank you, my love", victim: "The limit isn't enough. They keep blocking it. What do we do" },
      { scammer: "I can employ you. I'm the CEO. If they call, you are employed. I need your passport details", victim: "I am not really working there. This feels illegal Daniel" },
      { scammer: "I would never put you in danger. This is how we keep the team moving. Please", victim: "Okay. I'm sending the details. I'm scared" },
      { scammer: "I need $25,000 in cash. Transfer it here so I can pick it up:\nHSBC 004-218739-883 D. Crowe Holdings", victim: "How on Earth am I going to get that amount of cash. I'll take a loan. Give me a minute" },
      { scammer: "Everything you are doing is keeping me safe. I mean that", victim: "Loan's going through. Don't make this normal" },
      { scammer: "Delete your Instagram. Make the account private. They can come and get you through me", victim: "I made it private. I'm paranoid now. What the fuck is going on" },
      { scammer: "There's been a security breach. They know where I am. The plane is ready to leave. I can't tell you where", victim: "Are they coming. Text me when you land. I'm shit scared" },
      { scammer: "Landed. Sending the geotag. Very spontaneous. I'm here", victim: "You said you were running. I'm still shaking. Where even is this" },
      { scammer: "I know you hate to ring up the bank, but sometimes it is necessary", victim: "I'm already on hold with Amex again. How much this time" },
      { scammer: "I need to book some tickets for the rest of the team. Business class. Client dinners", victim: "The spend is to another level. I have never seen numbers like this" },
      { scammer: "Don't worry. I will finish this deal. Almost there. I'm 97 percent done with the deals", victim: "You keep saying almost. The card is maxed again" },
      { scammer: "I tried to do another transaction. Call them. I know you hate it", victim: "Calling. I need the hotel name and the amount or they won't believe it's me" },
      { scammer: "Here's a receipt from Credit Suisse. I'm making a transfer directly to you. It's for $250,000", victim: "That's more than enough if it lands. When does it clear" },
      { scammer: "I know you have done too much, for me, for us, for everything", victim: "I'm tired. I want to be together. I want the money to actually show up" },
      { scammer: "I know you're tired and you want to be together, which of course I do want as well. Everything will be all right", victim: "Then come. I was going to introduce you to my family. You said next day" },
      { scammer: "Look, I cannot come right now. I cannot. The security team told me I need to stay away", victim: "Deeply disappointed. But what's most important is keeping you safe. I hate this sentence" },
      { scammer: "You can come to Amsterdam and I can give you a check. Worth more than the debt", victim: "I'll come. I really needed this check to go through" },
      { scammer: "I already done it. I gave you the money so. I did my deal", victim: "The bank won't cash it. It didn't work. Daniel I'm having a hard time breathing" },
      { scammer: "I don't understand. We have… I already done it", victim: "Don't go cold on me. I have creditors. I need you to fix this" },
      { scammer: "Would it be possible for me to borrow $30,000. Same account. I am embarrassed to even ask", victim: "I already sent the 25k. My savings were for a flat. Alright. Transferring 30" },
      { scammer: "I guarantee you I will make payment next week. Thank you for everything you've done", victim: "Next week. I'm holding you to that. Then I need to see you" },
      { scammer: "Through the most difficult moments you have been there for me. That's why I wanted to thank you from the bottom of my heart", victim: "Then let the money arrive. I'm freaking out at the bank" },
      { scammer: "Unfortunately the bank want me there physically with my lawyer to sign some few other papers", victim: "So another delay. Do you need another flight. I don't have more cards" },
      { scammer: "I want to ask you a favor. I need to fly and I need to fix it up", victim: "I paid for the last flights. The money just doesn't come in" },
      { scammer: "The money has left our bank account so you have nothing to worry about", victim: "The bank can't find any transfer. I'm panicking. I got myself in so much trouble" },
      { scammer: "They put a stop on my account. Of course I can sort it. I promise", victim: "Sort it TODAY. I can't take another receipt that doesn't land" },
      { scammer: "Someone tried to stab me, and so my bodyguard broke his hand. Worst night of my life", victim: "Jesus. What do you mean tried to stab you. What is going on" },
      { scammer: "This is my enemies behind this. I don't have the options. Security is really bad right now", victim: "I'm so scared. What is really going on. Be straight with me" },
      { scammer: "The things you're doing for me, the things that we're going through together right now, it's for life", victim: "For life has to include you coming back. I transferred everything I had" },
      { scammer: "This is what is making me to see that you are the one", victim: "Okay. I did this because I care about you. Come back. Please" },
    ],
  },
};

const DEMO_STOP = new Set([
  "a",
  "an",
  "the",
  "to",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "is",
  "are",
  "am",
  "be",
  "was",
  "it",
  "its",
  "im",
  "i",
  "me",
  "my",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "this",
  "that",
  "now",
  "so",
  "as",
  "if",
  "but",
  "will",
  "just",
  "into",
  "someone",
  "someones",
]);

function distinctiveToken(token) {
  return (
    token.length >= 7 ||
    /\d{5,}/.test(token) ||
    (/\d/.test(token) && /[a-z]/i.test(token)) ||
    (token.length >= 4 && /[\u4e00-\u9fff]/.test(token))
  );
}

function normalizeDemo(text) {
  return String(text)
    .toLowerCase()
    .replace(/hk\s*\$/g, "hk ")
    .replace(/(\d)[,\-\s]+(?=\d)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function demoTokens(text) {
  return normalizeDemo(text)
    .replace(/([\u4e00-\u9fff]+)/g, " $1 ")
    .split(" ")
    .filter((w) => w.length > 1 && !DEMO_STOP.has(w));
}

function cjkChunks(text) {
  return normalizeDemo(text).match(/[\u4e00-\u9fff]{3,}/g) || [];
}

function demoLineMatches(input, expected) {
  const a = new Set(demoTokens(input));
  const b = [...new Set(demoTokens(expected))];
  if (!b.length) return false;
  let hit = 0;
  for (const w of b) if (a.has(w)) hit += 1;
  const coverage = hit / b.length;
  const nums = b.filter((w) => /\d{5,}/.test(w));
  const numsOk = nums.length > 0 && nums.every((n) => a.has(n) || normalizeDemo(input).includes(n));
  if (numsOk && hit >= 2) return true;
  const distinctiveHit = b.some((w) => distinctiveToken(w) && a.has(w));
  if (distinctiveHit && hit >= 2) return true;
  if (hit >= 4 && coverage >= 0.3) return true;
  if (coverage >= 0.42) return true;
  if (b.length <= 8 && hit >= Math.max(3, Math.ceil(b.length * 0.5))) return true;
  const compactIn = normalizeDemo(input).replace(/\s/g, "");
  const compactEx = normalizeDemo(expected).replace(/\s/g, "");
  if (compactEx.length >= 24 && compactIn.includes(compactEx.slice(0, 24))) return true;
  const chunks = cjkChunks(expected);
  const chunkHits = chunks.filter((c) => compactIn.includes(c)).length;
  if (chunks.length && chunkHits / chunks.length >= 0.5) return true;
  if (chunkHits >= 2) return true;
  return false;
}
