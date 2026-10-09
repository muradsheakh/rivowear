"use client";

import { useEffect, useState } from "react";
import { api, type FailedMessage } from "../../shared/api/client";
import { useAuth } from "../../shared/context/useAuth";

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const AdminMessages = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<FailedMessage[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = () => {
    if (!token) return;
    api.admin.failedMessages(token).then((response) => setMessages(response.messages)).catch((requestError: Error) => setError(requestError.message));
  };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => setMessages((current) => current?.filter((item) => item.id !== id) ?? null);

  const retry = (message: FailedMessage) => {
    if (!token) return;
    setError("");
    setNote("");
    api.admin.retryMessage(token, message.id)
      .then(() => {
        remove(message.id);
        setNote("Sent back to the queue. If it fails again it will show up here again after a few minutes.");
      })
      .catch((requestError: Error) => setError(requestError.message));
  };

  const discard = (message: FailedMessage) => {
    if (!token || !window.confirm("Remove this message? It will not be sent.")) return;
    api.admin.discardMessage(token, message.id).then(() => remove(message.id)).catch((requestError: Error) => setError(requestError.message));
  };

  if (!messages) return <p className="text-sm text-gray-500">{error || "Loading failed messages..."}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        SMS and emails that failed every automatic try (usually a wrong number or the provider being down). A wrong number will fail again, so fix the
        order&apos;s phone first or just remove the message. Old messages are cleared automatically after 60 days.
      </p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {note && <p className="text-sm text-green-700">{note}</p>}
      {messages.length === 0 && <p className="text-sm text-gray-500">No failed messages. 🎉</p>}
      {messages.map((message) => (
        <article key={message.id} className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">{message.channel}</span>
              <b>{message.recipient}</b>
              <span className="text-xs text-gray-400">{new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => retry(message)} className="underline underline-offset-4">Retry</button>
              <button type="button" onClick={() => discard(message)} className="text-red-700 underline underline-offset-4">Remove</button>
            </div>
          </div>
          <p className="mt-2 text-gray-700">{message.subject ? `${message.subject}: ` : ""}{message.channel === "email" ? stripHtml(message.body).slice(0, 200) : message.body}</p>
          <p className="mt-2 text-xs text-red-700">Failed after {message.attempts} tries: {message.lastError || "unknown error"}</p>
        </article>
      ))}
    </div>
  );
};

export default AdminMessages;
