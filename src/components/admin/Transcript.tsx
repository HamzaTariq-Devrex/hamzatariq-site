import type { TranscriptMessage } from "@/app/admin/(dashboard)/actions";

// The chat log appends notes like "[offline:pricing-websites]" or "[lead form shown]" to replies.
const TAG_LABELS: Record<string, string> = { "off-topic": "Off-topic", "lead form shown": "Lead form shown" };
const tagLabel = (tag: string) =>
  tag.startsWith("offline:") ? (tag === "offline:personal" ? "Answer personally" : `Saved answer: ${tag.slice(8)}`) : (TAG_LABELS[tag] ?? tag);

const splitTags = (content: string) => {
  const lines = content.split("\n");
  const tags: string[] = [];
  while (lines.length && /^\[[^\]]+\]$/.test(lines[lines.length - 1].trim())) tags.unshift(lines.pop()!.trim().slice(1, -1));
  return { text: lines.join("\n").trim(), tags };
};

const Transcript = ({ messages }: { messages: TranscriptMessage[] }) => {
  if (!messages.length) return <p className="adm-muted">No messages were saved for this chat.</p>;
  return (
    <ol className="adm-transcript">
      {messages.map((m, i) => {
        const { text, tags } = m.role === "assistant" ? splitTags(m.content) : { text: m.content, tags: [] };
        return (
          <li key={i} className={`is-${m.role}`}>
            <span className="adm-transcript-who">{m.role === "user" ? "Visitor" : "AI"}</span>
            <p>{text}</p>
            {tags.length > 0 && (
              <span className="adm-tags">
                {tags.map((t) => (
                  <span key={t}>{tagLabel(t)}</span>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Transcript;
