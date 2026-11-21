# Brief: ai chatbot trained on website content

- Post: /blog/ai-chatbot-trained-on-website-content
- Keyword: ai chatbot trained on website content
- Cluster: ai-chatbots (supporting, pillar: /blog/ai-chatbot-for-small-business)
- Intent: learn · Funnel: consideration
- Secondary: chatbot that answers from your website, rag chatbot, custom gpt for website, chatbot knowledge base
- Researched: 2026-11-21 (web search, US results; the search tool doesn't show Google's "People also ask" box, so the questions below come from the top results' headings, their FAQ sections and related searches such as "how to train a chatbot on your website" and "can I embed a custom GPT on my website")

## Search intent

Learn. A business owner who has seen "a chatbot trained on your website" offered by a tool or a developer and wants to know what that really means: what the bot reads, whether it will invent answers, and what they have to keep doing after launch. They expect a plain definition first, then how it works.

## Top results

1. [Elfsight: How to train an AI chatbot on your own data and website](https://elfsight.com/guides/how-to-train-ai-chatbot/): training rarely changes the model; a knowledge base read with retrieval plus written instructions; test out-of-scope questions; review which pages were read. Vendor guide for its own widget, no prices.
2. [Social Intents: How to Train an AI Chatbot on Your Website Content](https://www.socialintents.com/blog/train-ai-chatbot-on-website-content/): explains retrieval-augmented generation (RAG), sitemap and document import, chunking and embeddings, strict "don't guess" instructions, monthly log review. Vendor pitch, unsourced stats.
3. [Robylon: How to Train an AI Chatbot on Your Own Data](https://www.robylon.ai/blog/train-ai-chatbot-on-your-data): RAG in four steps, fine-tuning rarely needed, weekly review, pinned answers for sensitive topics, warns against no human fallback. Vendor pitch, overstated claims.
4. [OpenAI Community: Embedding a GPT in website](https://community.openai.com/t/embedding-a-gpt-in-website/484098): users asking to put a custom GPT on their site as a chat box; answers say it lives in ChatGPT and point to building on the API instead.

## What they miss

- None says what text the bot really captures from a page: menus, footers, text inside images and PDFs that aren't added, content that only loads with JavaScript.
- None covers what happens when the AI service itself fails or runs out of quota (only "hand off to a human").
- None explains why a bot that "says it doesn't know" still needs a cut-off for weak matches, or how short follow-up questions ("how much?") get answered.
- All are written by chatbot vendors; none gives a real build price or a maintenance list with what the owner, not the tool, has to do.

## Questions to answer

- What is an AI chatbot trained on website content? (definition near the top)
- What text does the chatbot read from my site? (H2)
- How do you train a chatbot on your website? (H2)
- Will the chatbot make up answers? (H2)
- Is a RAG chatbot the same as a custom GPT or fine-tuning? (H2)
- What do I have to maintain after launch? (H2)
- Can it read PDFs and price lists? (FAQ)
- What does it cost? (FAQ)

## Our angle

Walk through the real pipeline of the assistant I built and run (44 pages embedded at launch, re-embedded on every deploy, an offline bank of 30 saved answers), in plain words, with exactly what the owner has to maintain and what the bot can't see.

## Unique additions

- What the bot actually reads from a page: the visible main content only, not the menu, footer or scripts, and nothing it isn't given.
- Two details that decide answer quality: a cut-off for weak matches so a loosely related page doesn't become a confident answer, and short follow-ups searched together with the previous question.
- An owner's maintenance checklist.
- A comparison table: RAG chatbot vs custom GPT vs fine-tuning vs pasting the site into a prompt.

## Information gain

- Practical asset: comparison table, numbered training steps, maintenance checklist.
- Labelled opinion: `<MyTake>`.
- `<FromMyWork>`: how the assistant I built reads its content and what happens when the AI fails (real facts from content/owner/projects/hamzatariq-site.md, AI assistant section).

## Sources to link

- [Gemini API embeddings (Google AI for Developers)](https://ai.google.dev/gemini-api/docs/embeddings)
- [pgvector in Supabase (Supabase docs)](https://supabase.com/docs/guides/database/extensions/pgvector)
