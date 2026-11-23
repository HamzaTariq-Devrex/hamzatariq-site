# Brief: website chatbot with whatsapp handoff

- Post: /blog/website-chatbot-with-whatsapp-handoff
- Keyword: website chatbot with whatsapp handoff
- Cluster: ai-chatbots (supporting, pillar: /blog/ai-chatbot-for-small-business)
- Intent: learn · Funnel: consideration
- Secondary: chatbot to whatsapp, live chat to whatsapp, whatsapp lead capture
- Researched: 2026-11-23 (web search, US results, for "website chatbot with whatsapp handoff to human" and "when should a chatbot hand over to a human agent best practices"; five top pages read; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, their FAQ sections and related searches)

## Search intent

Learn. A small business owner who already gets questions on WhatsApp and wants a chatbot on their website that answers the simple ones and passes real customers to their WhatsApp. They want to know whether it's possible, when the bot should step aside, and what the customer sees.

## Top results

1. [Elfsight: AI chatbot human handoff](https://elfsight.com/ai-chatbot-widget/human-handoff/): a widget vendor's feature page; handoff triggers (explicit request, can't answer, keywords, inactivity) and a contact card with WhatsApp, phone and email buttons. The conversation itself isn't passed into WhatsApp.
2. [DEV: The WhatsApp handoff problem](https://dev.to/animesh_gupta_705a19fc6f8/the-whatsapp-handoff-problem-passing-a-bot-conversation-to-a-human-without-losing-context-24ja): a vendor's essay on escalation rules and carrying context, for a bot that already lives inside WhatsApp, not on a website.
3. [TechTarget: Best practices for initiating chatbot-to-human handoff](https://www.techtarget.com/enterprise-software/tip/Best-practices-for-initiating-chatbot-to-human-handoff): general handoff scenarios and steps for contact centres (2022, before current AI bots).
4. [BotPenguin: Transfer chat to WhatsApp](https://help.botpenguin.com/bots/website-mobile-app-bot/how-to-use-transfer-chat-to-whatsapp-functionality): product docs for a menu option that moves a website chat to WhatsApp; user-initiated only, no rules.
5. [Social Intents: AI chatbot with human handoff](https://www.socialintents.com/blog/ai-chatbot-with-human-handoff/): escalation triggers, offline mode and setup in their product, with agents answering in Teams or Slack.

## What they miss

- None treats the handoff as lead capture: a short form that saves the visitor's details with the transcript, next to the WhatsApp button.
- None shows exactly what the visitor sees at each kind of handoff (bot doesn't know, visitor ready to buy, AI down, off-topic).
- None explains the simple website-to-WhatsApp route a small business can use without a WhatsApp Business API account: a click-to-chat link with the visitor's questions already written in.
- Only one mentions what happens when the AI itself fails or is slow; none says what an off-topic question should get (no handoff at all).
- All are written to sell a subscription widget; none gives the price of a custom build.

## Questions to answer

- Can a chatbot send customers to WhatsApp?
- When should a bot hand over to a human?
- What does the visitor see at each handoff?
- Chatbot to WhatsApp vs live chat to WhatsApp: what's the difference?
- Should WhatsApp lead capture use a form or the chat itself?
- What should you check before launch? (H2: testing before launch)

## Our angle

The handoff rules I built into the live AI assistant on my site, and what the visitor sees for each: a lead signal that opens a form when someone is ready to start, a fixed "Hamza will answer this personally" reply when the bot doesn't know, saved answers when the AI fails or takes longer than 7 s, a one-line refusal for off-topic questions, and a WhatsApp button that carries the visitor's last questions into the message.

## Unique additions

- A table of handoff moments with the exact reply and buttons the visitor gets, from the live assistant.
- The prefilled WhatsApp message with the visitor's own questions, so nobody has to repeat themselves.
- Why an off-topic question should never trigger a handoff.
- A real price and delivery time for a custom chatbot with WhatsApp handoff.

## Information gain

- Practical asset: the handoff table and a pre-launch checklist.
- Labelled opinion: `<MyTake>` box.

## Sources to link

- [MDN: encodeURIComponent](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) (how the visitor's questions are put into the WhatsApp link safely).
